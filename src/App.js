import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import Supplies from "./pages/Supplies";
import AddSupplies from "./pages/AddSupplies";
import AddEquipments from "./pages/AddEquipments";
import EditEquipment from "./pages/EditEquipments";
import EditSupplies from "./pages/EditSupplies";
import RegisterUser from "./pages/RegisterUser";
import AdminInfo from "./pages/AdminInfo";
import { Toaster } from "sonner"; // ✅ Import Toaster

const App = () => {
  return (
    <Router>
      <Toaster position="top-center" richColors /> {/* ✅ เพิ่ม Toaster ไว้นอก <Routes> */}
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/supplies" element={<Supplies />} />
        <Route path="/registerUser" element={<RegisterUser />} />
        <Route path="/adminInfo" element={<AdminInfo />} />
        <Route path="/supplies/addSupplies" element={<AddSupplies />} />
        <Route path="/equipment/addEquipments" element={<AddEquipments />} />
        <Route path="/equipment/editEquipments/:equipment_id" element={<EditEquipment />} />
        <Route path="/supplies/editSupplies/:equipment_id" element={<EditSupplies />} />
      </Routes>
    </Router>
  );
};

export default App;
