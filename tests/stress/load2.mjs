#!/usr/bin/env node
/**
 * Prueba en estado estable: pre-login gradual (sin medir) + navegación medida.
 * Uso: node load2.mjs <n_usuarios> <duracion_s_medida>
 *
 * Variables de entorno opcionales:
 *   STRESS_URL  : URL base (por defecto: http://127.0.0.1:4100)
 *   STRESS_USER : Usuario de prueba (por defecto: stress_bot)
 *   STRESS_PASS : Contraseña de prueba (por defecto: Stress!Bot2026)
 */
const BASE = process.env.STRESS_URL || 'http://127.0.0.1:4100';
const CREDS = {
  username: process.env.STRESS_USER || 'stress_bot',
  password: process.env.STRESS_PASS || 'Stress!Bot2026',
};
const EPS = [
  '/api/finanza/accounts',
  '/api/finanza/wealth/net-worth',
  '/api/transactions',
  '/api/finanza/cashflow',
];
const N = Number(process.argv[2] || 50);
const DUR = Number(process.argv[3] || 60) * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const M = { reqs: 0, errs: 0, status: {}, lat: [], logins_ok: 0, logins_fail: 0, login_lat: [] };

async function doLogin() {
  const t0 = performance.now();
  try {
    const r = await fetch(BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CREDS),
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => ({}));
    if (j.token) {
      M.logins_ok++;
      M.login_lat.push(performance.now() - t0);
      return j.token;
    }
    M.logins_fail++;
  } catch {
    M.logins_fail++;
  }
  return null;
}

async function get(ep, token) {
  const t0 = performance.now();
  try {
    const r = await fetch(BASE + ep, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    await r.arrayBuffer().catch(() => {});
    M.lat.push(performance.now() - t0);
    M.reqs++;
    M.status[r.status] = (M.status[r.status] || 0) + 1;
    if (r.status >= 400) M.errs++;
  } catch (e) {
    M.lat.push(performance.now() - t0);
    M.reqs++;
    M.errs++;
    M.status[e.name === 'TimeoutError' ? 'TIMEOUT' : 'CONN_ERR'] = (M.status[e.name === 'TimeoutError' ? 'TIMEOUT' : 'CONN_ERR'] || 0) + 1;
  }
}

function pct(a, p) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

// Fase 1: pre-login en lotes de 10 con 400ms entre lotes (evita ráfaga CPU)
const tokens = [];
console.error(`[warmup] login gradual de ${N} usuarios...`);
for (let i = 0; i < N; i += 10) {
  const batch = Array.from({ length: Math.min(10, N - i) }, () => doLogin());
  const res = await Promise.all(batch);
  res.forEach(t => t && tokens.push(t));
  await sleep(400);
}
console.error(`[warmup] logins OK: ${tokens.length}/${N} | p50=${Math.round(pct(M.login_lat, 50))}ms p95=${Math.round(pct(M.login_lat, 95))}ms`);

// Fase 2: navegación medida
let stopped = false;
const t_start = Date.now();
const vus = tokens.map(tok => (async () => {
  // desfase inicial aleatorio para no sincronizar ráfagas
  await sleep(Math.random() * 2500);
  let i = Math.floor(Math.random() * 4);
  while (!stopped) {
    await get(EPS[i++ % 4], tok);
    await sleep(1500 + Math.random() * 3000);
  }
})());
await sleep(DUR);
stopped = true;
await Promise.race([Promise.all(vus), sleep(12000)]);

const secs = (Date.now() - t_start) / 1000;
console.log(JSON.stringify({
  usuarios: tokens.length,
  medida_s: Math.round(secs),
  rps: +(M.reqs / secs).toFixed(1),
  errores: M.errs,
  error_pct: +(100 * M.errs / Math.max(1, M.reqs)).toFixed(2),
  status: M.status,
  latencia_ms: {
    p50: Math.round(pct(M.lat, 50)),
    p90: Math.round(pct(M.lat, 90)),
    p95: Math.round(pct(M.lat, 95)),
    p99: Math.round(pct(M.lat, 99)),
    max: Math.round(Math.max(0, ...M.lat)),
  },
  login_warmup: {
    ok: M.logins_ok,
    fail: M.logins_fail,
    p95_ms: Math.round(pct(M.login_lat, 95)),
  },
}));
