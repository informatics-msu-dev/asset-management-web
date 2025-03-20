import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, Archive, LogOut, UserCogIcon, Info, Trash2, Plus, ChartArea } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";

const RegisterUser = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
        work_role: "",
        role: "Viewer",  // Keep default role as Viewer but hide the selection
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showViewerInfo, setShowViewerInfo] = useState(false);
    const [showAdminInfo, setShowAdminInfo] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                toast.error("กรุณาเข้าสู่ระบบใหม่");
                localStorage.removeItem("token");
                navigate("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error status: ${response.status}`);
            }

            const data = await response.json();

            if (response.ok) {
                setUsers(data.data);
            }
        } catch (error) {
            toast.error("Failed to fetch users");

        }
    },[navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            toast.error("กรุณาเข้าสู่ระบบ");
            navigate("/login");
            return;
        }

        try {
            const decoded = jwtDecode(token);
            setCurrentUserId(decoded.full_name);
        } catch (error) {
            toast.error("token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
            localStorage.removeItem("token");
            navigate("/login");
            return;
        }

        fetchUsers();

    }, [navigate, fetchUsers]);

    const handleDeleteUser = async (user_id) => {
        const token = localStorage.getItem('token');

        if (user_id === currentUserId) {
            toast.error("ไม่สามารถลบบัญชีของตัวเองได้");
            return;
        }

        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/${user_id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    method: 'DELETE'
                });
                if (response.ok) {
                    toast.success("User deleted successfully");
                    fetchUsers();
                }
            } catch (error) {
                toast.error("Failed to delete user");
            }
        }
    };

    // Close tooltips when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => {
            setShowViewerInfo(false);
            setShowAdminInfo(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRoleChange = (role) => {
        setFormData(prev => ({
            ...prev,
            role: role
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("ลงทะเบียนสำเร็จ");
                setIsModalOpen(false);
                fetchUsers();
                setFormData({
                    email: "",
                    password: "",
                    full_name: "",
                    work_role: "",
                    role: "Viewer",
                });
            } else {
                const data = await response.json();
                toast.error(data.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    };

    // Add sorting function
    const sortData = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Add sort and filter logic
    const sortedAndFilteredUsers = React.useMemo(() => {
        let filteredUsers = [...users].filter(user =>
            Object.values(user).some(value =>
                value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

        if (sortConfig.key) {
            filteredUsers.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filteredUsers;
    }, [users, searchTerm, sortConfig]);

    return (
        <div className="flex bg-pageBG min-h-screen">
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
                        <Link to="/registerUser" className="flex items-center p-2 rounded-lg bg-sidebarHover hover:bg-sidebarHover w-full text-left">
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
            <main className="flex-1 ml-64 p-8 bg-yellow-50">
                <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">จัดการผู้ใช้งาน</h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="ค้นหาผู้ใช้..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border rounded-lg"
                            />
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-2" /> เพิ่มผู้ใช้งาน
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th onClick={() => sortData('full_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                        ชื่อ-นามสกุล {sortConfig.key === 'full_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => sortData('email')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                        อีเมล {sortConfig.key === 'email' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => sortData('work_role')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                        ตำแหน่ง {sortConfig.key === 'work_role' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => sortData('role')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                        สิทธิ์ {sortConfig.key === 'role' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedAndFilteredUsers.map((user) => (
                                    <tr key={user.user_id}>
                                        <td className="px-6 py-4">{user.full_name}</td>
                                        <td className="px-6 py-4">{user.email}</td>
                                        <td className="px-6 py-4">{user.work_role}</td>
                                        <td className="px-6 py-4">{user.role}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                {user.user_id !== currentUserId && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.user_id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">ลงทะเบียนผู้ใช้งาน</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">อีเมล</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">รหัสผ่าน</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ตำแหน่งงาน</label>
                                <input
                                    type="text"
                                    name="work_role"
                                    value={formData.work_role}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded mt-1"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">สิทธิ์การใช้งาน</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        {showAdvanced ? "ซ่อน" : "แสดง"}การจัดการระดับสูง
                                    </button>
                                </div>
                                <div className={showAdvanced ? "" : "hidden"}>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2 relative">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="Viewer"
                                                checked={formData.role === "Viewer"}
                                                onChange={() => handleRoleChange("Viewer")}
                                                className="w-4 h-4"
                                            />
                                            <label>Viewer</label>
                                            <div className="relative inline-block">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowViewerInfo(!showViewerInfo);
                                                        setShowAdminInfo(false);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded-full"
                                                >
                                                    <Info size={16} className="text-gray-600" />
                                                </button>
                                                {showViewerInfo && (
                                                    <div className="absolute left-0 top-8 bg-black text-white p-2 rounded text-sm w-48 z-10">
                                                        สามารถดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 relative">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="Administrator"
                                                checked={formData.role === "Administrator"}
                                                onChange={() => handleRoleChange("Administrator")}
                                                className="w-4 h-4"
                                            />
                                            <label>Administrator</label>
                                            <div className="relative inline-block">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAdminInfo(!showAdminInfo);
                                                        setShowViewerInfo(false);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded-full"
                                                >
                                                    <Info size={16} className="text-gray-600" />
                                                </button>
                                                {showAdminInfo && (
                                                    <div className="absolute left-0 top-8 bg-black text-white p-2 rounded text-sm w-48 z-10">
                                                        สามารถจัดการระบบได้ทั้งหมด รวมถึงการเพิ่ม แก้ไข ลบข้อมูล
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                            >
                                ลงทะเบียน
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterUser;