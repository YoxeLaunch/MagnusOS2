import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../../../../shared/utils/apiFetch';
import {
  FxCurrency,
  FxHorizonDays,
  FxIntelligenceTab,
  FxModelCatalogItem,
  FxForwardForecastData,
  FxRiskAnalyticsData,
  FxBenchmarkExperiment,
  FxDataQualityData
} from '../types';

export function useFxIntelligence(initialCurrency: FxCurrency = 'USD') {
  const [activeCurrency, setActiveCurrency] = useState<FxCurrency>(initialCurrency);
  const [activeTab, setActiveTab] = useState<FxIntelligenceTab>('mercado');
  const [selectedModelId, setSelectedModelId] = useState<string>('arima_experimental');
  const [selectedHorizon, setSelectedHorizon] = useState<FxHorizonDays>(1);

  // States for each section
  const [models, setModels] = useState<FxModelCatalogItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(false);

  const [forecast, setForecast] = useState<FxForwardForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [riskData, setRiskData] = useState<FxRiskAnalyticsData | null>(null);
  const [riskLoading, setRiskLoading] = useState<boolean>(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  const [experiments, setExperiments] = useState<FxBenchmarkExperiment[]>([]);
  const [experimentsLoading, setExperimentsLoading] = useState<boolean>(false);
  const [experimentsError, setExperimentsError] = useState<string | null>(null);

  const [dataQuality, setDataQuality] = useState<FxDataQualityData | null>(null);
  const [qualityLoading, setQualityLoading] = useState<boolean>(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  const [benchmarkRunning, setBenchmarkRunning] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);

  // In-flight abort controllers
  const forecastAbortRef = useRef<AbortController | null>(null);
  const riskAbortRef = useRef<AbortController | null>(null);

  // 1. Load Model Catalog (once or on mount)
  const fetchModels = useCallback(async () => {
    try {
      setModelsLoading(true);
      const res = await apiFetch('/api/markets/fx/research/models');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.models)) {
          setModels(json.models);
        }
      }
    } catch (err: any) {
      console.warn('[FxIntelligence] Warning fetching models:', err.message);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // 2. Load Forecast for active currency, selected model, and horizon
  const fetchForecast = useCallback(async (currency = activeCurrency, modelId = selectedModelId, horizon = selectedHorizon) => {
    if (forecastAbortRef.current) {
      forecastAbortRef.current.abort();
    }
    const abortController = new AbortController();
    forecastAbortRef.current = abortController;

    try {
      setForecastLoading(true);
      setForecastError(null);
      const url = `/api/markets/fx/research/forecasts/${encodeURIComponent(modelId)}?horizon=${horizon}&currency=${currency}&provider=bcrd`;
      const res = await apiFetch(url, { signal: abortController.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setForecast(json.data);
      } else {
        throw new Error(json.error || 'Respuesta vacía del servidor econométrico');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[FxIntelligence] Forecast fetch warning:', err.message);
        setForecastError(err.message || 'No fue posible cargar el pronóstico');
      }
    } finally {
      setForecastLoading(false);
    }
  }, [activeCurrency, selectedModelId, selectedHorizon]);

  // 3. Load Risk Analytics
  const fetchRisk = useCallback(async (currency = activeCurrency) => {
    if (riskAbortRef.current) {
      riskAbortRef.current.abort();
    }
    const abortController = new AbortController();
    riskAbortRef.current = abortController;

    try {
      setRiskLoading(true);
      setRiskError(null);
      const url = `/api/markets/fx/research/risk/volatility?currency=${currency}&provider=bcrd`;
      const res = await apiFetch(url, { signal: abortController.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setRiskData(json.data);
      } else {
        throw new Error(json.error || 'Respuesta vacía de volatilidad');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[FxIntelligence] Risk fetch warning:', err.message);
        setRiskError(err.message || 'No fue posible cargar métricas de riesgo');
      }
    } finally {
      setRiskLoading(false);
    }
  }, [activeCurrency]);

  // 4. Load Experiments
  const fetchExperiments = useCallback(async (currency = activeCurrency) => {
    try {
      setExperimentsLoading(true);
      setExperimentsError(null);
      const res = await apiFetch(`/api/markets/fx/research/experiments?currency=${currency}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.experiments)) {
        setExperiments(json.experiments);
      }
    } catch (err: any) {
      console.warn('[FxIntelligence] Experiments fetch warning:', err.message);
      setExperimentsError(err.message || 'No se pudieron consultar experimentos');
    } finally {
      setExperimentsLoading(false);
    }
  }, [activeCurrency]);

  // 5. Load Data Quality Metrics
  const fetchQuality = useCallback(async () => {
    try {
      setQualityLoading(true);
      setQualityError(null);
      const res = await apiFetch('/api/markets/fx/research/quality');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDataQuality(json.data);
      }
    } catch (err: any) {
      console.warn('[FxIntelligence] Data quality fetch warning:', err.message);
      setQualityError(err.message || 'No se pudieron consultar métricas de calidad');
    } finally {
      setQualityLoading(false);
    }
  }, []);

  // 6. Execute benchmark run on demand (Admin)
  const triggerBenchmarkRun = useCallback(async (horizon: number = 1, stepSize: number = 3) => {
    try {
      setBenchmarkRunning(true);
      const res = await apiFetch('/api/markets/fx/research/backtests/run', {
        method: 'POST',
        body: JSON.stringify({
          currency: activeCurrency,
          horizon,
          stepSize
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setBenchmarkResult(json.benchmark);
        // Refresh experiments list
        await fetchExperiments(activeCurrency);
        return json.benchmark;
      }
    } catch (err: any) {
      console.error('[FxIntelligence] Error executing benchmark:', err.message);
      throw err;
    } finally {
      setBenchmarkRunning(false);
    }
  }, [activeCurrency, fetchExperiments]);

  // Initial models load
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Tab-driven data loading
  useEffect(() => {
    if (activeTab === 'pronosticos') {
      fetchForecast(activeCurrency, selectedModelId, selectedHorizon);
    } else if (activeTab === 'riesgo') {
      fetchRisk(activeCurrency);
    } else if (activeTab === 'laboratorio') {
      fetchExperiments(activeCurrency);
    } else if (activeTab === 'calidad') {
      fetchQuality();
    }
  }, [activeTab, activeCurrency, selectedModelId, selectedHorizon, fetchForecast, fetchRisk, fetchExperiments, fetchQuality]);

  return {
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
    benchmarkResult,
    triggerBenchmarkRun
  };
}
