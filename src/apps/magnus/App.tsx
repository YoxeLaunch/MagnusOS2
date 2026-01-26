import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const MentorshipRoom = lazy(() => import('./components/MentorshipRoom').then(module => ({ default: module.MentorshipRoom })));
const Laboratory = lazy(() => import('./components/Laboratory').then(module => ({ default: module.Laboratory })));
const StyleLab = lazy(() => import('./pages/StyleLab').then(module => ({ default: module.StyleLab })));
// const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));

import { authService } from '../../shared/services/auth';
import { ViewState } from './types';
import { User } from '../../shared/types/user';
import { useTheme } from '../../shared/context/ThemeContext';
import { AppHeader } from '../../shared/components/layout/AppHeader';
import { MasterLayout } from '../../shared/components/layout/MasterLayout';
import { NAV_ITEMS } from './constants';
import { useChat } from '../../shared/context/ChatContext';
import { useAuth } from '../../shared/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
    <span className="text-sm">Cargando módulo...</span>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openChat } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam && Object.values(ViewState).includes(viewParam as ViewState)) {
      setCurrentView(viewParam as ViewState);
    }
  }, [location]);

  // Modals
  const [showAdmin, setShowAdmin] = useState(false);

  // Auth check handled by Main App via Context

  const handleLogout = () => {
    logout();
    // No need to navigate manually if App.tsx handles redirect, but good for safety
  };

  const renderView = () => {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch (currentView) {
            case ViewState.DASHBOARD:
              return <Dashboard onNavigate={(view) => setCurrentView(view)} />;
            case ViewState.WAR_ROOM:
              return <MentorshipRoom user={user} />;
            case ViewState.LABORATORY:
              return <Laboratory />;
            case ViewState.STYLE_LAB:
              return <StyleLab onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
            case ViewState.STYLE_LAB:
              return <StyleLab onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
            case ViewState.MINDSET:
              return (
                <div className="flex items-center justify-center h-full text-slate-500 font-serif">
                  <div className="text-center">
                    <h2 className="text-2xl text-slate-900 dark:text-white mb-2">MODULO EN CONSTRUCCIÓN</h2>
                    <p>La arquitectura mental requiere tiempo.</p>
                  </div>
                </div>
              );
            default:
              return <Dashboard onNavigate={(view) => setCurrentView(view)} />;
          }
        })()}
      </Suspense>
    );
  };

  if (!user) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Cargando perfil...</div>;

  return (
    <ErrorBoundary>
      <MasterLayout
        SidebarComponent={Sidebar}
        currentApp="magnus"
        navItems={NAV_ITEMS.map(item => ({
          label: item.label,
          icon: item.icon,
          id: item.id,
          onClick: () => setCurrentView(item.id),
          isActive: currentView === item.id
        }))}
        onNavigate={(id) => setCurrentView(id as ViewState)}
      >
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </MasterLayout>
    </ErrorBoundary>
  );
}

export default App;