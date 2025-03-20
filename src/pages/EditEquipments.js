import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

const EditEquipments = () => {
    const navigate = useNavigate();
    const { equipment_id } = useParams();
    const [formData, setFormData] = useState({
        equipment_id: "",
        equipment_name: "",
        spec: "",
        equipment_type: "",
        price: "",
        date_add: "",
        location: ""
    });

    const [apiData, setApiData] = useState(null);

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/equipment/${equipment_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const result = await response.json();
                if (response.ok && result.data) { 
                    setApiData(result.data);
                } else {
                    toast.error("ไม่พบข้อมูลครุภัณฑ์");
                    navigate("/equipment");
                }
            } catch (error) {
                console.error("Error fetching equipment data:", error);
                toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
            }
        };

        fetchEquipment();
    }, [equipment_id, navigate]);

    useEffect(() => {
        if (apiData) {
            setFormData(prev => ({
                ...prev,
                ...apiData,
                date_add: apiData.date_add ? apiData.date_add.split("T")[0] : "",
            }));
        }
    }, [apiData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
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
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success("อัปเดตข้อมูลสำเร็จ!");
                setTimeout(() => navigate("/equipment"), 1500);
            } else {
                toast.error("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
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
                    <li><Link to="/equipment" className="hover:text-blue-500">ครุภัณฑ์</Link></li>
                    <li><ChevronRight className="w-4 h-4 text-gray-400" /></li>
                    <li className="text-gray-800 font-semibold">แก้ไขครุภัณฑ์</li>
                </ol>
            </nav>

            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
                <h2 className="text-2xl font-bold mb-4 text-center">แก้ไขครุภัณฑ์</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="equipment_id" value={formData.equipment_id} onChange={handleChange} placeholder="เลขครุภัณฑ์" className="w-full p-2 border rounded" required />
                        <input type="text" name="equipment_name" value={formData.equipment_name} onChange={handleChange} placeholder="ชื่อครุภัณฑ์" className="w-full p-2 border rounded" required />
                        <input type="text" name="spec" value={formData.spec} onChange={handleChange} placeholder="รุ่น ลักษณะ" className="w-full p-2 border rounded" required />
                        <select name="equipment_type" value={formData.equipment_type} onChange={handleChange} className="w-full p-2 border rounded" required>
                            <option value="">---หน่วยงาน---</option>
                            <option value="ฝ่ายไอที">ฝ่ายไอที</option>
                            <option value="ฝ่ายโสต">ฝ่ายโสต</option>
                        </select>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="ราคา" className="w-full p-2 border rounded" required />
                        <input type="date" name="date_add" value={formData.date_add} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="ห้อง" className="w-full p-2 border rounded" required />
                    </div>

                    <div className="flex justify-end mt-6">
                        <button type="button" onClick={() => navigate("/equipment")} className="px-4 py-2 bg-red-500 text-white rounded shadow mr-2">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded shadow">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEquipments;