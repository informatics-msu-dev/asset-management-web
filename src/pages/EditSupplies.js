import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";

const EditSupplies = () => {
    const navigate = useNavigate();
    const { equipment_id } = useParams();
    
    const [formData, setFormData] = useState({
        equipment_name: "",
        spec: "",
        equipment_type: "",
        price: "",
        date_add: "",
        location: "",
        quantity: "",
        user_id: "",
    });

    const [apiData, setApiData] = useState(null); // ✅ ใช้เพื่อเก็บข้อมูลจาก API

    useEffect(() => {
        const token = localStorage.getItem("token");
        
        if (!token) {
            toast.error("กรุณาเข้าสู่ระบบ");
            navigate("/login");
            return;
        }

        const fetchSupplyData = async (token) => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/${equipment_id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    toast.error("ไม่พบข้อมูลพัสดุ");
                    return;
                }

                const result = await response.json();

                if (result && result.data) {
                    setApiData(result.data);
                }
            } catch (error) {
                console.error("Error fetching supply:", error);
                toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
            }
        };

        try {
            const decoded = jwtDecode(token);
            setFormData(prev => ({ ...prev, user_id: decoded.user_id }));
            fetchSupplyData(token);
        } catch (error) {
            console.error("Invalid token:", error);
            toast.error("Token ไม่ถูกต้อง โปรดเข้าสู่ระบบใหม่");
            navigate("/login");
        }
    }, [equipment_id, navigate]);

    useEffect(() => {
        if (apiData) {
            setFormData(prev => ({
                ...prev,
                ...apiData,
                date_add: apiData.date_add ? apiData.date_add.split('T')[0] : "",
            }));
        }
    }, [apiData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/${equipment_id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    type: "พัสดุ",
                }),
            });

            if (response.ok) {
                toast.success("แก้ไขพัสดุสำเร็จ!");
                setTimeout(() => navigate("/supplies"), 1500);
            } else {
                toast.error("เกิดข้อผิดพลาดในการแก้ไขพัสดุ");
            }
        } catch (error) {
            console.error("Error updating equipment:", error);
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
    };

    return (
        <div className="flex flex-col items-center bg-yellow-50 min-h-screen p-8">
            <nav className="bg-white shadow-md rounded-lg p-3 mb-6 w-full max-w-4xl">
                <ol className="flex items-center text-gray-600 space-x-2">
                    <li>
                        <Link to="/supplies" className="hover:text-blue-500">พัสดุ</Link>
                    </li>
                    <li>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </li>
                    <li className="text-gray-800 font-semibold">แก้ไขพัสดุ</li>
                </ol>
            </nav>

            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
                <h2 className="text-2xl font-bold mb-4 text-center">แก้ไขพัสดุ</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="equipment_name" value={formData.equipment_name} placeholder="ชื่อพัสดุ" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="spec" value={formData.spec} placeholder="รุ่น ลักษณะ" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="equipment_type" value={formData.equipment_type} placeholder="ประเภท" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="number" name="price" value={formData.price} placeholder="ราคา" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="date" name="date_add" value={formData.date_add} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="location" value={formData.location} placeholder="ห้อง" onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="number" name="quantity" value={formData.quantity} placeholder="จำนวน" onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>

                    <div className="flex justify-end mt-6">
                        <button type="button" onClick={() => navigate("/supplies")} className="px-4 py-2 bg-red-500 text-white rounded shadow mr-2">
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

export default EditSupplies;
