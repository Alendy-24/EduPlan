import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Process from "../components/Process";
import Footer from "../components/Footer";
import "../App.css";

function App() {
    return (
        <div className="app">
            <Navbar />
            <Hero />
            <Features />
            <Process />
            <Footer />
        </div>
    );
}

export default App;