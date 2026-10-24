#!/usr/bin/env node
/**
 * Verificador no intrusivo de rate limiting global.
 * Envía una ráfaga de peticiones GET sin token para comprobar el límite de 300 peticiones / 15 min.
 *
 * Variables de entorno opcionales:
 *   STRESS_URL : URL base (por defecto: http://127.0.0.1:4000)
 */
const BASE = process.env.STRESS_URL || 'http://127.0.0.1:4000';
const total = Number(process.argv[2] || 310);
const conc = Number(process.argv[3] || 10);
let done = 0;
const status = {};
const lat = [];
const t0 = Date.now();

async function worker() {
  while (done < total) {
    done++;
    const s = performance.now();
    try {
      const r = await fetch(BASE + '/api/finanza/accounts', { signal: AbortSignal.timeout(5000) });
      await r.arrayBuffer().catch(() => {});
      status[r.status] = (status[r.status] || 0) + 1;
    } catch {
      status.ERR = (status.ERR || 0) + 1;
    }
    lat.push(performance.now() - s);
  }
}

await Promise.all(Array.from({ length: conc }, worker));
lat.sort((a, b) => a - b);

console.log(JSON.stringify({
  total,
  duracion_s: +((Date.now() - t0) / 1000).toFixed(1),
  status,
  p50_ms: Math.round(lat[Math.floor(lat.length / 2)]),
  max_ms: Math.round(lat[lat.length - 1]),
}));
