import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import headerLogo from "../header.png";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Login failed");

            localStorage.setItem("token", data.token); // 🔥 เก็บ Token ลง LocalStorage
            navigate("/dashboard"); // ✅ ไปที่ Dashboard หลังล็อกอินสำเร็จ
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <header className="w-full h-28 md:h-28 lg:h-28 bg-white shadow-md flex items-center justify-center">
                <img
                    src={headerLogo}
                    alt="Company Logo"
                    className="max-w-full h-28"
                />
            </header>

            <div className="flex-1 flex justify-center items-center">
                <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-md w-96">
                    <h2 className="text-2xl font-bold mb-4">Login</h2>
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 mb-2 border rounded"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 mb-2 border rounded"
                        required
                    />
                    <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
