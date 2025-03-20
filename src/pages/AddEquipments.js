import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";

const AddEquipments = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        startEquipmentNo: "",
        equipment_name: "",
        spec: "",
        equipment_type: "",
        price: "",
        date_add: "",
        location: "",
        quantity: "",
        user_id: "", // เริ่มต้นว่างไว้
    });

    // ✅ ดึง user_id จาก Token เมื่อโหลดหน้า
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setFormData((prev) => ({
                    ...prev,
                    user_id: decoded.user_id, // ใช้ user_id จาก Token
                }));
            } catch (error) {
                console.error("Invalid token:", error);
                toast.error("Token ไม่ถูกต้อง โปรดเข้าสู่ระบบใหม่");
                navigate("/login");
            }
        } else {
            toast.error("กรุณาเข้าสู่ระบบ");
            navigate("/login");
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    type: "ครุภัณฑ์",
                }),
            });

            if (response.ok) {
                toast.success("เพิ่มครภัณฑ์สำเร็จ!");
                setTimeout(() => navigate("/equipment"), 1500);
            } else {
                toast.error("เกิดข้อผิดพลาดในการเพิ่มครภัณฑ์");
            }
        } catch (error) {
            console.error("Error adding equipment:", error);
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
    };


    return (
        <div className="flex flex-col items-center bg-yellow-50 min-h-screen p-8">
            {/* Breadcrumbs */}
            <nav className="bg-white shadow-md rounded-lg p-3 mb-6 w-full max-w-4xl">
                <ol className="flex items-center text-gray-600 space-x-2">
                    <li>
                        <Link to="/equipment" className="hover:text-blue-500">ครุภัณฑ์</Link>
                    </li>
                    <li>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </li>
                    <li className="text-gray-800 font-semibold">เพิ่มครุภัณฑ์</li>
                </ol>
            </nav>

            {/* ฟอร์มเพิ่มพัสดุ */}
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
                <h2 className="text-2xl font-bold mb-4 text-center">เพิ่มครุภัณฑ์</h2>
                <form onSubmit={handleSubmit}>
                    {/* Grid Layout */}
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="startEquipmentNo" placeholder="เลขครุภัณฑ์" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="equipment_name" placeholder="ชื่อครุภัณฑ์" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="spec" placeholder="รุ่น ลักษณะ" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <select name="equipment_type" onChange={handleChange} className="w-full p-2 border rounded" required>
                            <option value="">---หน่วยงาน---</option>
                            <option value="ฝ่ายไอที">ฝ่ายไอที</option>
                            <option value="ฝ่ายโสต">ฝ่ายโสต</option>
                        </select>
                        <input type="number" name="price" placeholder="ราคา" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="date" name="date_add" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="location" placeholder="ห้อง" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="number" name="quantity" placeholder="จำนวน" onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>

                    {/* ปุ่มบันทึก & ยกเลิก */}
                    <div className="flex justify-end mt-6">
                        <button type="button" onClick={() => navigate("/equipment")} className="px-4 py-2 bg-red-500 text-white rounded shadow mr-2">
                            ยกเลิก
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded shadow">
                            บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEquipments;
