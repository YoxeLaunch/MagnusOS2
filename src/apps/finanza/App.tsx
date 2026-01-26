import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DataProvider } from './context/DataContext';

// Lazy Load Pages to reduce bundle size
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const CashFlow = lazy(() => import('./pages/CashFlow').then(module => ({ default: module.CashFlow })));
const Wealth = lazy(() => import('./pages/Wealth').then(module => ({ default: module.Wealth })));
const Tracking = lazy(() => import('./pages/Tracking').then(module => ({ default: module.Tracking })));
const Projections = lazy(() => import('./pages/Projections').then(module => ({ default: module.Projections })));
const PrintReport = lazy(() => import('./pages/PrintReport').then(module => ({ default: module.PrintReport })));
const Investments = lazy(() => import('./pages/Investments').then(module => ({ default: module.Investments })));
// New P1 Pages
const Accounts = lazy(() => import('./pages/Accounts').then(module => ({ default: module.Accounts })));
// New P2 Pages
const Savings = lazy(() => import('./pages/Savings').then(module => ({ default: module.Savings })));
const Ledger = lazy(() => import('./pages/Ledger').then(module => ({ default: module.Ledger })));
// New P3 Pages
const Import = lazy(() => import('./pages/Import').then(module => ({ default: module.Import })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="p-4 rounded-xl bg-card border border-border animate-pulse flex flex-col items-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
      <span className="text-sm text-gray-500">Cargando módulo...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <DataProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="print" element={<PrintReport />} />
          <Route path="*" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="flujo" element={<CashFlow />} />
                  <Route path="patrimonio" element={<Wealth />} />
                  <Route path="inversiones" element={<Investments />} />
                  <Route path="seguimiento" element={<Tracking />} />
                  <Route path="proyecciones" element={<Projections />} />
                  <Route path="cuentas" element={<Accounts />} />
                  <Route path="ahorros" element={<Savings />} />
                  <Route path="libro-mayor" element={<Ledger />} />
                  <Route path="importar" element={<Import />} />
                  <Route path="*" element={<Navigate to="." replace />} />
                </Routes>
              </Suspense>
            </Layout>
          } />
        </Routes>
      </Suspense>
    </DataProvider>
  );
};

export default App;