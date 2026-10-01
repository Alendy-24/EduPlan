import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/Routes";

import { AuthProvider } from "./contexts/AuthContext";
import { ExplorationProvider } from "./contexts/ExplorationContext";
import { AcademicProfileProvider } from './contexts/AcademicProfileContext';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider><AcademicProfileProvider><ExplorationProvider><AppRoutes /></ExplorationProvider></AcademicProfileProvider></AuthProvider>
        </BrowserRouter>
    );
}

export default App;
