import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  Globe,
  ShieldCheck,
  RefreshCw,
  Sliders,
  DollarSign,
  Euro,
  X,
  ExternalLink,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { FxCurrency, FxIntelligenceTab } from './types';
import { useFxIntelligence } from './hooks/useFxIntelligence';
import { FxMarketPanel } from './components/FxMarketPanel';
import { FxForecastPanel } from './components/FxForecastPanel';
import { FxRiskPanel } from './components/FxRiskPanel';
import { FxResearchLab } from './components/FxResearchLab';
import { FxMacroPanel } from './components/FxMacroPanel';
import { FxDataQualityPanel } from './components/FxDataQualityPanel';
import { ProvidenceErrorBoundary } from './components/ProvidenceErrorBoundary';
import { FxRatesResponse } from '../../types';
import { apiFetch } from '../../../../shared/utils/apiFetch';

interface ProvidenceFxIntelligenceProps {
  initialCurrency?: FxCurrency;
  initialTab?: FxIntelligenceTab;
  onClose?: () => void;
  isModal?: boolean;
}

export const ProvidenceFxIntelligence: React.FC<ProvidenceFxIntelligenceProps> = ({
  initialCurrency = 'USD',
  initialTab = 'mercado',
  onClose,
  isModal = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const {
    activeCurrency,
    setActiveCurrency,
    activeTab,
    setActiveTab,
    selectedModelId,
    setSelectedModelId,
    selectedHorizon,
    setSelectedHorizon,
    models,
    modelsLoading,
    forecast,
    forecastLoading,
    forecastError,
    fetchForecast,
    riskData,
    riskLoading,
    riskError,
    fetchRisk,
    experiments,
    experimentsLoading,
    experimentsError,
    fetchExperiments,
    dataQuality,
    qualityLoading,
    qualityError,
    fetchQuality,
    benchmarkRunning,
    triggerBenchmarkRun
  } = useFxIntelligence(initialCurrency);

  // Set initial tab on mount
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, setActiveTab]);

  // Market live data (for Mercado tab)
  const [marketData, setMarketData] = useState<FxRatesResponse | null>(null);
  const [marketLoading, setMarketLoading] = useState<boolean>(false);

  const fetchMarketRates = async (currency: FxCurrency) => {
    try {
      setMarketLoading(true);
      const endpoint = currency === 'EUR' ? '/api/markets/fx/eur-dop' : '/api/markets/fx/usd-dop';
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        setMarketData(json);
      }
    } catch (err: any) {
      console.warn('[ProvidenceFxIntelligence] Market fetch warning:', err.message);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketRates(activeCurrency);
  }, [activeCurrency]);

  const handleGlobalRefresh = () => {
    fetchMarketRates(activeCurrency);
    if (activeTab === 'pronosticos') {
      fetchForecast(activeCurrency, selectedModelId, selectedHorizon);
    } else if (activeTab === 'riesgo') {
      fetchRisk(activeCurrency);
    } else if (activeTab === 'laboratorio') {
      fetchExperiments(activeCurrency);
    } else if (activeTab === 'calidad') {
      fetchQuality();
    }
  };

  const tabs: { id: FxIntelligenceTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'mercado', label: 'Mercado', icon: <TrendingUp size={15} /> },
    { id: 'pronosticos', label: 'Pronósticos', icon: <Sparkles size={15} />, badge: 'ARIMA' },
    { id: 'riesgo', label: 'Riesgo & Volatilidad', icon: <Activity size={15} />, badge: 'GARCH' },
    { id: 'laboratorio', label: 'Laboratorio Cuantitativo', icon: <Layers size={15} /> },
    { id: 'macro', label: 'Macroeconomía', icon: <Globe size={15} />, badge: 'BCRD' },
    { id: 'calidad', label: 'Calidad de Datos', icon: <ShieldCheck size={15} /> }
  ];

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-neutral-950 text-slate-100 flex flex-col p-2 sm:p-4'
    : `w-full text-slate-100 flex flex-col ${isModal ? 'max-h-[92vh]' : 'min-h-[700px]'}`;

  return (
    <div className={containerClasses}>
      {/* Header Institucional de Providence FX Intelligence */}
      <div className="bg-neutral-950/90 border-b border-neutral-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-950/50 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Sparkles size={20} className="text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                PROVIDENCE FX INTELLIGENCE
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono font-bold tracking-wider">
                NIVEL 3 CUANTITATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Terminal de Inteligencia Cambiaria & Motor Econométrico de Series Temporales
            </p>
          </div>
        </div>

        {/* Controles de Divisa, Pantalla Completa y Cierre */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          {/* Selector de Divisa */}
          <div className="flex rounded-xl bg-neutral-900 p-1 border border-neutral-800 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setActiveCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCurrency === 'USD'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign size={13} />
              <span>USD / DOP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCurrency('EUR')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCurrency === 'EUR'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Euro size={13} />
              <span>EUR / DOP</span>
            </button>
          </div>

          {/* Botón Refresco Global */}
          <button
            type="button"
            onClick={handleGlobalRefresh}
            title="Actualizar datos"
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={marketLoading || forecastLoading || riskLoading ? 'animate-spin text-cyan-400' : ''} />
          </button>

          {/* Botón Pantalla Completa (Full Screen) */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Modo pantalla completa'}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Botón Cerrar (en caso de Modal) */}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Cerrar terminal"
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Barra de Pestañas de Navegación Interna Adaptable */}
      <div className="bg-neutral-950/60 border-b border-neutral-800/80 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scroll-smooth scrollbar-thin scrollbar-thumb-neutral-800">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-900/60'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-cyan-950 text-cyan-300' : 'bg-neutral-900 text-slate-500'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Área de Contenido Principal (Scrollable y Aislada con Error Boundaries) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'mercado' && (
          <ProvidenceErrorBoundary section="Mercado y Cotizaciones">
            <FxMarketPanel
              activeCurrency={activeCurrency}
              data={marketData}
              loading={marketLoading}
              onNavigateToForecast={() => setActiveTab('pronosticos')}
              onNavigateToRisk={() => setActiveTab('riesgo')}
            />
          </ProvidenceErrorBoundary>
        )}

        {activeTab === 'pronosticos' && (
          <ProvidenceErrorBoundary section="Pronósticos Econométricos">
            <FxForecastPanel
              activeCurrency={activeCurrency}
              models={models}
              modelsLoading={modelsLoading}
              selectedModelId={selectedModelId}
              setSelectedModelId={setSelectedModelId}
              selectedHorizon={selectedHorizon}
              setSelectedHorizon={setSelectedHorizon}
              forecast={forecast}
              forecastLoading={forecastLoading}
              forecastError={forecastError}
              onRefresh={() => fetchForecast(activeCurrency, selectedModelId, selectedHorizon)}
            />
          </ProvidenceErrorBoundary>
        )}

        {activeTab === 'riesgo' && (
          <ProvidenceErrorBoundary section="Riesgo & Volatilidad GARCH">
            <FxRiskPanel
              activeCurrency={activeCurrency}
              riskData={riskData}
              loading={riskLoading}
              error={riskError}
              onRetry={() => fetchRisk(activeCurrency)}
            />
          </ProvidenceErrorBoundary>
        )}

        {activeTab === 'laboratorio' && (
          <ProvidenceErrorBoundary section="Laboratorio Cuantitativo">
            <FxResearchLab
              activeCurrency={activeCurrency}
              models={models}
              experiments={experiments}
              experimentsLoading={experimentsLoading}
              experimentsError={experimentsError}
              onRetryExperiments={() => fetchExperiments(activeCurrency)}
              benchmarkRunning={benchmarkRunning}
              onRunBenchmark={triggerBenchmarkRun}
            />
          </ProvidenceErrorBoundary>
        )}

        {activeTab === 'macro' && (
          <ProvidenceErrorBoundary section="Inteligencia Macroeconómica">
            <FxMacroPanel />
          </ProvidenceErrorBoundary>
        )}

        {activeTab === 'calidad' && (
          <ProvidenceErrorBoundary section="Calidad de Datos y Censos">
            <FxDataQualityPanel
              dataQuality={dataQuality}
              loading={qualityLoading}
              error={qualityError}
            />
          </ProvidenceErrorBoundary>
        )}
      </div>

      {/* Footer Institucional de Garantía y Trazabilidad */}
      <div className="bg-neutral-950/80 border-t border-neutral-800/80 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Providence FX Engine LIVE — 26,605 observaciones oficiales conciliadas</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>Meese-Rogoff Benchmark Enforced</span>
          <span>•</span>
          <span>Zero Lookahead Leakage</span>
          <span>•</span>
          <span>Magnus OS2</span>
        </div>
      </div>
    </div>
  );
};
