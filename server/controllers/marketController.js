/**
 * ============================================================================
 * MAGNUS-OS2 // MARKET INTELLIGENCE CONTROLLER
 * Strategy & Concurrency Architecture inspired by OSIRIS
 * ============================================================================
 */

import { CurrencyHistory } from '../models/index.js';

const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const CACHE_TTL_MS = 60 * 1000; // 60s
const CONCURRENCY = 5;

export const MARKET_TICKERS = [
  // KPIs Prioritarios / Destacados
  { symbol: 'DOP=X',    name: 'USD / DOP',          category: 'featured', unit: 'RD$' },
  { symbol: 'EURUSD=X', name: 'EUR / USD',          category: 'featured', unit: '$' },
  { symbol: 'CL=F',     name: 'WTI Crude Oil',      category: 'featured', unit: 'USD/bbl' },
  { symbol: 'BZ=F',     name: 'Brent Crude Oil',    category: 'featured', unit: 'USD/bbl' },

  // Índices Globales
  { symbol: 'ES=F',     name: 'S&P 500 Futures',    category: 'indices',  unit: 'PTS' },
  { symbol: 'NQ=F',     name: 'Nasdaq 100 Futures', category: 'indices',  unit: 'PTS' },
  { symbol: '^VIX',     name: 'VIX Volatility',     category: 'indices',  unit: 'PTS' },
  { symbol: '^TNX',     name: 'US 10Y Yield',       category: 'indices',  unit: '%' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index',    category: 'indices',  unit: 'PTS' },

  // Energía & Commodities
  { symbol: 'NG=F',     name: 'Natural Gas',        category: 'commodities', unit: 'USD/MMBtu' },
  { symbol: 'GC=F',     name: 'Gold (Oz)',          category: 'commodities', unit: 'USD/oz' },
  { symbol: 'SI=F',     name: 'Silver (Oz)',        category: 'commodities', unit: 'USD/oz' },
  { symbol: 'HG=F',     name: 'Copper',             category: 'commodities', unit: 'USD/lb' },
  { symbol: 'ZW=F',     name: 'Wheat Futures',      category: 'commodities', unit: 'USd/bu' },

  // Crypto Forensics
  { symbol: 'BTC-USD',  name: 'Bitcoin',            category: 'crypto',   unit: 'USD' },
  { symbol: 'ETH-USD',  name: 'Ethereum',           category: 'crypto',   unit: 'USD' },
  { symbol: 'SOL-USD',  name: 'Solana',             category: 'crypto',   unit: 'USD' },

  // Forex (FX)
  { symbol: 'USDJPY=X', name: 'USD / JPY',          category: 'forex',    unit: '¥' },
  { symbol: 'GBPUSD=X', name: 'GBP / USD',          category: 'forex',    unit: '$' },
  { symbol: 'USDCNY=X', name: 'USD / CNY',          category: 'forex',    unit: '¥' }
];

let cacheMemory = {
  data: null,
  timestamp: 0
};

// Respaldo permanente de última cotización válida histórica (lastGoodMap)
const lastGoodMap = new Map();

const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

/**
 * Consulta un instrumento a Yahoo Finance v8 chart
 */
async function fetchYahooQuote(item) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: {
        'User-Agent': YAHOO_UA,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return null;
    const body = await res.json();
    const result = body?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    if (!Number.isFinite(price)) return null;

    // Sparkline de los últimos 30 días filtrando valores nulos
    const rawCloses = result.indicators?.quote?.[0]?.close || [];
    const spark = rawCloses
      .filter(val => typeof val === 'number' && Number.isFinite(val))
      .map(val => r2(val));

    // Cierre previo calculado para medir variación exacta del día
    const prevClose = spark.length >= 2 ? spark[spark.length - 2] : meta.chartPreviousClose;
    const change = Number.isFinite(prevClose) && prevClose !== 0 ? price - prevClose : 0;
    const changePercent = Number.isFinite(prevClose) && prevClose !== 0 ? (change / prevClose) * 100 : 0;

    // Detección de ventana de mercado abierta
    const period = meta.currentTradingPeriod?.regular;
    const nowSec = Date.now() / 1000;
    const isCrypto = item.category === 'crypto';
    const marketOpen = isCrypto || (
      Number.isFinite(period?.start) && Number.isFinite(period?.end)
        ? nowSec >= period.start && nowSec <= period.end
        : false
    );

    return {
      symbol: item.symbol,
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: (item.category === 'forex' || item.symbol.includes('=X')) ? r4(price) : r2(price),
      prev_close: r2(prevClose),
      change: r2(change),
      change_percent: r2(changePercent),
      up: changePercent >= 0,
      market_open: marketOpen,
      spark: spark.slice(-20), // 20 sesiones para gráfico sparkline nítido
      currency: meta.currency || 'USD',
      updated_at: new Date().toISOString()
    };
  } catch (err) {
    return null;
  }
}

