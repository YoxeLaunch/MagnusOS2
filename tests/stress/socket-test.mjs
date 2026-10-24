#!/usr/bin/env node
/**
 * Prueba de conexiones concurrentes Socket.io con JWT.
 * Uso: node socket-test.mjs [n_conexiones] [duracion_segundos]
 *
 * Variables de entorno opcionales:
 *   STRESS_URL  : URL base (por defecto: http://127.0.0.1:4100)
 *   STRESS_USER : Usuario de prueba (por defecto: stress_bot)
 *   STRESS_PASS : Contraseña de prueba (por defecto: Stress!Bot2026)
 */
import { io } from 'socket.io-client';

const BASE = process.env.STRESS_URL || 'http://127.0.0.1:4100';
const CREDS = {
  username: process.env.STRESS_USER || 'stress_bot',
  password: process.env.STRESS_PASS || 'Stress!Bot2026',
};
const N = Number(process.argv[2] || 500);
const HOLD_S = Number(process.argv[3] || 30);
const BATCH = 50;
const BATCH_DELAY = 250;

// 1 login para obtener token
const loginRes = await fetch(BASE + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(CREDS),
});
const { token } = await loginRes.json();

if (!token) {
  console.error('Error: no se pudo obtener token para la prueba de socket.');
  process.exit(1);
}

let connected = 0;
let failed = 0;
let disconnected = 0;
const sockets = [];
const t0 = Date.now();

for (let i = 0; i < N; i += BATCH) {
  const size = Math.min(BATCH, N - i);
  for (let j = 0; j < size; j++) {
    const s = io(BASE, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: 15000,
    });
    s.on('connect', () => connected++);
    s.on('connect_error', () => { failed++; });
    s.on('disconnect', () => { if (connected > 0) disconnected++; });
    sockets.push(s);
  }
  await new Promise(r => setTimeout(r, BATCH_DELAY));
}

// Mantener conectados HOLD_S segundos
await new Promise(r => setTimeout(r, HOLD_S * 1000));
const alive = sockets.filter(s => s.connected).length;
const elapsed = +((Date.now() - t0) / 1000).toFixed(1);
sockets.forEach(s => s.disconnect());
setTimeout(() => process.exit(0), 500);

console.log(JSON.stringify({
  objetivo: N,
  conectados_pico: connected,
  vivos_al_final: alive,
  fallos_connect: failed,
  desconexiones: disconnected,
  duracion_s: elapsed,
}));
