import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { ErrorBoundary } from "../../shared/components/ErrorBoundary";

export default function ServerAdminApp() {
    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-[#0b1020] text-white font-sans selection:bg-cyan-500/30">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
        </ErrorBoundary>
    );
}
