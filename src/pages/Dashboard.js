import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { ChartArea, Archive, LogOut, XCircle, Package, UserCogIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, LabelList } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Dashboard = () => {
    const [repairRequests, setRepairRequests] = useState([]);
    const [topics, setTopics] = useState({});
    const [users, setUsers] = useState({});
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedRepairs, setSelectedRepairs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        onValue(ref(db, "คำขอแจ้งซ่อม"), (snapshot) => {
            if (snapshot.exists()) {
                const data = Object.values(snapshot.val());
                setRepairRequests(data);
            }
        });

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

        onValue(ref(db, "ผู้ใช้งาน"), (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const userMap = {};
                Object.values(userData).forEach(user => {
                    if (user["อีเมล"] && user["ชื่อ"]) {
                        userMap[user["อีเมล"]] = user["ชื่อ"];
                    }
                });
                setUsers(userMap);
            }
        });
    }, []);

    const topicStats = repairRequests.reduce((acc, request) => {
        const topicId = request["รหัสหัวเรื่อง"] || "ไม่ระบุ";
        const room = request["ห้อง"] || request["room"] || "ไม่ระบุ";
        if (!acc[topicId]) {
            acc[topicId] = { total: 0, rooms: {} };
        }
        acc[topicId].total += 1;
        acc[topicId].rooms[room] = (acc[topicId].rooms[room] || 0) + 1;
        return acc;
    }, {});

    const roomStats = repairRequests.reduce((acc, request) => {
        const room = request["ห้อง"] || request["room"] || "ไม่ระบุ";
        const topicId = request["รหัสหัวเรื่อง"] || "ไม่ระบุ";
        if (!acc[room]) {
            acc[room] = { total: 0, topics: {} };
        }
        acc[room].total += 1;
        acc[room].topics[topicId] = (acc[room].topics[topicId] || 0) + 1;
        return acc;
    }, {});

    const statusStats = repairRequests.reduce((acc, request) => {
        const status = request["สถานะการซ่อม"] || "ไม่ระบุ";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const receiverStats = repairRequests.reduce((acc, request) => {
        const receiverEmail = request["อีเมลผู้รับเรื่อง"] || "ไม่ระบุ";
        const receiverName = users[receiverEmail] || receiverEmail;
        if (!acc[receiverEmail]) {
            acc[receiverEmail] = { total: 0, name: receiverName };
        }
        acc[receiverEmail].total += 1;
        return acc;
    }, {});

    const averageRepairTime = repairRequests
        .filter(req => req["สถานะการซ่อม"] === "ซ่อมสำเร็จ" && req["วันที่เวลาแจ้ง"] && req["วันที่เวลาซ่อมสำเร็จ"])
        .map(req => {
            const start = new Date(req["วันที่เวลาแจ้ง"]);
            const end = new Date(req["วันที่เวลาซ่อมสำเร็จ"]);
            return (end - start) / (1000 * 60 * 60);
        })
        .reduce((sum, time) => sum + time, 0) / (repairRequests.filter(req => req["สถานะการซ่อม"] === "ซ่อมสำเร็จ").length || 1);

    const getTopicName = (topicId) => {
        return topics[topicId] || topicId;
    };

    const statusChartData = Object.keys(statusStats).map(status => ({
        name: status,
        value: statusStats[status],
    }));

    const roomChartData = Object.keys(roomStats).map(room => ({
        name: room,
        value: roomStats[room].total,
    }));

    const totalRepairs = roomChartData.reduce((sum, room) => sum + room.value, 0);

    const topRooms = roomChartData
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const mostRepairedRoom = Object.keys(roomStats).reduce((maxRoom, room) => {
        return roomStats[room].total > roomStats[maxRoom].total ? room : maxRoom;
    }, Object.keys(roomStats)[0] || "ไม่ระบุ");

    const mostActiveReceiver = Object.keys(receiverStats).reduce((maxReceiver, receiverEmail) => {
        return receiverStats[receiverEmail].total > receiverStats[maxReceiver].total ? receiverEmail : maxReceiver;
    }, Object.keys(receiverStats)[0] || "ไม่ระบุ");

    const openPopup = (topicId) => {
        setSelectedTopicId(topicId);
        const repairs = repairRequests.filter(req => req["รหัสหัวเรื่อง"] === topicId);
        setSelectedRepairs(repairs);
    };

    const closePopup = () => {
        setSelectedTopicId(null);
        setSelectedRepairs([]);
    };

    const downloadExcel = () => {
        if (!selectedRepairs.length) return;

        const wsData = [
            ["ลำดับ", "ชื่อหัวเรื่อง", "หมายเลขครุภัณฑ์", "รายการ", "ห้อง", "รายละเอียดคำขอ", "วันที่เวลาแจ้ง", "สถานะการซ่อม", "วันที่เวลาซ่อมสำเร็จ", "อีเมลผู้รับเรื่อง"],
            ...selectedRepairs.map((item, index) => [
                index + 1,
                getTopicName(item["รหัสหัวเรื่อง"]),
                item["หมายเลขครุภัณฑ์"],
                item["รายการ"],
                item["ห้อง"] || item["room"],
                item["รายละเอียดคำขอแจ้งซ่อม"],
                item["วันที่เวลาแจ้ง"],
                item["สถานะการซ่อม"],
                item["วันที่เวลาซ่อมสำเร็จ"] || "-",
                item["อีเมลผู้รับเรื่อง"] || "-",
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "สถิติการซ่อม");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(dataBlob, `repair_stats_topic_${getTopicName(selectedTopicId)}.xlsx`);
    };

    const COLORS = ["#FFBB28"];

    return (
        <div className="flex min-h-screen bg-pageBG">
            <aside className="fixed top-0 left-0 w-64 h-screen text-white p-5 flex flex-col shadow-lg bg-sidebarBG">
                <div className="flex items-center mb-6">
                    <h2 className="text-xl font-bold">ระบบจัดการพัสดุ-ครุภัณฑ์</h2>
                </div>
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

            <div className="ml-64 p-6 w-full">
                <h1 className="text-2xl font-bold mb-6 text-center">📊 Dashboard - สถิติการแจ้งซ่อม</h1>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-2 bg-gray-300 rounded-lg text-center">
                        <strong>ห้องที่ซ่อมมากที่สุด:</strong> {mostRepairedRoom} ({roomStats[mostRepairedRoom]?.total || 0} ครั้ง)
                    </div>
                    <div className="p-2 bg-gray-300 rounded-lg text-center">
                        <strong>ผู้รับเรื่องมากที่สุด:</strong> {receiverStats[mostActiveReceiver]?.name || "ไม่ระบุ"} ({receiverStats[mostActiveReceiver]?.total || 0} ครั้ง)
                    </div>
                    <div className="p-2 bg-gray-300 rounded-lg text-center">
                        <strong>ระยะเวลาเฉลี่ยที่ใช้ในการซ่อม:</strong> {averageRepairTime.toFixed(2)} ชั่วโมง
                    </div>
                </div>

                {/* กราฟห้องที่แจ้งซ่อม */}
                <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
                    <div className="flex items-start">
                        <div className="w-3/4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-semibold">📊 สถิติห้องที่แจ้งซ่อม (2025)</h2>
                                <span className="text-lg font-semibold">รวม: {totalRepairs} ครั้ง</span>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={roomChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        interval={0} 
                                        height={60} 
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#FFBB28" barSize={10}>
                                        {roomChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[0]} />
                                        ))}
                                        <LabelList dataKey="value" position="top" fill="#000" fontSize={12} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/4 pl-6">
                            <h3 className="text-lg font-semibold mb-2">ห้อง</h3>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="border p-2 text-left">ห้อง</th>
                                        <th className="border p-2 text-right">จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topRooms.map((room, index) => (
                                        <tr key={index}>
                                            <td className="border p-2">{room.name}</td>
                                            <td className="border p-2 text-right">{room.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* กราฟสถานะการซ่อม */}
                <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-center">📊 สถิติสถานะการซ่อม</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={statusChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#82ca9d" barSize={30}>
                                {statusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                <LabelList dataKey="value" position="top" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-6 mt-6">
                    {Object.keys(topicStats).map((topicId, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-lg w-full">
                            <h2 className="text-lg font-semibold mb-4 text-center">📋 หมวดหมู่อุปกรณ์ที่ซ่อม: {getTopicName(topicId)}</h2>
                            <div className="grid grid-cols-2 gap-6">
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

                {selectedTopicId && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-3/4">
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
                                        <th className="border border-gray-300 p-2">วันที่เวลาแจ้ง</th>
                                        <th className="border border-gray-300 p-2">วันที่เวลาซ่อมสำเร็จ</th>
                                        <th className="border border-gray-300 p-2">อีเมลผู้รับเรื่อง</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedRepairs.map((repair, i) => (
                                        <tr key={i} className="hover:bg-gray-100">
                                            <td className="border border-gray-300 p-2">{repair["รายละเอียดคำขอแจ้งซ่อม"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["ห้อง"] || repair["room"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["สถานะการซ่อม"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["หมายเลขครุภัณฑ์"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["วันที่เวลาแจ้ง"]}</td>
                                            <td className="border border-gray-300 p-2">{repair["วันที่เวลาซ่อมสำเร็จ"] || "-"}</td>
                                            <td className="border border-gray-300 p-2">{repair["อีเมลผู้รับเรื่อง"] || "-"}</td>
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