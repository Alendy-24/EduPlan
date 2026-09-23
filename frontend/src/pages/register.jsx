import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterForm from "../components/RegisterForm";
import "./register.css";

function Register() {
    return (
        <div className="register-page-wrapper">
            <Navbar />
            <main className="register-main">
                <RegisterForm />
            </main>
            <Footer />
        </div>
    );
}

export default Register;