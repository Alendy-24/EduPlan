import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/Routes";

import { AuthProvider } from "./contexts/AuthContext";
import { ExplorationProvider } from "./contexts/ExplorationContext";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider><ExplorationProvider><AppRoutes /></ExplorationProvider></AuthProvider>
        </BrowserRouter>
    );
}

export default App;
