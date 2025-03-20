import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChartArea, Package, Archive, LogOut, Pencil, Trash, Search, ClipboardPlus, Printer, FileSpreadsheet, UserCogIcon } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SarabunFont from "../sarabunBase64";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { jwtDecode } from "jwt-decode";

const Equipment = () => {
    const navigate = useNavigate();
    const [equipments, setEquipments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [showPrintOptions, setShowPrintOptions] = useState(false);
    const [showYearFilter, setShowYearFilter] = useState(false);
    const [selectedYear, setSelectedYear] = useState("");
    const [years, setYears] = useState(new Set());
    const popupRef = useRef(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [currentPdfDoc, setCurrentPdfDoc] = useState(null);
    const [userName, setUserName] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 10;

    const fetchEquipments = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("กรุณาเข้าสู่ระบบ");
                navigate("/login");
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/GETequipments`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) {
                toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
                localStorage.removeItem("token");
                navigate("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setEquipments(data);

            const extractedYears = new Set(
                data.map((item) => new Date(item.date_add).getFullYear() + 543)
            );

            setYears(extractedYears);
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการโหลดขั้อมูล");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            toast.error("กรุณาเข้าสู่ระบบ");
            navigate("/login");
            return;
        }

        try {
            const decoded = jwtDecode(token);
            setUserName(decoded.full_name);
        } catch (error) {
            toast.error("token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
            localStorage.removeItem("token");
            navigate("/login");
            return;
        }

        fetchEquipments();

        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowPrintOptions(false);
                setShowYearFilter(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [navigate, fetchEquipments]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const buddhistYear = date.getFullYear() + 543;
        return date.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).replace(date.getFullYear(), buddhistYear);
    };

    const sortData = (data) => {
        return data.sort((a, b) => {
            if (a.equipment_name < b.equipment_name) return -1;
            if (a.equipment_name > b.equipment_name) return 1;
            return 0;
        });
    };

    const toggleSelect = (equipment_id) => {
        setSelectedItems((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(equipment_id)) {
                newSelected.delete(equipment_id);
            } else {
                newSelected.add(equipment_id);
            }
            return newSelected;
        });
    };

    // เพิ่มฟังก์ชันลบหลายรายการ
    const handleDeleteMultiple = async () => {
        if (selectedItems.size === 0) {
            toast.error("⚠️ โปรดเลือกอย่างน้อย 1 รายการเพื่อลบ!");
            return;
        }

        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedItems.size} รายการที่เลือก?`)) {
            try {
                const token = localStorage.getItem("token");
                const equipmentIds = Array.from(selectedItems);

                // วนลูปเรียก DELETE สำหรับแต่ละ equipment_id
                const deletePromises = equipmentIds.map((id) =>
                    fetch(`${process.env.REACT_APP_API_URL}/api/equipment/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    })
                );

                const responses = await Promise.all(deletePromises);
                const allSuccessful = responses.every((res) => res.ok);

                if (allSuccessful) {
                    toast.success(`ลบ ${selectedItems.size} รายการสำเร็จ!`);
                    setEquipments(equipments.filter((item) => !selectedItems.has(item.equipment_id)));
                    setSelectedItems(new Set());
                } else {
                    toast.error("เกิดข้อผิดพลาดในการลบบางรายการ");
                }
            } catch (error) {
                console.error("Error deleting multiple equipments:", error);
                toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
            }
        }
    };

    // ฟังก์ชันลบรายการเดียว (เดิม)
    const handleDelete = async (equipment_id) => {
        if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบครุภัณฑ์นี้?")) {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/${equipment_id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    toast.success("ลบครุภัณฑ์สำเร็จ!");
                    setEquipments(equipments.filter((item) => item.equipment_id !== equipment_id));
                } else {
                    toast.error("เกิดข้อผิดพลาดในการลบครุภัณฑ์");
                }
            } catch (error) {
                console.error("Error deleting equipment:", error);
                toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
            }
        }
    };

    const printPDF = () => {
        if (selectedItems.size === 0) {
            toast.error("⚠️ โปรดเลือกอย่างน้อย 1 รายการ!");
            return;
        }

        const doc = new jsPDF();
        doc.addFileToVFS("Sarabun-Regular.ttf", SarabunFont);
        doc.addFont("Sarabun-Regular.ttf", "Sarabun-Regular", "normal");
        doc.setFont("Sarabun-Regular");

        doc.text("รายการพัสดุที่เลือก", 14, 10);

        const selectedData = equipments.filter(item => selectedItems.has(item.equipment_id));

        const tableData = selectedData.map((item, index) => [
            index + 1,
            item.equipment_id,
            item.equipment_name,
            item.spec,
            item.equipment_type,
            item.price.toLocaleString(),
            formatDate(item.date_add),
            item.location,
        ]);

        autoTable(doc, {
            head: [["#", "เลขครุภัณฑ์", "ชื่อพัสดุ", "รุ่น/ลักษณะ", "ประเภท", "ราคา", "วันที่รับ", "ห้อง"]],
            body: tableData,
            startY: 20,
            styles: { font: "Sarabun-Regular", fontStyle: "normal" },
            headStyles: {
                font: "Sarabun-Regular",
                fontStyle: "normal",
                halign: "center",
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 12
            },
            bodyStyles: { font: "Sarabun-Regular", fontStyle: "normal" },
            didDrawCell: (data) => {
                if (data.section === 'head' || data.section === 'body') {
                    doc.setFont("Sarabun-Regular");
                }
            }
        });

        generateAndShowPDF(doc, "selected-equipment");
        toast.success("✅ บันทึก PDF เรียบร้อย!");
    };

    const handlePrintAllPDF = () => {
        const doc = new jsPDF();
        doc.addFileToVFS("Sarabun-Regular.ttf", SarabunFont);
        doc.addFont("Sarabun-Regular.ttf", "Sarabun-Regular", "normal");
        doc.setFont("Sarabun-Regular");

        doc.text("รายการพัสดุทั้งหมด", 14, 10);

        const tableData = equipments.map((item, index) => [
            index + 1,
            item.equipment_id,
            item.equipment_name,
            item.spec,
            item.equipment_type,
            item.price.toLocaleString(),
            formatDate(item.date_add),
            item.location,
        ]);

        autoTable(doc, {
            head: [["#", "เลขครุภัณฑ์", "ชื่อพัสดุ", "รุ่น/ลักษณะ", "ประเภท", "ราคา", "วันที่รับ", "ห้อง"]],
            body: tableData,
            startY: 20,
            styles: { font: "Sarabun-Regular", fontStyle: "normal" },
            headStyles: {
                font: "Sarabun-Regular",
                fontStyle: "normal",
                halign: "center",
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 12
            },
            bodyStyles: { font: "Sarabun-Regular", fontStyle: "normal" },
            didDrawCell: (data) => {
                if (data.section === 'head' || data.section === 'body') {
                    doc.setFont("Sarabun-Regular");
                }
            }
        });

        generateAndShowPDF(doc, "all-equipment");
        setShowPrintOptions(false);
    };

    const handlePrintYearPDF = async () => {
        if (!selectedYear) {
            toast.error("⚠️ โปรดเลือกปีที่ต้องการพิมพ์!");
            return;
        }

        const filteredData = equipments.filter(
            (item) => new Date(item.date_add).getFullYear() + 543 === parseInt(selectedYear)
        );

        if (filteredData.length === 0) {
            toast.error("🚫 ไม่พบพัสดุในปีที่เลือก!");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.addFileToVFS("Sarabun-Regular.ttf", SarabunFont);
        doc.addFont("Sarabun-Regular.ttf", "Sarabun-Regular", "normal");
        doc.setFont("Sarabun-Regular");

        doc.text(`รายการพัสดุของปี ${selectedYear}`, 14, 10);

        const tableData = await Promise.all(
            filteredData.map(async (item, index) => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.equipment_id}`;
                const img = await fetch(qrUrl);
                const blob = await img.blob();
                const reader = new FileReader();

                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                const base64QR = await base64Promise;

                return [
                    index + 1,
                    item.equipment_id,
                    item.equipment_name,
                    item.spec,
                    item.equipment_type,
                    item.price.toLocaleString(),
                    formatDate(item.date_add),
                    item.location,
                    base64QR
                ];
            })
        );

        autoTable(doc, {
            head: [["ลำดับ", "เลขครุภัณฑ์", "ชื่อพัสดุ", "รุ่น/ลักษณะ", "ประเภท", "ราคา", "วันที่รับ", "ห้อง", "คิวอาร์โค้ด"]],
            body: tableData.map(row => [...row.slice(0, -1), ""]),
            startY: 30,
            margin: { left: 14, right: 14 },
            styles: { font: "Sarabun-Regular", fontStyle: "normal" },
            headStyles: {
                font: "Sarabun-Regular",
                fontStyle: "normal",
                halign: "center",
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 10,
            },
            bodyStyles: { font: "Sarabun-Regular", fontStyle: "normal" },
            columnStyles: {
                0: { cellWidth: 15, halign: "center" },
                1: { cellWidth: 30, halign: "center" },
                2: { cellWidth: 20, halign: "center" },
                3: { cellWidth: 30, halign: "center" },
                4: { cellWidth: 40, halign: "center" },
                5: { cellWidth: 20, halign: "center" },
                6: { cellWidth: 40, halign: "center" },
                7: { cellWidth: 15, halign: "center" },
                8: { cellWidth: 25, halign: "center" }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 8 && tableData[data.row.index] && tableData[data.row.index][8]) {
                    const base64QR = tableData[data.row.index][8];
                    const qrSize = 8;
                    const cellWidth = data.cell.width;
                    const cellHeight = data.cell.height;
                    const xPos = data.cell.x + (cellWidth - qrSize) / 2;
                    const yPos = data.cell.y + (cellHeight - qrSize) / 2;
                    doc.addImage(base64QR, "JPEG", xPos, yPos, qrSize, qrSize);
                }
            }
        });

        doc.save(`equipment-${selectedYear}.pdf`);
        toast.success(`✅ บันทึก PDF ของปี ${selectedYear} สำเร็จ!`);
        setShowYearFilter(false);
    };

    const getFormattedDateTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}-${hour}${minute}${second}`;
    };

    const generateAndShowPDF = (doc, filename) => {
        const timestamp = getFormattedDateTime();
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(pdfUrl);
        setShowPdfViewer(true);
        setCurrentPdfDoc(doc);
        doc.filename = `${filename}-${timestamp}.pdf`;
    };

    const exportToGoogleSheets = async () => {
        try {
            setIsExporting(true);
            const token = localStorage.getItem("token");

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/updateSheet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(`${result.message}`);
            } else {
                toast.error(`เกิดข้อผิดพลาด: ${result.message}`);
            }
        } catch (error) {
            console.error("Error exporting to Google Sheets:", error);
            toast.error("เกิดข้อผิดพลาดในการส่งข้อมูลไป Google Sheets");
        } finally {
            setIsExporting(false);
        }
    };

    const filteredEquipments = sortData(
        equipments.filter((item) =>
            item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.spec.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.equipment_id.toLowerCase().includes(searchTerm.toLocaleLowerCase())
        )
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredEquipments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage);

    return (
        <div className="flex bg-pageBG min-h-screen">
            <aside className="fixed top-0 left-0 w-64 h-screen text-white p-5 flex flex-col shadow-lg bg-sidebarBG">
                <h2 className="text-xl font-bold mb-6">ระบบจัดการพัสดุ-ครุภัณฑ์</h2>
                <ul className="space-y-4 flex-1">
                    <li>
                        <Link to="/dashboard" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <ChartArea className="w-5 h-5 mr-3" /> สถิติแจ้งซ่อม
                        </Link>
                    </li>
                    <li>
                        <Link to="/equipment" className="flex items-center p-2 rounded-lg bg-sidebarHover hover:bg-sidebarHover w-full text-left">
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

            <main className="flex-1 ml-64 p-8 bg-yellow-50">
                <div className="flex justify-end mb-4">
                    <span className="text-gray-700">{userName}</span>
                </div>
                <div className="mb-4 flex justify-end items-center">
                    <div className="flex space-x-3">
                        {selectedItems.size > 0 && (
                            <>
                                <button onClick={printPDF} className="px-4 py-2 bg-blue-500 text-white rounded shadow flex items-center h-10">
                                    <Printer className="w-5 h-5 mr-2" /> พิมพ์ PDF รายการที่เลือก
                                </button>
                                <button onClick={handleDeleteMultiple} className="px-4 py-2 bg-red-500 text-white rounded shadow flex items-center h-10">
                                    <Trash className="w-5 h-5 mr-2" /> ลบรายการที่เลือก
                                </button>
                            </>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowPrintOptions(!showPrintOptions)}
                                className="px-4 py-2 bg-gray-500 text-white rounded shadow flex items-center h-10"
                            >
                                <Printer className="w-5 h-5 mr-2" /> พิมพ์ PDF
                            </button>
                            {showPrintOptions && (
                                <div ref={popupRef} className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 shadow-md rounded">
                                    <button onClick={handlePrintAllPDF} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                                        📄 พิมพ์ PDF ทั้งหมด
                                    </button>
                                    <button onClick={() => setShowYearFilter(true)} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                                        📅 พิมพ์ PDF ตามปี
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={exportToGoogleSheets}
                            disabled={isExporting}
                            className={`px-4 py-2 ${isExporting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded shadow flex items-center h-10`}
                        >
                            <FileSpreadsheet className="w-5 h-5 mr-2" />
                            {isExporting ? 'กำลังส่งออก...' : 'Add to Sheets'}
                        </button>
                        <button onClick={() => navigate("/equipment/addEquipments")} className="px-4 py-2 bg-green-500 text-white rounded shadow flex items-center h-10">
                            <ClipboardPlus className="w-5 h-5 mr-2" /> เพิ่มครุภัณฑ์
                        </button>
                    </div>
                </div>

                <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center border rounded-lg px-2 py-1 h-10 shadow bg-white">
                            <Search className="w-5 h-5 text-gray-600 mr-2" />
                            <input
                                type="text"
                                placeholder="ค้นหาพัสดุ..."
                                className="outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 shadow-md rounded-lg">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 animate-load-bar"></div>
                            </div>
                            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-blue-500 text-white text-center">
                                    <th className="p-2"></th>
                                    <th className="border border-gray-300 p-2 text-center">เลขครุภัณฑ์</th>
                                    <th className="border border-gray-300 p-2 text-center">รายการ</th>
                                    <th className="border border-gray-300 p-2 text-center">รุ่น ลักษณะ</th>
                                    <th className="border border-gray-300 p-2 text-center">หน่วยงาน</th>
                                    <th className="border border-gray-300 p-2 text-center">ราคา</th>
                                    <th className="border border-gray-300 p-2 text-center">วันที่ตรวจรับ</th>
                                    <th className="border border-gray-300 p-2 text-center">ห้อง</th>
                                    <th className="border border-gray-300 p-2">คิวอาร์โค้ด</th>
                                    <th className="border border-gray-300 p-2">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length > 0 ? (
                                    currentItems.map((item) => (
                                        <tr key={item.equipment_id} className="hover:bg-gray-100 border-b last:border-none">
                                            <td className="p-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5"
                                                    checked={selectedItems.has(item.equipment_id)}
                                                    onChange={() => toggleSelect(item.equipment_id)}
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-2">{item.equipment_id}</td>
                                            <td className="border border-gray-300 p-2">{item.equipment_name}</td>
                                            <td className="border border-gray-300 p-2">{item.spec}</td>
                                            <td className="border border-gray-300 p-2">{item.equipment_type}</td>
                                            <td className="border border-gray-300 p-2">{item.price}</td>
                                            <td className="border border-gray-300 p-2">{formatDate(item.date_add)}</td>
                                            <td className="border border-gray-300 p-2">{item.location}</td>
                                            <td className="border border-gray-300 p-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${item.equipment_id}`}
                                                    alt="QR Code"
                                                    width="50"
                                                    height="50"
                                                />
                                            </td>
                                            <td className="border border-gray-300 p-2 text-center">
                                                <Link to={`/equipment/editEquipments/${item.equipment_id}`} className="text-blue-500 hover:text-blue-700 mx-2">
                                                    <Pencil className="inline-block w-5 h-5" />
                                                </Link>
                                                <button onClick={() => handleDelete(item.equipment_id)} className="text-red-500 hover:text-red-700">
                                                    <Trash className="inline-block w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="10" className="text-center text-gray-500 p-4">ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-between mt-4">
                    <div className="flex justify-start">
                        แสดงผล {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredEquipments.length)} จาก {filteredEquipments.length} รายการ
                    </div>
                    <div className="flex justify-end space-x-2">
                        {[...Array(totalPages)].map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPage(index + 1)}
                                className={`px-3 py-1 rounded ${currentPage === index + 1 ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {showYearFilter && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
                        <div ref={popupRef} className="bg-white p-6 rounded shadow-lg">
                            <h2 className="text-lg font-semibold mb-4">เลือกปีที่ต้องการพิมพ์</h2>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="border px-3 py-2 w-full mb-4"
                            >
                                <option value="">-- เลือกปี --</option>
                                {Array.from(years).map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setShowYearFilter(false)} className="px-4 py-2 bg-gray-300 rounded">
                                    ยกเลิก
                                </button>
                                <button onClick={handlePrintYearPDF} className="px-4 py-2 bg-blue-500 text-white rounded">
                                    พิมพ์ PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showPdfViewer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-4 rounded-lg w-11/12 h-5/6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">ตัวอย่าง PDF</h2>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = pdfUrl;
                                            link.download = currentPdfDoc?.filename || 'document.pdf';
                                            link.click();
                                            toast.success(`✅ บันทึก PDF สำเร็จ!`);
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        ดาวน์โหลด PDF
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPdfViewer(false);
                                            URL.revokeObjectURL(pdfUrl);
                                            setCurrentPdfDoc(null);
                                        }}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        ปิด
                                    </button>
                                </div>
                            </div>
                            <div className="h-full bg-gray-100">
                                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                                    <Viewer fileUrl={pdfUrl} />
                                </Worker>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Equipment;