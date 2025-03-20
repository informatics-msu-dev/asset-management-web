import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChartArea, Package, Archive, LogOut, Pencil, Trash, Search, ClipboardPlus, Printer, ArrowUpDown, UserCogIcon } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import THSarabunNew from "../fonts/THSarabunNew.js";
import THSarabunNew_Bold from "../fonts/THSarabunNew_Bold.js";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const Supplies = () => {
    const navigate = useNavigate();
    const [equipments, setEquipments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showPrintOptions, setShowPrintOptions] = useState(false);
    const [showYearFilter, setShowYearFilter] = useState(false);
    const [selectedYear, setSelectedYear] = useState("");
    const [years, setYears] = useState(new Set());
    const popupRef = useRef(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [currentPdfDoc, setCurrentPdfDoc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const [sortConfig, setSortConfig] = useState({
        field: 'equipment_name',
        direction: 'asc'
    });
    const [showSortOptions, setShowSortOptions] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchSupplies = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("กรุณาเข้าสู่ระบบ");
                navigate("/login");
                return;
            }
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/GETsupplies`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (Array.isArray(data)) {
                setEquipments(data);
                const extractedYears = new Set(
                    data.map((item) => new Date(item.date_add).getFullYear() + 543)
                );
                setYears(extractedYears);
            } else {
                setEquipments([]);
                toast.error("ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            if (error.message.includes("401")) {
                toast.error("ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่");
                navigate("/login");
            } else {
                toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            }
            setEquipments([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]); // Dependency ที่ fetchSupplies ใช้จริงๆ

    useEffect(() => {
        fetchSupplies();

        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowPrintOptions(false);
                setShowYearFilter(false);
                setShowSortOptions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [fetchSupplies]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const buddhistYear = date.getFullYear() + 543;
        return date.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).replace(date.getFullYear(), buddhistYear);
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

    const selectedPDF = () => {
        if (selectedItems.size === 0) {
            toast.error("⚠️ โปรดเลือกอย่างน้อย 1 รายการ!");
            return;
        }

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.addFileToVFS("THSarabunNew.ttf", THSarabunNew);
        doc.addFileToVFS("THSarabunNew Bold.ttf", THSarabunNew_Bold);
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
        doc.addFont("THSarabunNew Bold.ttf", "THSarabunNew Bold", "normal");
        doc.setFont("THSarabunNew");

        doc.text("รายการพัสดุที่เลือก", 14, 10);

        const selectedData = equipments.filter(item => selectedItems.has(item.equipment_id));

        const tableData = selectedData.map((item, index) => [
            index + 1,
            item.equipment_name,
            item.spec,
            item.equipment_type,
            item.price.toLocaleString(),
            formatDate(item.date_add),
            item.location,
            item.quantity
        ]);

        autoTable(doc, {
            head: [["#", "ชื่อพัสดุ", "รุ่น/ลักษณะ", "ประเภท", "ราคา", "วันที่รับ", "ห้อง", "จำนวน"]],
            body: tableData,
            startY: 20,
            theme: 'grid',
            styles: {
                font: "THSarabunNew Bold",
                fontStyle: "normal",
                fontSize: 16,
                cellPadding: 5,
                fillColor: [255, 255, 255],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                halign: 'center',
                minCellHeight: 5,
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 50 },
                2: { cellWidth: 60 },
                3: { cellWidth: 35 },
                4: { cellWidth: 25 },
                5: { cellWidth: 30 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 },
            },
            headStyles: {
                font: "THSarabunNew Bold",
                fontStyle: "normal",
                halign: "center",
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontSize: 16,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            bodyStyles: {
                font: "THSarabunNew",
                fontStyle: "normal",
                fontSize: 14,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            didDrawCell: (data) => {
                if (data.section === 'head' || data.section === 'body') {
                    doc.setFont("THSarabunNew");
                }
            },
        });

        generateAndShowPDF(doc, "รายการพัสดุแบบเลือก");
    };

    const handlePrintAllPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.addFileToVFS("THSarabunNew.ttf", THSarabunNew);
        doc.addFileToVFS("THSarabunNew Bold.ttf", THSarabunNew_Bold);
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
        doc.addFont("THSarabunNew Bold.ttf", "THSarabunNew Bold", "normal");
        doc.setFont("THSarabunNew");

        doc.text("รายการพัสดุ", 14, 10);

        const tableData = equipments.map((item, index) => [
            index + 1,
            item.equipment_name,
            item.spec,
            item.equipment_type,
            item.price.toLocaleString(),
            formatDate(item.date_add),
            item.location,
            item.quantity
        ]);

        autoTable(doc, {
            head: [["#", "ชื่อพัสดุ", "รุ่น/ลักษณะ", "ประเภท", "ราคา", "วันที่รับ", "ห้อง", "จำนวน"]],
            body: tableData,
            startY: 20,
            theme: 'grid',
            styles: {
                font: "THSarabunNew Bold",
                fontStyle: "normal",
                fontSize: 16,
                cellPadding: 5,
                fillColor: [255, 255, 255],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                halign: 'center',
                minCellHeight: 5,
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 50 },
                2: { cellWidth: 60 },
                3: { cellWidth: 35 },
                4: { cellWidth: 25 },
                5: { cellWidth: 30 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 },
            },
            headStyles: {
                font: "THSarabunNew Bold",
                fontStyle: "normal",
                halign: "center",
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontSize: 16,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            bodyStyles: {
                font: "THSarabunNew",
                fontStyle: "normal",
                fontSize: 14,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            didDrawCell: (data) => {
                if (data.section === 'head' || data.section === 'body') {
                    doc.setFont("THSarabunNew");
                }
            }
        });

        generateAndShowPDF(doc, "รายการพัสดุทั้งหมด");
        setShowPrintOptions(false);
    };

    const handlePrintYearPDF = () => {
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

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.addFileToVFS("THSarabunNew.ttf", THSarabunNew);
        doc.addFileToVFS("THSarabunNew Bold.ttf", THSarabunNew_Bold);
        doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
        doc.addFont("THSarabunNew Bold.ttf", "THSarabunNew Bold", "normal");
        doc.setFont("THSarabunNew");

        doc.text(`รายการพัสดุของปี ${selectedYear}`, 14, 10);

        const tableData = filteredData.map((item, index) => [
            index + 1,
            item.equipment_name,
            item.spec,
            item.equipment_type,
            item.price.toLocaleString(),
            formatDate(item.date_add),
            item.location,
            item.quantity
        ]);

        autoTable(doc, {
            head: [["#", "ชื่อพัสดุ", "รุ่น/ลักษณะ", "ประเภท", "ราคา", "วันที่รับ", "ห้อง", "จำนวน"]],
            body: tableData,
            startY: 20,
            theme: 'grid',
            styles: {
                font: "THSarabunNew Bold",
                fontStyle: "normal",
                fontSize: 16,
                cellPadding: 5,
                fillColor: [255, 255, 255],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                halign: 'center',
                minCellHeight: 5,
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 50 },
                2: { cellWidth: 60 },
                3: { cellWidth: 35 },
                4: { cellWidth: 25 },
                5: { cellWidth: 30 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 },
            },
            headStyles: {
                font: "THSarabunNew Bold",
                fontStyle: "normal",
                halign: "center",
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontSize: 16,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            bodyStyles: {
                font: "THSarabunNew",
                fontStyle: "normal",
                fontSize: 14,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            didDrawCell: (data) => {
                if (data.section === 'head' || data.section === 'body') {
                    doc.setFont("THSarabunNew");
                }
            },
        });

        generateAndShowPDF(doc, `รายการพัสดุ-ปี${selectedYear}`);
        setShowYearFilter(false);
    };

    const sortData = (data) => {
        if (!sortConfig.field) return data;

        return [...data].sort((a, b) => {
            if (sortConfig.field === 'price') {
                return sortConfig.direction === 'asc'
                    ? a[sortConfig.field] - b[sortConfig.field]
                    : b[sortConfig.field] - a[sortConfig.field];
            }

            if (sortConfig.field === 'date_add') {
                return sortConfig.direction === 'asc'
                    ? new Date(a[sortConfig.field]) - new Date(b[sortConfig.field])
                    : new Date(b[sortConfig.field]) - new Date(a[sortConfig.field]);
            }

            return sortConfig.direction === 'asc'
                ? String(a[sortConfig.field]).localeCompare(String(b[sortConfig.field]))
                : String(b[sortConfig.field]).localeCompare(String(a[sortConfig.field]));
        });
    };

    const filteredEquipments = sortData(
        Array.isArray(equipments)
            ? equipments.filter((item) =>
                item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : []
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredEquipments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage);

    const handleDelete = async (equipment_id) => {
        if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบพัสดุนี้?")) {
            setIsDeleting(true);
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/${equipment_id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    toast.success("ลบพัสดุสำเร็จ!");
                    setEquipments(equipments.filter((item) => item.equipment_id !== equipment_id));
                } else {
                    toast.error("เกิดข้อผิดพลาดในการลบพัสดุ");
                }
            } catch (error) {
                console.error("Error deleting equipment:", error);
                toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
            } finally {
                setIsDeleting(false);
            }
        }
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
                        <Link to="/equipment" className="flex items-center p-2 rounded-lg hover:bg-sidebarHover w-full text-left">
                            <Archive className="w-5 h-5 mr-3" /> ครุภัณฑ์
                        </Link>
                    </li>
                    <li>
                        <Link to="/supplies" className="flex items-center p-2 rounded-lg bg-sidebarHover hover:bg-sidebarHover w-full text-left">
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
                <div className="mb-4 flex justify-end items-center">
                    <div className="flex space-x-3">
                        {selectedItems.size > 0 && (
                            <button onClick={selectedPDF} className="px-4 py-2 bg-blue-500 text-white rounded shadow flex items-center h-10">
                                <Printer className="w-5 h-5 mr-2" /> พิมพ์ PDF รายการที่เลือก
                            </button>
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
                        <button onClick={() => navigate("/supplies/addSupplies")} className="px-4 py-2 bg-green-500 text-white rounded shadow flex items-center h-10">
                            <ClipboardPlus className="w-5 h-5 mr-2" /> เพิ่มพัสดุ
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
                        <div className="relative">
                            <button
                                onClick={() => setShowSortOptions(!showSortOptions)}
                                className="flex items-center px-3 py-2 bg-white border rounded-lg shadow hover:bg-gray-50"
                                title="เรียงข้อมูล"
                            >
                                <ArrowUpDown className="w-5 h-5 text-gray-600" />
                            </button>
                            {showSortOptions && (
                                <div ref={popupRef} className="absolute z-10 w-48 mt-2 bg-white rounded-md shadow-lg">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setSortConfig({ field: 'equipment_name', direction: 'asc' });
                                                setShowSortOptions(false);
                                            }}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            เรียงตามชื่อ A-Z
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortConfig({ field: 'equipment_name', direction: 'desc' });
                                                setShowSortOptions(false);
                                            }}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            เรียงตามชื่อ Z-A
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortConfig({ field: 'price', direction: 'asc' });
                                                setShowSortOptions(false);
                                            }}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            ราคาน้อยไปมาก
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortConfig({ field: 'price', direction: 'desc' });
                                                setShowSortOptions(false);
                                            }}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            ราคามากไปน้อย
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortConfig({ field: 'date_add', direction: 'desc' });
                                                setShowSortOptions(false);
                                            }}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            วันที่ล่าสุด
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortConfig({ field: 'date_add', direction: 'asc' });
                                                setShowSortOptions(false);
                                            }}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            วันที่เก่าสุด
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                <tr className="bg-blue-500 text-white">
                                    <th className="p-2"></th>
                                    <th className="p-2 text-left">รายการ</th>
                                    <th className="p-2 text-left">รุ่น ลักษณะ</th>
                                    <th className="p-2 text-left">ประเภท</th>
                                    <th className="p-2 text-left">ราคา</th>
                                    <th className="p-2 text-left">วันที่ตรวจรับ</th>
                                    <th className="p-2 text-left">ห้อง</th>
                                    <th className="p-2 text-left">จำนวน</th>
                                    <th className="border-gray-300 p-2">การจัดการ</th>
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
                                            <td className="p-2">{item.equipment_name}</td>
                                            <td className="p-2">{item.spec}</td>
                                            <td className="p-2">{item.equipment_type}</td>
                                            <td className="p-2">{item.price}</td>
                                            <td className="p-2">{formatDate(item.date_add)}</td>
                                            <td className="p-2">{item.location}</td>
                                            <td className="p-2">{item.quantity}</td>
                                            <td className="border-gray-300 p-2 text-center">
                                                <Link to={`/supplies/editSupplies/${item.equipment_id}`} className="text-blue-500 hover:text-blue-700 mx-2">
                                                    <Pencil className="inline-block w-5 h-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(item.equipment_id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    disabled={isDeleting}
                                                >
                                                    <Trash className={`inline-block w-5 h-5 ${isDeleting ? 'opacity-50' : ''}`} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="8" className="text-center text-gray-500 p-4">ไม่พบข้อมูล</td></tr>
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

export default Supplies;