import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import headerLogo from "../header.png";
import backgroundImage from "../bg-it.jpg";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false); // เพิ่ม loading state
    const navigate = useNavigate();

    // ลบ token เมื่อเข้ามาที่หน้า login
    useEffect(() => {
        if (localStorage.getItem("token")) {
            console.log("Found existing token, removing...");
            localStorage.removeItem("token");
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        console.time("Login Request");

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }, // ไม่ส่ง Authorization
                body: JSON.stringify({ email, password }),
                timeout: 30000, // Timeout 30 วินาที (ถ้า browser รองรับ)
            });
            const data = await response.json();
            console.timeEnd("Login Request");

            if (!response.ok) throw new Error(data.error || "Login failed");

            localStorage.setItem("token", data.token);
            console.log("Token set, navigating to dashboard...");
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex flex-col h-screen"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <header className="w-full h-28 md:h-28 lg:h-28 bg-white shadow-md flex items-center justify-center">
                <img src={headerLogo} alt="Company Logo" className="max-w-full h-28" />
            </header>

            <div className="flex-1 flex justify-center items-center">
                <form
                    onSubmit={handleLogin}
                    className="bg-white bg-opacity-90 p-6 rounded-lg shadow-md w-96"
                >
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Login</h2>
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 mb-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 mb-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;