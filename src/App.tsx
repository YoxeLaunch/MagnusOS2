import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

const FinanzaApp = lazy(() => import("./apps/finanza/App"));
const MagnusApp = lazy(() => import("./apps/magnus/App"));
const AuditorApp = lazy(() => import("./apps/auditor/App"));
import { Login } from "./shared/components/auth/Login";
import { Register } from "./shared/components/auth/Register";
import { Creator } from "./apps/magnus/components/Creator";
import { authService } from "./shared/services/auth";
import { User } from "./shared/types/user";
import { ThemeProvider, useTheme } from "./shared/context/ThemeContext";
import { Home } from "./shared/components/home/Home";
import { Landing } from "./apps/magnus/components/Landing";
import { ChatProvider, useChat } from "./shared/context/ChatContext";
import { BroadcastManager } from "./shared/components/layout/BroadcastManager";

import { ChatWidget } from "./shared/components/home/ChatWidget";
import { AuthProvider, useAuth } from "./shared/context/AuthContext";


function AppContent() {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const { isOpen: isChatOpen, closeChat } = useChat();

    const handleLoginSuccess = (u: User) => {
        login(u);
        navigate('/home'); // Redirect to dashboard after login
    };

    const handleLogout = () => {
        logout();
        navigate('/'); // Redirect to landing after logout
    };

    // Global Creator Modal State
    const [showCreator, setShowCreator] = useState(false);

    return (
        <>
            <Routes>
                {/* Public Landing (Disabled) */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Auth Routes */}
                <Route path="/login" element={
                    !user ? (
                        <Login
                            onLoginSuccess={handleLoginSuccess}
                            onNavigateToRegister={() => navigate('/register')}
                        />
                    ) : (
                        <Navigate to="/home" />
                    )
                } />
                <Route path="/register" element={
                    !user ? (
                        <Register
                            onRegisterSuccess={handleLoginSuccess}
                            onNavigateToLogin={() => navigate('/login')}
                        />
                    ) : (
                        <Navigate to="/home" />
                    )
                } />

                {/* Protected Routes */}
                <Route path="/home" element={
                    user ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
                } />



                <Route path="/finanza/*" element={
                    user ? (
                        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-lg">Cargando Finanzas...</div>}>
                            <FinanzaApp />
                        </Suspense>
                    ) : <Navigate to="/login" />
                } />

                <Route path="/magnus/*" element={
                    user ? (
                        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-lg">Cargando Magnus...</div>}>
                            <MagnusApp />
                        </Suspense>
                    ) : <Navigate to="/login" />
                } />

                <Route path="/auditor/*" element={
                    user ? (
                        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-lg">Cargando Auditoría...</div>}>
                            <AuditorApp />
                        </Suspense>
                    ) : <Navigate to="/login" />
                } />
            </Routes>

            {/* Global Creator Modal */}
            {showCreator && <Creator onClose={() => setShowCreator(false)} />}

            {/* Global Floating Action Button for Creator */}
            <button
                onClick={() => setShowCreator(true)}
                className="fixed bottom-20 right-20 z-[9999] p-3 rounded-full 
                        bg-slate-900/80 backdrop-blur-sm border border-theme-gold/30 text-theme-gold 
                        shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] 
                        hover:bg-theme-gold hover:text-black hover:border-theme-gold hover:scale-105 
                        transition-all duration-300 group opacity-0 hover:opacity-100"
                title="Acerca del Creador"
            >
                <div className="absolute inset-0 rounded-full bg-theme-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>
            </button>


            {/* Global Chat Widget */}
            {
                user && (
                    <ChatWidget
                        user={user}
                        isOpen={isChatOpen}
                        onClose={closeChat}
                    />
                )
            }

            {/* Global Broadcast System */}
            <BroadcastManager />
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <ChatProvider>
                        <AppContent />
                    </ChatProvider>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
