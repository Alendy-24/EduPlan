import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/Routes";
import "./App.css";

function App() {
    return (
        // enrutamiento para moverse de pagina en pagina
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;