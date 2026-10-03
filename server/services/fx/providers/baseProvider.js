/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // BASE PROVIDER & CIRCUIT BREAKER
 * Base class enforcing timeouts, exponential backoff retries & circuit breakers
 * ============================================================================
 */

import { CIRCUIT_BREAKER_STATES } from '../types.js';

export class BaseFxProvider {
    /**
     * @param {Object} options
     * @param {string} options.id - Unique provider identifier
     * @param {string} options.name - Human-readable name
     * @param {boolean} options.enabled - Operational toggle
     */
    constructor({ id, name, enabled = true }) {
        this.id = id;
        this.name = name;
        this.enabled = enabled;

        // Circuit breaker parameters
        this.circuitState = CIRCUIT_BREAKER_STATES.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.failureThreshold = parseInt(process.env.FX_CIRCUIT_BREAKER_FAILURES || '5', 10);
        this.cooldownMs = parseInt(process.env.FX_CIRCUIT_BREAKER_COOLDOWN_MINUTES || '15', 10) * 60 * 1000;

        // Network timeouts and retry policy
        this.requestTimeoutMs = parseInt(process.env.FX_REQUEST_TIMEOUT_MS || '7000', 10);
        this.maxRetries = parseInt(process.env.FX_MAX_RETRIES || '3', 10);

        // Telemetry counters
        this.lastChecked = null;
        this.lastLatencyMs = null;
        this.lastError = null;
        this.lastRecordCount = 0;
    }

    /**
     * Verifica y actualiza el estado del circuit breaker antes de despachar una llamada
     */
    checkCircuitBreaker() {
        const now = Date.now();
        if (this.circuitState === CIRCUIT_BREAKER_STATES.OPEN) {
            if (now - this.lastFailureTime > this.cooldownMs) {
                console.log(`[FX][${this.id.toUpperCase()}] Circuit Breaker entrando a HALF_OPEN para prueba de salud.`);
                this.circuitState = CIRCUIT_BREAKER_STATES.HALF_OPEN;
                return true;
            }
            return false;
        }
        return true;
    }

    /**
     * Registra un éxito en el circuit breaker
     */
    recordSuccess(latencyMs, recordCount = 0) {
        this.circuitState = CIRCUIT_BREAKER_STATES.CLOSED;
        this.failureCount = 0;
        this.lastLatencyMs = latencyMs;
        this.lastChecked = new Date();
        this.lastRecordCount = recordCount;
        this.lastError = null;
    }

    /**
     * Registra un fallo y abre el circuit breaker si supera el umbral
     */
    recordFailure(error, latencyMs = 0) {
        this.failureCount += 1;
        this.lastFailureTime = Date.now();
        this.lastLatencyMs = latencyMs;
        this.lastChecked = new Date();
        this.lastError = error.message;

        if (this.failureCount >= this.failureThreshold || this.circuitState === CIRCUIT_BREAKER_STATES.HALF_OPEN) {
            this.circuitState = CIRCUIT_BREAKER_STATES.OPEN;
            console.warn(`[FX][${this.id.toUpperCase()}] Circuit Breaker activado a OPEN (${this.failureCount} fallos consecutivos). Cooldown: ${this.cooldownMs / 60000}m`);
        }
    }

    /**
     * Ejecuta una llamada de red con timeout estricto, reintentos con backoff y circuit breaker
     * @param {Function} task - Función que recibe AbortSignal y retorna promesa
     * @returns {Promise<any>}
     */
    async executeWithProtection(task) {
        if (!this.enabled) {
            return {
                success: false,
                skipped: true,
                reason: 'Provider deshabilitado por configuración',
                data: []
            };
        }

        if (!this.checkCircuitBreaker()) {
            console.warn(`[FX][${this.id.toUpperCase()}] Petición bloqueada por Circuit Breaker (Estado: OPEN).`);
            return {
                success: false,
                circuitOpen: true,
                error: `Circuit breaker OPEN para ${this.name}`,
                data: []
            };
        }

        let attempt = 0;
        let lastErr = null;

        while (attempt < this.maxRetries) {
            attempt++;
            const startTime = Date.now();
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);

            try {
                const result = await task(controller.signal);
                clearTimeout(timer);
                const latency = Date.now() - startTime;
                const records = Array.isArray(result) ? result.length : 0;

                this.recordSuccess(latency, records);
                console.log(`[FX][${this.id.toUpperCase()}] status=success latency=${latency}ms records=${records} attempt=${attempt}`);

                return {
                    success: true,
                    latencyMs: latency,
                    recordsReceived: records,
                    retryCount: attempt - 1,
                    data: result
                };
            } catch (err) {
                clearTimeout(timer);
                lastErr = err;
                const latency = Date.now() - startTime;
                const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
                const errMsg = isTimeout ? 'Timeout excedido' : (err.message || 'Error de red');

                console.warn(`[FX][${this.id.toUpperCase()}] status=attempt_failed attempt=${attempt}/${this.maxRetries} error="${errMsg}" latency=${latency}ms`);

                if (attempt < this.maxRetries) {
                    // Backoff: ~1s para intento 1, ~3s para intento 2 con jitter
                    const baseBackoff = attempt === 1 ? 1000 : 3000;
                    const jitter = Math.floor(Math.random() * 400);
                    await new Promise(resolve => setTimeout(resolve, baseBackoff + jitter));
                }
            }
        }

        // Si todos los reintentos fallaron
        const totalLatency = Date.now() - this.lastFailureTime;
        this.recordFailure(lastErr, totalLatency);

        return {
            success: false,
            error: lastErr?.message || 'Error desconocido tras reintentos',
            retryCount: attempt,
            data: []
        };
    }

    /**
     * Retorna el estado actual para monitoreo de salud
     */
    getHealth() {
        return {
            id: this.id,
            name: this.name,
            enabled: this.enabled,
            circuitState: this.circuitState,
            failureCount: this.failureCount,
            lastChecked: this.lastChecked ? this.lastChecked.toISOString() : null,
            lastLatencyMs: this.lastLatencyMs,
            lastRecordCount: this.lastRecordCount,
            lastError: this.lastError
        };
    }
}
