import { Routes, Route } from "react-router-dom";
import Landing from "../pages/landing";
import Register from "../pages/register";

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
        </Routes>
    );
}

export default AppRoutes;