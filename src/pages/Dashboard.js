import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { ChartArea, Archive, LogOut, XCircle, Package, UserCogIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Dashboard = () => {
    const [repairRequests, setRepairRequests] = useState([]);
    const [topics, setTopics] = useState({}); // Mapping รหัสหัวเรื่อง -> ชื่อหัวเรื่อง
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedRepairs, setSelectedRepairs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch repair requests
        onValue(ref(db, "คำขอแจ้งซ่อม"), (snapshot) => {
            if (snapshot.exists()) {
                const data = Object.values(snapshot.val());
                setRepairRequests(data);
            }
        });

        // Fetch topics for mapping รหัสหัวเรื่อง to ชื่อหัวเรื่อง
        onValue(ref(db, "หัวเรื่อง"), (snapshot) => {
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

    // สถิติหัวเรื่องการซ่อม
    const topicStats = repairRequests.reduce((acc, request) => {
        const topicId = request["รหัสหัวเรื่อง"] || "ไม่ระบุ";
        const room = request["ห้อง"] || request["room"] || "ไม่ระบุ"; // รองรับทั้ง "ห้อง" และ "room"
        if (!acc[topicId]) {
            acc[topicId] = { total: 0, rooms: {} };
        }
        acc[topicId].total += 1;
        acc[topicId].rooms[room] = (acc[topicId].rooms[room] || 0) + 1;
        return acc;
    }, {});

    // สถิติห้องที่ซ่อม
    const roomStats = repairRequests.reduce((acc, request) => {
        const room = request["ห้อง"] || request["room"] || "ไม่ระบุ"; // รองรับทั้ง "ห้อง" และ "room"
        const topicId = request["รหัสหัวเรื่อง"] || "ไม่ระบุ";
        const detail = request["รายละเอียดคำขอแจ้งซ่อม"] || "ไม่ระบุ";
        if (!acc[room]) {
            acc[room] = { total: 0, topics: {} };
        }
        acc[room].total += 1;
        acc[room].topics[topicId] = (acc[room].topics[topicId] || 0) + 1;
        acc[room].detail = detail;
        return acc;
    }, {});

    // ฟังก์ชันแปลงรหัสหัวเรื่องเป็นชื่อหัวเรื่อง
    const getTopicName = (topicId) => {
        return topics[topicId] || topicId;
    };

    // ข้อมูลสำหรับกราฟหัวเรื่อง (ใช้ชื่อหัวเรื่อง)
    const topicChartData = Object.keys(topicStats).map(topicId => ({
        name: getTopicName(topicId),
        value: topicStats[topicId].total,
    }));

    // ห้องที่ซ่อมมากที่สุด
    const mostRepairedRoom = Object.keys(roomStats).reduce((maxRoom, room) => {
        return roomStats[room].total > roomStats[maxRoom].total ? room : maxRoom;
    }, Object.keys(roomStats)[0] || "ไม่ระบุ");

    // ฟังก์ชันเปิด Pop-up
    const openPopup = (topicId) => {
        setSelectedTopicId(topicId);
        const repairs = repairRequests.filter(req => req["รหัสหัวเรื่อง"] === topicId);
        setSelectedRepairs(repairs);
    };

    // ฟังก์ชันปิด Pop-up
    const closePopup = () => {
        setSelectedTopicId(null);
        setSelectedRepairs([]);
    };

    const downloadExcel = () => {
        if (!selectedRepairs.length) return;

        const wsData = [
            ["ลำดับ", "ชื่อหัวเรื่อง", "หมายเลขครุภัณฑ์", "รายการ", "ห้อง", "วันที่เวลาแจ้ง", "สถานะการซ่อม"],
            ...selectedRepairs.map((item, index) => [
                index + 1,
                getTopicName(item["รหัสหัวเรื่อง"]),
                item["หมายเลขครุภัณฑ์"],
                item["รายการ"],
                item["ห้อง"] || item["room"], // รองรับทั้ง "ห้อง" และ "room"
                item["วันที่เวลาแจ้ง"],
                item["สถานะการซ่อม"]
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "สถิติการซ่อม");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(dataBlob, `repair_stats_topic_${getTopicName(selectedTopicId)}.xlsx`);
    };

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

    return (
        <div className="flex min-h-screen bg-pageBG">
            {/* Sidebar - คงเดิม */}
            <aside className="fixed top-0 left-0 w-64 h-screen text-white p-5 flex flex-col shadow-lg bg-sidebarBG">
                <h2 className="text-xl font-bold mb-6">ระบบจัดการพัสดุ-ครุภัณฑ์</h2>
                <ul className="space-y-4 flex-1">
                    <li>
                        <Link to="/dashboard" className="flex items-center p-2 rounded-lg bg-sidebarHover hover:bg-sidebarHover w-full text-left">
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
                        <Link to="/adminInfo" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <UserCogIcon className="w-5 h-5 mr-3" /> สถิติของแอดมิน
                        </Link>
                    </li>
                </ul>
                <button onClick={() => localStorage.removeItem("token") || navigate("/login")} className="flex items-center w-full text-left p-2 bg-logoutBT rounded-lg hover:bg-logoutBT-80 mt-auto">
                    <LogOut className="w-5 h-5 mr-3" /> ออกจากระบบ
                </button>
            </aside>

            {/* Main Content */}
            <div className="ml-64 p-6 w-full">
                <h1 className="text-2xl font-bold mb-6 text-center">📊 Dashboard - สถิติการแจ้งซ่อม</h1>

                <div className="p-2 bg-gray-300 rounded-lg text-center mt-6">
                    <strong>ห้องที่ซ่อมมากที่สุด:</strong> {mostRepairedRoom} ({roomStats[mostRepairedRoom]?.total || 0} ครั้ง)
                </div>

                {/* กราฟสถิติหัวเรื่อง */}
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8">
                            {topicChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* แสดงข้อมูลตามหัวเรื่อง */}
                <div className="grid grid-cols-1 gap-6 mt-6">
                    {Object.keys(topicStats).map((topicId, index) => (
                        <div key={index} className="bg-white p-4 shadow-lg rounded-lg w-full">
                            <h2 className="text-lg font-semibold mb-4 text-center">📋 หมวดหมู่อุปกรณ์ที่ซ่อม: {getTopicName(topicId)}</h2>
                            <div className="grid grid-cols-2 gap-6">
                                {/* กราฟห้องที่เกี่ยวข้อง */}
                                <div>
                                    <h3 className="text-md font-semibold mb-2">🏠 ห้องที่แจ้งซ่อม: {topicStats[topicId].total} ครั้ง</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={Object.keys(topicStats[topicId].rooms).map(room => ({ name: room, count: topicStats[topicId].rooms[room] }))}>
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="count">
                                                {Object.keys(topicStats[topicId].rooms).map((room, i) => (
                                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* รายละเอียด */}
                                <div>
                                    <h3 className="text-md font-semibold mb-2">ℹ️ รายละเอียด</h3>
                                    <button
                                        onClick={() => openPopup(topicId)}
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                                    >
                                        ดูรายการซ่อมทั้งหมด
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pop-up */}
                {selectedTopicId && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">📋 รายการซ่อม หัวเรื่อง: {getTopicName(selectedTopicId)}</h2>
                                <button onClick={closePopup} className="text-red-500">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-gray-300 p-2">รายละเอียดคำขอ</th>
                                        <th className="border border-gray-300 p-2">ห้อง</th>
                                        <th className="border border-gray-300 p-2">สถานะ</th>
                                        <th className="border border-gray-300 p-2">หมายเลขครุภัณฑ์</th>
                                        <th className="border border-gray-300 p-2">รายการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedRepairs.map((repair, i) => (
                                        <tr key={i} className="hover:bg-gray-100">
                                            <td className="border border-gray-300 p-2">{repair["รายละเอียดคำขอแจ้งซ่อม"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["ห้อง"] || repair["room"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["สถานะการซ่อม"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["หมายเลขครุภัณฑ์"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["รายการ"]}</td>          
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                onClick={downloadExcel}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-4 rounded-lg w-full"
                            >
                                📥 ดาวน์โหลด Excel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;