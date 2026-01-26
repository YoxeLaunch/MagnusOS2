import React from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuditorPanel } from './components/AuditorPanel';
import { MasterLayout } from '../../shared/components/layout/MasterLayout';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { ClipboardList } from 'lucide-react';

import { Sidebar } from './components/Sidebar';

function AuditorApp() {
    const [searchParams] = useSearchParams();
    const currentView = searchParams.get('view') || 'emergencies';

    const NAV_ITEMS = [
        {
            id: 'emergencies',
            label: 'Emergencias',
            icon: ClipboardList,
            isActive: currentView === 'emergencies',
            onClick: () => window.location.href = '/auditor?view=emergencies'
        },
        {
            id: 'records',
            label: 'Expedientes',
            icon: ClipboardList,
            isActive: currentView === 'records',
            onClick: () => window.location.href = '/auditor?view=records'
        }
    ];

    return (
        <ErrorBoundary>
            <MasterLayout
                SidebarComponent={Sidebar}
                currentApp="auditor"
                navItems={NAV_ITEMS}
                onNavigate={() => { }}
            >
                <Routes>
                    <Route index element={<AuditorPanel />} />
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </MasterLayout>
        </ErrorBoundary>
    );
}

export default AuditorApp;
