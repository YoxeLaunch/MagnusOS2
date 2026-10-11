/**
 * ============================================================================
 * PROVIDENCE FX INTELLIGENCE // TYPES & DATA CONTRACTS
 * Quantitative Research Engine, Forecasting, Volatility, and Data Quality
 * ============================================================================
 */

export type FxIntelligenceTab = 'mercado' | 'pronosticos' | 'riesgo' | 'laboratorio' | 'macro' | 'calidad';

export type FxCurrency = 'USD' | 'EUR';

export type FxHorizonDays = 1 | 5 | 20 | 60;

export interface FxModelCatalogItem {
  id: string;
  name: string;
  category: 'BASELINE' | 'INDICATOR' | 'SMOOTHING' | 'AUTOREGRESSIVE' | 'VOLATILITY';
  description: string;
  status?: 'APROBADO_PARA_CONSULTA' | 'EXPERIMENTAL' | 'VALIDACION' | 'DESCRIPTIVO';
}

export interface FxBenchmarkMetrics {
  mae: number;
  rmse: number;
  bias: number;
  mape: number;
  directionalAccuracyPct: number;
  coverageRate95Pct: number;
  meanIntervalWidth: number | null;
  meanPinballLoss95: number;
  benchmark?: {
    rwMae: number;
    rwRmse: number;
    theilU: number;
    skillScorePct: number;
    beatsRandomWalk: boolean;
  };
}

export interface FxBenchmarkExperiment {
  experimentId: string;
  modelId: string;
  modelName: string;
  category: string;
  horizon: number;
  metrics: FxBenchmarkMetrics;
  runtimeMs: number;
  forecastCount: number;
  testRange?: string;
  datasetHash?: string;
}

export interface FxForecastTrajectoryPoint {
  step: number;
  date: string;
  predictedValue: number;
  lower95: number | null;
  upper95: number | null;
}

export interface FxRecentHistoricalPoint {
  date: string;
  price: number;
  buy: number;
  sell: number;
}

export interface FxForwardForecastData {
  modelId: string;
  modelName: string;
  category: string;
  description: string;
  currency: FxCurrency;
  provider: string;
  datasetHash: string;
  originDate: string;
  originPrice: number;
  targetDate: string;
  horizon: number;
  predictedValue: number;
  lower95: number | null;
  upper95: number | null;
  projectedChange: number;
  projectedChangePct: number;
  parameters: {
    phi?: number | null;
    theta?: number | null;
    mu?: number | null;
    alpha?: number | null;
    beta?: number | null;
    omega?: number | null;
    sigma?: number | null;
  };
  trajectory: FxForecastTrajectoryPoint[];
  recentHistory: FxRecentHistoricalPoint[];
  backtestMetrics: FxBenchmarkMetrics | null;
  isExperimental: boolean;
  disclaimer: string;
}

export interface FxVolatilityTermPoint {
  horizon: number;
  horizonLabel: string;
  dailyVolPct: number;
  annualizedVolPct: number;
}

export interface FxReturnHistogramBin {
  binIndex: number;
  rangeLabel: string;
  midReturnPct: number;
  count: number;
  frequency: number;
}

export interface FxExtremeEpisode {
  name: string;
  period: string;
  description: string;
  maxDailySpike: string;
  severity: 'CRÍTICA' | 'MODERADA' | 'BAJA';
}

export interface FxRiskAnalyticsData {
  currency: FxCurrency;
  provider: string;
  datasetHash: string;
  observationsCount: number;
  volatility: {
    annualizedHistoricalPct: number;
    garchConditionalAnnualPct: number;
    ewmaAnnualPct: number;
    rolling20dAnnualPct: number;
    unconditionalLongTermAnnualPct: number;
  };
  garchParameters: {
    omega: number;
    alpha: number;
    beta: number;
    persistence: number;
    halfLifeDays: number;
  };
  termStructure: FxVolatilityTermPoint[];
  distribution: {
    meanDailyPct: number;
    medianDailyPct: number;
    stdDevDailyPct: number;
    skewness: number;
    kurtosis: number;
    excessKurtosis: number;
    isLeptokurtic: boolean;
    percentiles: {
      p1: number;
      p5: number;
      p10: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    bins: FxReturnHistogramBin[];
  };
  valueAtRisk: {
    var95ParametricPct: number;
    var99ParametricPct: number;
    var95HistoricalPct: number;
    var99HistoricalPct: number;
  };
  archEffect: {
    statistic: number;
    pValue: number;
    hasVolatilityClustering: boolean;
  };
  stationarity: {
    adfTStat: number;
    criticalValue5Pct: number;
    isStationary: boolean;
  };
  extremeEpisodes: FxExtremeEpisode[];
}

export interface FxProviderCensus {
  provider: string;
  currency: string;
  count: number;
  firstDate: string;
  lastDate: string;
  frequency: string;
  reliability: string;
}

export interface FxValidationBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface FxDocumentedAnomaly {
  id: number;
  provider: string;
  currency: string;
  date: string;
  buy: number;
  sell: number;
  status: string;
  confidence: number;
  description: string;
}

export interface FxProviderHealthItem {
  provider: string;
  name: string;
  role: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  coverageYears: string;
  lastSync: string;
  records: number;
}

export interface FxDataQualityData {
  totalObservations: number;
  providers: FxProviderCensus[];
  validationBreakdown: FxValidationBreakdownItem[];
  documentedAnomalies: FxDocumentedAnomaly[];
  providerHealthMonitor: FxProviderHealthItem[];
}