/**
 * Worker pool con concurrencia máxima acotada (5 conexiones en paralelo)
 */
async function fetchBatch(tickers, targetMap) {
  let index = 0;
  const worker = async () => {
    while (index < tickers.length) {
      const current = tickers[index++];
      const quote = await fetchYahooQuote(current);
      if (quote) {
        targetMap.set(current.symbol, quote);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

/**
 * Sincroniza las tasas de cambio principales en la base de datos si cambiaron
 */
async function syncDatabaseRates(usdDop, eurUsd) {
  try {
    if (!usdDop || !eurUsd) return;
    const eurDop = r2(usdDop * eurUsd);
    const today = new Date().toISOString().split('T')[0];

    // Actualiza o inserta en CurrencyHistory para que toda la app esté en sincronía
    await CurrencyHistory.create({ date: today, code: 'USD', rate: r2(usdDop) });
    await CurrencyHistory.create({ date: today, code: 'EUR', rate: eurDop });
  } catch (err) {
    // Si la DB falla temporalmente, no bloquea el feed de mercado
  }
}

/**
 * Orquestador principal de mercado
 */
export async function getMarketIntelData() {
  const now = Date.now();
  if (cacheMemory.data && (now - cacheMemory.timestamp < CACHE_TTL_MS)) {
    return cacheMemory.data;
  }

  const freshMap = new Map();

  // Paso 1: Lote inicial
  await fetchBatch(MARKET_TICKERS, freshMap);

  // Paso 2: Reintento de instrumentos no recibidos
  const missed = MARKET_TICKERS.filter(t => !freshMap.has(t.symbol));
  if (missed.length > 0) {
    await fetchBatch(missed, freshMap);
  }

  // Paso 3: Almacenar en el mapa histórico seguro
  for (const [sym, quote] of freshMap) {
    lastGoodMap.set(sym, quote);
  }

  // Paso 4: Armar el payload completo
  const quotes = MARKET_TICKERS.map(t => {
    return freshMap.get(t.symbol) || lastGoodMap.get(t.symbol) || {
      symbol: t.symbol,
      name: t.name,
      category: t.category,
      unit: t.unit,
      price: 0,
      prev_close: 0,
      change: 0,
      change_percent: 0,
      up: true,
      market_open: false,
      spark: [],
      currency: 'USD',
      stale: true,
      updated_at: new Date().toISOString()
    };
  });

  const usdDop = quotes.find(q => q.symbol === 'DOP=X')?.price || 60.15;
  const eurUsd = quotes.find(q => q.symbol === 'EURUSD=X')?.price || 1.085;
  const eurDop = r2(usdDop * eurUsd);

  // Auto-sync de tasas a la DB en segundo plano
  syncDatabaseRates(usdDop, eurUsd).catch(() => {});

  const responsePayload = {
    status: 'ONLINE',
    count: quotes.length,
    cached_at: new Date().toISOString(),
    rates: {
      usd_dop: usdDop,
      eur_usd: eurUsd,
      eur_dop: eurDop
    },
    quotes
  };

  cacheMemory = {
    data: responsePayload,
    timestamp: now
  };

  return responsePayload;
}

export const getMarkets = async (req, res) => {
  try {
    const data = await getMarketIntelData();
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(data);
  } catch (error) {
    console.error('[MarketController] Error:', error.message);
    return res.status(500).json({ error: 'FAILED_TO_FETCH_MARKETS', details: error.message });
  }
};

function formatChartData(body, symbol, range) {
  const result = body?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const points = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (typeof c === 'number' && Number.isFinite(c)) {
      const o = typeof opens[i] === 'number' && Number.isFinite(opens[i]) ? opens[i] : c;
      const h = typeof highs[i] === 'number' && Number.isFinite(highs[i]) ? highs[i] : Math.max(o, c);
      const l = typeof lows[i] === 'number' && Number.isFinite(lows[i]) ? lows[i] : Math.min(o, c);
      const v = typeof volumes[i] === 'number' && Number.isFinite(volumes[i]) ? volumes[i] : 0;
      const d = new Date(timestamps[i] * 1000);
      
      let label = '';
      if (range === '1d' || range === '5d') {
        label = d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
        if (range === '5d') {
          label = `${d.getDate()}/${d.getMonth() + 1} ${label}`;
        }
      } else {
        label = d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
      }

      points.push({
        time: timestamps[i],
        date: d.toISOString(),
        label,
        open: symbol.includes('=X') ? r4(o) : r2(o),
        high: symbol.includes('=X') ? r4(h) : r2(h),
        low: symbol.includes('=X') ? r4(l) : r2(l),
        close: symbol.includes('=X') ? r4(c) : r2(c),
        volume: v,
        up: c >= o
      });
    }
  }

  const currentPrice = meta.regularMarketPrice || (points.length > 0 ? points[points.length - 1].close : 0);
  const prevClose = meta.chartPreviousClose || (points.length >= 2 ? points[points.length - 2].close : currentPrice);

  return {
    symbol,
    currency: meta.currency || 'USD',
    price: symbol.includes('=X') ? r4(currentPrice) : r2(currentPrice),
    prevClose: symbol.includes('=X') ? r4(prevClose) : r2(prevClose),
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? r2(meta.fiftyTwoWeekHigh) : null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? r2(meta.fiftyTwoWeekLow) : null,
    regularMarketDayHigh: meta.regularMarketDayHigh ? r2(meta.regularMarketDayHigh) : null,
    regularMarketDayLow: meta.regularMarketDayLow ? r2(meta.regularMarketDayLow) : null,
    range,
    points
  };
}

export const getMarketChart = async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const range = req.query.range || '1mo';
    let interval = req.query.interval;

    if (!interval) {
      if (range === '1d') interval = '5m';
      else if (range === '5d') interval = '15m';
      else if (range === '1mo') interval = '1d';
      else if (range === '6mo') interval = '1d';
      else if (range === '1y') interval = '1wk';
      else if (range === 'max') interval = '1mo';
      else interval = '1d';
    }

    const fetchUrl = (r, iv) => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${r}&interval=${iv}`;
    
    let response = await fetch(fetchUrl(range, interval), {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': YAHOO_UA,
        'Accept': 'application/json'
      }
    });

    // Si 1d no tiene datos (por ejemplo fin de semana), intentar 5d como respaldo
    if (response.ok && range === '1d') {
      const clone = await response.clone().json();
      const count = clone?.chart?.result?.[0]?.timestamp?.length || 0;
      if (count === 0) {
        response = await fetch(fetchUrl('5d', '15m'), {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': YAHOO_UA, 'Accept': 'application/json' }
        });
      }
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'FETCH_FAILED' });
    }

    const body = await response.json();
    const formatted = formatChartData(body, symbol, range);
    if (!formatted) {
      return res.status(404).json({ error: 'NO_CHART_DATA' });
    }

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(formatted);
  } catch (error) {
    console.error('[MarketChart] Error:', error.message);
    return res.status(500).json({ error: 'FAILED_TO_FETCH_CHART', details: error.message });
  }
};

