import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../context/ChatContext';
import { AppHeader } from './AppHeader';
import { SettingsModal } from '../home/SettingsModal';
import { AdminPanel } from '../../../apps/magnus/components/admin/AdminPanel';
import { BroadcastManager } from './BroadcastManager';

interface MasterLayoutProps {
    children: React.ReactNode;
    SidebarComponent: React.ComponentType<any>;
    currentApp: 'magnus' | 'finanza' | 'auditor';
    navItems: any[];
    onNavigate?: (path: string) => void;
    onOpenAdmin?: () => void; // Made optional prop
}

export const MasterLayout: React.FC<MasterLayoutProps> = ({
    children,
    SidebarComponent,
    currentApp,
    navItems,
    onNavigate,
    onOpenAdmin
}) => {
    const { user, logout, updateUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { openChat } = useChat();

    // Global Modals State
    const [showSettings, setShowSettings] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false); // Restored showAdmin state

    const handleOpenAdmin = () => {
        if (onOpenAdmin) {
            onOpenAdmin();
        } else {
            setShowAdmin(true);
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200 font-sans relative selection:bg-theme-gold selection:text-black">

            {/* Sidebar Injection */}
            <SidebarComponent
                isDark={theme === 'dark'}
                toggleTheme={toggleTheme}
                user={user}
                onLogout={logout}
                onEditProfile={() => setShowSettings(true)}
                onOpenAdmin={handleOpenAdmin} // Propagate prop or no-op
                currentView={navItems.find(i => i.isActive)?.id}
                onNavigate={onNavigate}
            />

            <main className="flex-1 overflow-y-auto h-screen w-full relative scroll-smooth">
                <AppHeader
                    user={user}
                    isAdmin={user?.role === 'admin'}
                    onOpenAdmin={handleOpenAdmin}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenChat={openChat}
                    onLogout={logout}
                    currentApp={currentApp}
                    navItems={navItems}
                />

                {children}

                {/* Global Modals */}
                {showSettings && user && (
                    <SettingsModal
                        user={user}
                        isOpen={showSettings}
                        onClose={() => setShowSettings(false)}
                        onUpdateUser={(updated) => updateUser(updated)}
                    />
                )}

                {showAdmin && user && (
                    <AdminPanel
                        currentUser={user}
                        onClose={() => setShowAdmin(false)}
                    />
                )}

            </main>

            {/* Global Broadcast Overlay - Managed at App.tsx level now */}
        </div>
    );
};
