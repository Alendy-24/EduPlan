import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Process from "./components/Process";
import Footer from "./components/Footer";
import InstitutionsPage from "./pages/InstitutionsPage";
import "./App.css";

function currentPage() {
    return window.location.hash === "#/instituciones" ? "instituciones" : "inicio";
}

function App() {
    const [page, setPage] = useState(currentPage);

    useEffect(() => {
        const onRouteChange = () => setPage(currentPage());
        window.addEventListener("hashchange", onRouteChange);
        return () => window.removeEventListener("hashchange", onRouteChange);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);

    return (
        <div className="app">
            <Navbar currentPage={page} />
            {page === "instituciones" ? (
                <InstitutionsPage />
            ) : (
                <>
                    <Hero />
                    <Features />
                    <Process />
                </>
            )}
            <Footer />
        </div>
    );
}

export default App;
