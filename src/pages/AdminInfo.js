import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../firebase";
import { XCircle, LogOut, UserCogIcon, ChartArea, Archive, Package } from "lucide-react";

const AdminInfo = () => {
    const [admins, setAdmins] = useState([]);
    const [repairRequests, setRepairRequests] = useState([]);
    const [topics, setTopics] = useState({}); // Mapping รหัสหัวเรื่อง -> ชื่อหัวเรื่อง
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [adminStats, setAdminStats] = useState({});

    // Mapping ชื่อไฟล์กับ File ID ของ Google Drive
    const profileImageMapping = {
        "ผู้ใช้งาน_Images/IT-a028.รูปโปรไฟล์.111011.jpg": "ไฟล์IDของIT-a028", // เปลี่ยนเป็น File ID จริง
        "ผู้ใช้งาน_Images/IT-e64a.รูปโปรไฟล์.111011.jpg": "ไฟล์IDของIT-e64a", // เปลี่ยนเป็น File ID จริง
        // เพิ่ม mapping สำหรับไฟล์อื่นๆ
    };

    const navigate = useNavigate();

    useEffect(() => {
        // ดึงข้อมูลแอดมินจาก "ผู้ใช้งาน"
        onValue(dbRef(db, "ผู้ใช้งาน"), (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const adminList = Object.values(userData).filter(user => 
                    user.ตำแหน่ง === "นักวิชาการคอมพิวเตอร์" ||
                    user.ตำแหน่ง === "นักวิชาการโสตทัศนศึกษา" ||
                    user.ตำแหน่ง === "ช่างเทคนิค"
                );
                setAdmins(adminList);

                // ตรวจสอบ URL รูปโปรไฟล์
                adminList.forEach(admin => {
                    console.log(`Admin: ${admin.ชื่อ}, Profile Image:`, admin.รูปโปรไฟล์);
                });
            }
        });

        // ดึงข้อมูลคำขอแจ้งซ่อม
        onValue(dbRef(db, "คำขอแจ้งซ่อม"), (snapshot) => {
            if (snapshot.exists()) {
                setRepairRequests(Object.values(snapshot.val()));
            }
        });

        // ดึงข้อมูลหัวเรื่องเพื่อ mapping รหัสหัวเรื่อง -> ชื่อหัวเรื่อง
        onValue(dbRef(db, "หัวเรื่อง"), (snapshot) => {
            if (snapshot.exists()) {
                const topicData = snapshot.val();
                const topicMap = {};
                Object.values(topicData).forEach(topic => {
                    if (topic["รหัสหัวเรื่อง"] && topic["ชื่อหัวเรื่อง"]) {
                        topicMap[topic["รหัสหัวเรื่อง"]] = topic["ชื่อหัวเรื่อง"];
                    }
                });
                setTopics(topicMap);
            }
        });
    }, []);

    // ฟังก์ชันแปลงชื่อไฟล์เป็น URL ของ Google Drive
    const getProfileImageUrl = (fileName) => {
        const fileId = profileImageMapping[fileName];
        if (fileId) {
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
        return null;
    };

    // ฟังก์ชันแปลงรหัสหัวเรื่องเป็นชื่อหัวเรื่อง
    const getTopicName = (topicId) => {
        return topics[topicId] || topicId;
    };

    const openPopup = (admin) => {
        setSelectedAdmin(admin);

        // คำนวณสถิติของแอดมิน
        const repairsHandled = repairRequests.filter(req => req["อีเมลผู้รับเรื่อง"] === admin.อีเมล);

        // สถิติหัวเรื่องที่ซ่อม
        const topicStats = repairsHandled.reduce((acc, request) => {
            const topicId = request["รหัสหัวเรื่อง"] || "ไม่ระบุ";
            acc[topicId] = (acc[topicId] || 0) + 1;
            return acc;
        }, {});

        // สถิติอุปกรณ์ที่ซ่อม
        const equipmentStats = repairsHandled.reduce((acc, request) => {
            const equipment = request["รายการ"] || "ไม่ระบุ";
            acc[equipment] = (acc[equipment] || 0) + 1;
            return acc;
        }, {});

        setAdminStats({
            totalHandled: repairsHandled.length,
            topicStats: topicStats,
            equipmentStats: equipmentStats,
        });
    };

    const closePopup = () => {
        setSelectedAdmin(null);
        setAdminStats({});
    };

    return (
        <div className="flex min-h-screen bg-pageBG">
            {/* Sidebar */}
            <aside className="fixed top-0 left-0 w-64 h-screen text-white p-5 flex flex-col shadow-lg bg-sidebarBG">
                <h2 className="text-xl font-bold mb-6">ระบบจัดการพัสดุ-ครุภัณฑ์</h2>
                <ul className="space-y-4 flex-1">
                    <li>
                        <Link to="/dashboard" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <ChartArea className="w-5 h-5 mr-3" /> สถิติแจ้งซ่อม
                        </Link>
                    </li>
                    <li>
                        <Link to="/equipment" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <Archive className="w-5 h-5 mr-3" /> ครุภัณฑ์
                        </Link>
                    </li>
                    <li>
                        <Link to="/supplies" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <Package className="w-5 h-5 mr-3" /> พัสดุ
                        </Link>
                    </li>
                    <li>
                        <Link to="/registerUser" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <UserCogIcon className="w-5 h-5 mr-3" /> ผู้ใช้งาน
                        </Link>
                    </li>
                    <li>
                        <Link to="/adminInfo" className="flex items-center p-2 rounded-lg bg-sidebarHover hover:bg-sidebarHover w-full text-left">
                            <UserCogIcon className="w-5 h-5 mr-3" /> สถิติของแอดมิน
                        </Link>
                    </li>
                </ul>
                <button onClick={() => localStorage.removeItem("token") || navigate("/login")} className="flex items-center w-full text-left p-2 bg-logoutBT rounded-lg hover:bg-logoutBT-80 mt-auto">
                    <LogOut className="w-5 h-5 mr-3" /> ออกจากระบบ
                </button>
            </aside>

            {/* Main Content */}
            <div className="ml-64 p-6 w-full flex flex-col items-center">
                <h1 className="text-2xl font-bold mb-6 text-center">👨‍💼 ข้อมูลแอดมิน</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {admins.map((admin, index) => (
                        <div
                            key={index}
                            className="p-4 bg-white shadow-lg rounded-lg flex flex-col items-center text-center cursor-pointer hover:bg-gray-200 w-full"
                            onClick={() => openPopup(admin)}
                        >
                            {/* รูปโปรไฟล์ */}
                            <div className="w-32 h-32 rounded-full overflow-hidden mb-4">
                                {admin["รูปโปรไฟล์"] && getProfileImageUrl(admin["รูปโปรไฟล์"]) ? (
                                    <img
                                        src={getProfileImageUrl(admin["รูปโปรไฟล์"])}
                                        alt={`${admin.ชื่อ}'s profile`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = "https://via.placeholder.com/128"; // ถ้าโหลดรูปไม่ได้ ใช้ placeholder
                                            console.error(`Failed to load image for ${admin.ชื่อ}: ${admin["รูปโปรไฟล์"]}`);
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                                        ไม่มีรูปโปรไฟล์
                                    </div>
                                )}
                            </div>

                            {/* ชื่อแอดมิน */}
                            <h2 className="mt-3 text-lg font-semibold">{admin.ชื่อ}</h2>

                            {/* ป้ายแสดงตำแหน่ง */}
                            <span className="mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                {admin.ตำแหน่ง}
                            </span>

                            {/* ข้อมูลเพิ่มเติม (อีเมล) */}
                            <div className="mt-2 text-gray-600">
                                <p className="flex items-center justify-center">
                                    Email: {admin.อีเมล}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pop-up แสดงสถิติ */}
            {selectedAdmin && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">📊 สถิติของ {selectedAdmin.ชื่อ}</h2>
                            <button onClick={closePopup} className="text-red-500">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* จำนวนงานที่รับเรื่อง */}
                        <p className="mb-4">
                            <strong>📋 งานที่รับเรื่องทั้งหมด:</strong> {adminStats.totalHandled} รายการ
                        </p>

                        {/* หัวเรื่องที่ซ่อม */}
                        <h3 className="font-semibold mb-2">📋 หัวเรื่องที่ซ่อม:</h3>
                        {Object.keys(adminStats.topicStats || {}).length > 0 ? (
                            <ul className="list-disc pl-6 mb-4">
                                {Object.keys(adminStats.topicStats).map((topicId, i) => (
                                    <li key={i}>
                                        {getTopicName(topicId)}: {adminStats.topicStats[topicId]} ครั้ง
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 mb-4">ไม่มีข้อมูลหัวเรื่อง</p>
                        )}

                        {/* อุปกรณ์ที่ซ่อม */}
                        <h3 className="font-semibold mb-2">🛠 อุปกรณ์ที่ซ่อม:</h3>
                        {Object.keys(adminStats.equipmentStats || {}).length > 0 ? (
                            <ul className="list-disc pl-6">
                                {Object.keys(adminStats.equipmentStats).map((item, i) => (
                                    <li key={i}>
                                        {item}: {adminStats.equipmentStats[item]} ครั้ง
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">ไม่มีข้อมูลอุปกรณ์</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInfo;