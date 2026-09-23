import { Routes, Route } from "react-router-dom";
import Landing from "../pages/landing";
import Register from "../pages/register";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import InstitutionsPage from "../pages/InstitutionsPage";

function InstitutionsRoute() {
    return (
        <div className="app">
            <Navbar />
            <InstitutionsPage />
            <Footer />
        </div>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/instituciones" element={<InstitutionsRoute />} />
        </Routes>
    );
}

export default AppRoutes;
