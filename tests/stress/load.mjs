#!/usr/bin/env node
/**
 * Generador de carga para MagnusOS2.
 * Uso: node load.mjs <modo> <concurrencia> <duracion_s> [puerto]
 *   browse : usuarios virtuales reales -> login 1 vez + GETs con think time ~3s
 *   burst  : workers en bucle cerrado sin pausa (techo bruto de req/s)
 *   login  : workers haciendo logins consecutivos (techo de logins/s)
 *
 * Variables de entorno opcionales:
 *   STRESS_URL  : URL base (por defecto: http://127.0.0.1:<puerto o 4100>)
 *   STRESS_USER : Usuario de prueba (por defecto: stress_bot)
 *   STRESS_PASS : Contraseña de prueba (por defecto: Stress!Bot2026)
 */
const PORT = process.argv[5] || 4100;
const BASE = process.env.STRESS_URL || `http://127.0.0.1:${PORT}`;
const CREDS = {
  username: process.env.STRESS_USER || 'stress_bot',
  password: process.env.STRESS_PASS || 'Stress!Bot2026',
};

const GET_ENDPOINTS = [
  '/api/finanza/accounts',
  '/api/finanza/wealth/net-worth',
  '/api/transactions',
  '/api/finanza/cashflow',
];

const mode = process.argv[2] || 'browse';
const CONC = Number(process.argv[3] || 10);
const DUR = Number(process.argv[4] || 30) * 1000;

const stats = { reqs: 0, errors: 0, timeouts: 0, status: {}, latencies: [] };
let stopped = false;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function record(ms, status) {
  stats.reqs++;
  stats.status[status] = (stats.status[status] || 0) + 1;
  if (status >= 400 || status === 0) stats.errors++;
  stats.latencies.push(ms);
}

async function timedFetch(path, opts = {}) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, { signal: AbortSignal.timeout(10000), ...opts });
    await res.arrayBuffer().catch(() => {});
    record(performance.now() - t0, res.status);
    return res.status;
  } catch (e) {
    record(performance.now() - t0, e.name === 'TimeoutError' ? 'TIMEOUT' : 'CONN_ERR');
    if (e.name === 'TimeoutError') stats.timeouts++;
    return 0;
  }
}

async function login() {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CREDS),
      signal: AbortSignal.timeout(10000),
    });
    const j = await res.json().catch(() => ({}));
    record(performance.now() - t0, res.status);
    return j.token || null;
  } catch {
    record(performance.now() - t0, 'CONN_ERR');
    return null;
  }
}

async function vuBrowse(id) {
  const token = await login();
  if (!token) {
    console.error(`VU${id}: login fallido`);
    return;
  }
  const H = { Authorization: `Bearer ${token}` };
  while (!stopped) {
    const ep = GET_ENDPOINTS[Math.floor(Math.random() * GET_ENDPOINTS.length)];
    await timedFetch(ep, { headers: H });
    await sleep(1500 + Math.random() * 3000); // think time 1.5–4.5s (media ~3s)
  }
}

async function workerBurst() {
  const token = await login();
  if (!token) return;
  const H = { Authorization: `Bearer ${token}` };
  let i = 0;
  while (!stopped) {
    await timedFetch(GET_ENDPOINTS[i++ % GET_ENDPOINTS.length], { headers: H });
  }
}

async function workerLogin() {
  while (!stopped) await login();
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

async function main() {
  console.error(`[load] modo=${mode} concurrencia=${CONC} duracion=${DUR / 1000}s -> ${BASE}`);
  const runner = mode === 'browse' ? vuBrowse : mode === 'burst' ? workerBurst : workerLogin;
  const workers = Array.from({ length: CONC }, (_, i) => runner(i));
  await sleep(DUR);
  stopped = true;
  await Promise.race([Promise.all(workers), sleep(15000)]);
  const rps = stats.reqs / (DUR / 1000);
  const out = {
    mode,
    concurrency: CONC,
    duration_s: DUR / 1000,
    total_requests: stats.reqs,
    rps: Math.round(rps * 10) / 10,
    errors: stats.errors,
    timeouts: stats.timeouts,
    error_rate_pct: stats.reqs ? +(100 * stats.errors / stats.reqs).toFixed(2) : 0,
    status: stats.status,
    latency_ms: {
      p50: Math.round(pct(stats.latencies, 50)),
      p90: Math.round(pct(stats.latencies, 90)),
      p95: Math.round(pct(stats.latencies, 95)),
      p99: Math.round(pct(stats.latencies, 99)),
      max: Math.round(Math.max(0, ...stats.latencies)),
    },
  };
  console.log(JSON.stringify(out));
}

main();
