import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { ChartArea, Archive, Package, UserCogIcon, LogOut, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const UnifiedDashboard = () => {
  const [repairRequests, setRepairRequests] = useState([]);
  const [topics, setTopics] = useState({});
  const [users, setUsers] = useState({});
  const [admins, setAdmins] = useState([]);
  const [selectedRepairs, setSelectedRepairs] = useState([]); // สำหรับ popup
  const [currentRoomPage, setCurrentRoomPage] = useState(1);
  const [currentRepairPage, setCurrentRepairPage] = useState(1);
  const roomsPerPage = 5; // จำกัด pagination ห้องที่ 5
  const repairsPerPage = 10; // จำกัด pagination รายการซ่อมที่ 10
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Repair Requests
    onValue(ref(db, "คำขอแจ้งซ่อม"), (snapshot) => {
      if (snapshot.exists()) {
        setRepairRequests(Object.values(snapshot.val()));
      }
    });

    // Fetch Topics
    onValue(ref(db, "หัวเรื่อง"), (snapshot) => {
      if (snapshot.exists()) {
        const topicData = snapshot.val();
        const topicMap = {};
        Object.values(topicData).forEach((topic) => {
          if (topic["รหัสหัวเรื่อง"] && topic["ชื่อหัวเรื่อง"]) {
            topicMap[topic["รหัสหัวเรื่อง"]] = topic["ชื่อหัวเรื่อง"];
          }
        });
        setTopics(topicMap);
      }
    });

    // Fetch Users and Filter Admins
    onValue(ref(db, "ผู้ใช้งาน"), (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const userMap = {};
        Object.values(userData).forEach((user) => {
          if (user["อีเมล"] && user["ชื่อ"]) {
            userMap[user["อีเมล"]] = user["ชื่อ"];
          }
        });
        setUsers(userMap);

        // Filter admins based on roles
        const adminList = Object.values(userData).filter(
          (user) =>
            user.ตำแหน่ง === "นักวิชาการคอมพิวเตอร์" ||
            user.ตำแหน่ง === "นักวิชาการโสตทัศนศึกษา" ||
            user.ตำแหน่ง === "ช่างเทคนิค"
        );
        setAdmins(adminList);
      }
    });
  }, []);

  // Room Stats
  const roomStats = repairRequests.reduce((acc, request) => {
    const room = request["ห้อง"] || request["room"] || "ไม่ระบุ";
    if (!acc[room]) {
      acc[room] = { total: 0 };
    }
    acc[room].total += 1;
    return acc;
  }, {});

  const roomChartData = Object.keys(roomStats).map((room) => ({
    name: room,
    value: roomStats[room].total,
  }));

  const totalRepairs = roomChartData.reduce((sum, room) => sum + room.value, 0);

  // Pagination for Room Table
  const roomTableData = Object.keys(roomStats).map((room, index) => ({
    id: index + 1,
    room: room,
    count: roomStats[room].total,
  }));
  const totalRoomPages = Math.ceil(roomTableData.length / roomsPerPage);
  const indexOfLastRoom = currentRoomPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRoomData = roomTableData.slice(indexOfFirstRoom, indexOfLastRoom);

  // Admin Stats
  const receiverStats = admins.map((admin) => {
    const repairsHandled = repairRequests.filter(
      (req) => req["อีเมลผู้รับเรื่อง"] === admin.อีเมล
    );
    return {
      name: admin.ชื่อ,
      email: admin.อีเมล,
      total: repairsHandled.length,
    };
  });

  // Pagination for Repair History (All Repairs)
  const totalRepairPages = Math.ceil(repairRequests.length / repairsPerPage);
  const indexOfLastRepair = currentRepairPage * repairsPerPage;
  const indexOfFirstRepair = indexOfLastRepair - repairsPerPage;
  const currentRepairData = repairRequests.slice(indexOfFirstRepair, indexOfLastRepair);

  // ห้องที่ซ่อมมากที่สุด
  const mostRepairedRoom = Object.keys(roomStats).reduce((a, b) =>
    roomStats[a].total > roomStats[b].total ? a : b,
    Object.keys(roomStats)[0] || "ไม่ระบุ"
  );

  // ผู้รับเรื่องมากที่สุด
  const mostActiveReceiver = receiverStats.reduce(
    (maxIndex, current, index, arr) =>
      current.total > (arr[maxIndex]?.total || 0) ? index : maxIndex,
    0
  );

  // ระยะเวลาเฉลี่ยที่ใช้ในการซ่อม (หน่วย: ชั่วโมง)
  const completedRepairs = repairRequests.filter(
    (req) => req["สถานะการซ่อม"] === "ซ่อมสำเร็จ" && req["วันที่เวลาแจ้ง"] && req["วันที่เวลาซ่อมสำเร็จ"]
  );
  const repairTimes = completedRepairs.map((req) => {
    const start = new Date(req["วันที่เวลาแจ้ง"]);
    const end = new Date(req["วันที่เวลาซ่อมสำเร็จ"]);
    return (end - start) / (1000 * 60 * 60); // แปลงจากมิลลิวินาทีเป็นชั่วโมง
  });
  const averageRepairTime =
    repairTimes.length > 0 ? repairTimes.reduce((sum, time) => sum + time, 0) / repairTimes.length : 0;

  const getTopicName = (topicId) => topics[topicId] || topicId;

  // ฟังก์ชันสำหรับแปลงวันที่ให้อยู่ในรูปแบบ DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // เดือนเริ่มจาก 0
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Open Popup when clicking on graph
  const openPopupFromGraph = (roomName) => {
    const repairs = repairRequests.filter((req) => (req["ห้อง"] || req["room"]) === roomName);
    setSelectedRepairs(repairs);
  };

  const closePopup = () => {
    setSelectedRepairs([]);
  };

  const downloadExcel = () => {
    const wsData = [
      [
        "ลำดับ",
        "ชื่อหัวเรื่อง",
        "หมายเลขครุภัณฑ์",
        "รายการ",
        "ห้อง",
        "รายละเอียดคำขอ",
        "วันที่เวลาแจ้ง",
        "สถานะการซ่อม",
        "วันที่เวลาซ่อมสำเร็จ",
        "อีเมลผู้รับเรื่อง",
      ],
      ...repairRequests.map((item, index) => [
        index + 1,
        getTopicName(item["รหัสหัวเรื่อง"]),
        item["หมายเลขครุภัณฑ์"],
        item["รายการ"],
        item["ห้อง"] || item["room"],
        item["รายละเอียดคำขอแจ้งซ่อม"],
        formatDate(item["วันที่เวลาแจ้ง"]),
        item["สถานะการซ่อม"],
        item["วันที่เวลาซ่อมสำเร็จ"] || "-",
        item["อีเมลผู้รับเรื่อง"] || "-",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติการซ่อม");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(dataBlob, `repair_history_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const COLORS = ["#FFBB28", "#82ca9d"];

  return (
    <div className="flex min-h-screen bg-pageBG">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-screen text-white p-5 flex flex-col shadow-lg bg-sidebarBG">
        <div className="flex items-center mb-6">
          <h2 className="text-xl font-bold">ระบบจัดการพัสดุ-ครุภัณฑ์</h2>
        </div>
        <ul className="space-y-4 flex-1">
          <li>
            <Link
              to="/dashboard"
              className="flex items-center p-2 rounded-lg bg-sidebarHover hover:bg-sidebarHover w-full text-left"
            >
              <ChartArea className="w-5 h-5 mr-3" /> สถิติแจ้งซ่อม
            </Link>
          </li>
          <li>
            <Link
              to="/equipment"
              className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left"
            >
              <Archive className="w-5 h-5 mr-3" /> ครุภัณฑ์
            </Link>
          </li>
          <li>
            <Link
              to="/supplies"
              className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left"
            >
              <Package className="w-5 h-5 mr-3" /> พัสดุ
            </Link>
          </li>
          <li>
            <Link
              to="/registerUser"
              className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left"
            >
              <UserCogIcon className="w-5 h-5 mr-3" /> ผู้ใช้งาน
            </Link>
          </li>
        </ul>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="flex items-center w-full text-left p-2 bg-logoutBT rounded-lg hover:bg-logoutBT-80 mt-auto"
        >
          <LogOut className="w-5 h-5 mr-3" /> ออกจากระบบ
        </button>
      </aside>

      {/* Main Content */}
      <div className="ml-64 p-6 w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">📊 Dashboard - สถิติการแจ้งซ่อม</h1>

        {/* New Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-2 bg-gray-300 rounded-lg text-center">
            <strong>ห้องที่ซ่อมมากที่สุด:</strong> {mostRepairedRoom} ({roomStats[mostRepairedRoom]?.total || 0} ครั้ง)
          </div>
          <div className="p-2 bg-gray-300 rounded-lg text-center">
            <strong>ผู้รับเรื่องมากที่สุด:</strong> {receiverStats[mostActiveReceiver]?.name || "ไม่ระบุ"} (
            {receiverStats[mostActiveReceiver]?.total || 0} ครั้ง)
          </div>
          <div className="p-2 bg-gray-300 rounded-lg text-center">
            <strong>ระยะเวลาเฉลี่ยที่ใช้ในการซ่อม:</strong> {averageRepairTime.toFixed(2)} ชั่วโมง
          </div>
        </div>

        {/* Graph Section */}
        <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">สถิติการแจ้งซ่อม</h2>
            <span className="text-lg font-semibold">ทั้งหมด: {totalRepairs} รายการ</span>
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
              <Bar dataKey="value" fill="#FFBB28" barSize={50} onClick={(data) => openPopupFromGraph(data.name)}>
                {roomChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[0]} />
                ))}
                <LabelList dataKey="value" position="top" fill="#000" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setCurrentRoomPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentRoomPage === 1}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <div>
              {Array.from({ length: totalRoomPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentRoomPage(page)}
                  className={`px-3 py-1 rounded-lg mx-1 ${
                    currentRoomPage === page ? "bg-blue-500 text-white" : "bg-gray-200"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentRoomPage((prev) => Math.min(prev + 1, totalRoomPages))}
              disabled={currentRoomPage === totalRoomPages}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Room and Admin Stats Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Room Table */}
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">จำนวนห้องที่ซ่อม</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">ลำดับ</th>
                  <th className="border border-gray-300 p-2">ห้อง</th>
                  <th className="border border-gray-300 p-2">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {currentRoomData.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-100">
                    <td className="border border-gray-300 p-2 text-center">{room.id}</td>
                    <td className="border border-gray-300 p-2">{room.room}</td>
                    <td className="border border-gray-300 p-2 text-center">{room.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Admin Stats */}
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">จำนวนการรับเรื่อง</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">ลำดับ</th>
                  <th className="border border-gray-300 p-2">ชื่อ</th>
                  <th className="border border-gray-300 p-2">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {receiverStats.map((admin, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-2">{admin.name}</td>
                    <td className="border border-gray-300 p-2 text-center">{admin.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Repair History Table */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-2">ประวัติการซ่อม</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">ลำดับ</th>
                <th className="border border-gray-300 p-2">หัวเรื่อง</th>
                <th className="border border-gray-300 p-2">รายการ</th>
                <th className="border border-gray-300 p-2">ห้อง</th>
                <th className="border border-gray-300 p-2">สถานะ</th>
                <th className="border border-gray-300 p-2">วันที่แจ้ง</th>
                <th className="border border-gray-300 p-2">วันที่ซ่อมสำเร็จ</th>
                <th className="border border-gray-300 p-2">ผู้รับเรื่อง</th>
                <th className="border border-gray-300 p-2">อีเมลผู้รับเรื่อง</th>
              </tr>
            </thead>
            <tbody>
              {currentRepairData.map((repair, i) => (
                <tr key={i} className="hover:bg-gray-100">
                  <td className="border border-gray-300 p-2 text-center">{indexOfFirstRepair + i + 1}</td>
                  <td className="border border-gray-300 p-2">{getTopicName(repair["รหัสหัวเรื่อง"])}</td>
                  <td className="border border-gray-300 p-2">{repair["รายการ"]}</td>
                  <td className="border border-gray-300 p-2">{repair["ห้อง"] || repair["room"]}</td>
                  <td className="border border-gray-300 p-2">{repair["สถานะการซ่อม"]}</td>
                  <td className="border border-gray-300 p-2">{formatDate(repair["วันที่เวลาแจ้ง"])}</td>
                  <td className="border border-gray-300 p-2">{repair["วันที่เวลาซ่อมสำเร็จ"] || "-"}</td>
                  <td className="border border-gray-300 p-2">{users[repair["อีเมลผู้รับเรื่อง"]] || "-"}</td>
                  <td className="border border-gray-300 p-2">{repair["อีเมลผู้รับเรื่อง"] || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setCurrentRepairPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentRepairPage === 1}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <div>
              {Array.from({ length: totalRepairPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentRepairPage(page)}
                  className={`px-3 py-1 rounded-lg mx-1 ${
                    currentRepairPage === page ? "bg-blue-500 text-white" : "bg-gray-200"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentRepairPage((prev) => Math.min(prev + 1, totalRepairPages))}
              disabled={currentRepairPage === totalRepairPages}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <button
            onClick={downloadExcel}
            className="w-40 h-12 bg-blue-500 text-white rounded-lg mt-4 hover:bg-blue-600 transition duration-200"
            style={{ marginLeft: "auto", display: "block" }}
          >
            📥 ดาวน์โหลด Excel
          </button>
        </div>
      </div>

      {/* Popup for Repair Details */}
      {selectedRepairs.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-3/4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">📋 รายละเอียดการแจ้งซ่อม</h2>
              <button onClick={closePopup} className="text-red-500">
                <XCircle size={24} />
              </button>
            </div>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">ลำดับ</th>
                  <th className="border border-gray-300 p-2">หัวเรื่อง</th>
                  <th className="border border-gray-300 p-2">รายการ</th>
                  <th className="border border-gray-300 p-2">ห้อง</th>
                  <th className="border border-gray-300 p-2">สถานะ</th>
                  <th className="border border-gray-300 p-2">วันที่แจ้ง</th>
                  <th className="border border-gray-300 p-2">วันที่ซ่อมสำเร็จ</th>
                  <th className="border border-gray-300 p-2">ผู้รับเรื่อง</th>
                  <th className="border border-gray-300 p-2">อีเมลผู้รับเรื่อง</th>
                </tr>
              </thead>
              <tbody>
                {selectedRepairs.map((repair, i) => (
                  <tr key={i} className="hover:bg-gray-100">
                    <td className="border border-gray-300 p-2 text-center">{i + 1}</td>
                    <td className="border border-gray-300 p-2">{getTopicName(repair["รหัสหัวเรื่อง"])}</td>
                    <td className="border border-gray-300 p-2">{repair["รายการ"]}</td>
                    <td className="border border-gray-300 p-2">{repair["ห้อง"] || repair["room"]}</td>
                    <td className="border border-gray-300 p-2">{repair["สถานะการซ่อม"]}</td>
                    <td className="border border-gray-300 p-2">{formatDate(repair["วันที่เวลาแจ้ง"])}</td>
                    <td className="border border-gray-300 p-2">{repair["วันที่เวลาซ่อมสำเร็จ"] || "-"}</td>
                    <td className="border border-gray-300 p-2">{users[repair["อีเมลผู้รับเรื่อง"]] || "-"}</td>
                    <td className="border border-gray-300 p-2">{repair["อีเมลผู้รับเรื่อง"] || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;