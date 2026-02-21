import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { DockerProvider } from "./context/DockerContext";
import { ErrorBoundary } from "../../shared/components/ErrorBoundary";

export default function ServerAdminApp() {
    return (
        <ErrorBoundary>
            <DockerProvider>
                <div className="min-h-screen bg-[#0a0f1c] text-white font-sans selection:bg-cyan-500/30">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </DockerProvider>
        </ErrorBoundary>
    );
}
