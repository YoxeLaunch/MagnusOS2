import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';

// --- CPU % (delta entre dos muestras de os.cpus()) ---
let lastCpuSample = os.cpus();

const getCpuPercent = () => {
    const current = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    current.forEach((core, i) => {
        const prev = lastCpuSample[i]?.times || core.times;
        const idleDelta = core.times.idle - prev.idle;
        const totalDelta = Object.keys(core.times).reduce(
            (sum, key) => sum + (core.times[key] - prev[key]),
            0
        );
        totalIdle += idleDelta;
        totalTick += totalDelta;
    });

    lastCpuSample = current;

    if (totalTick <= 0) return 0;
    return Math.min(100, Math.max(0, ((totalTick - totalIdle) / totalTick) * 100));
};

// --- Disco (vía `df`, sin dependencias externas) ---
const getDiskUsage = (mountPoint = '/') => {
    try {
        const output = execSync(`df -kP ${mountPoint}`).toString();
        const line = output.trim().split('\n')[1];
        const parts = line.trim().split(/\s+/);
        // Filesystem, 1024-blocks, Used, Available, Capacity, Mounted on
        const totalKB = parseInt(parts[1], 10);
        const usedKB = parseInt(parts[2], 10);
        const freeKB = parseInt(parts[3], 10);

        return {
            totalGB: +(totalKB / 1024 / 1024).toFixed(2),
            usedGB: +(usedKB / 1024 / 1024).toFixed(2),
            freeGB: +(freeKB / 1024 / 1024).toFixed(2),
            percent: totalKB > 0 ? +((usedKB / totalKB) * 100).toFixed(1) : 0
        };
    } catch (err) {
        console.error('[SystemService] Error reading disk usage:', err.message);
        return null;
    }
};

// --- Temperatura (best-effort, puede no estar disponible en contenedores) ---
const THERMAL_ZONES = [0, 1, 2, 3].map((n) => `/sys/class/thermal/thermal_zone${n}/temp`);

const getTemperatureC = () => {
    for (const zonePath of THERMAL_ZONES) {
        try {
            if (fs.existsSync(zonePath)) {
                const raw = fs.readFileSync(zonePath, 'utf8').trim();
                const millideg = parseInt(raw, 10);
                if (!Number.isNaN(millideg) && millideg > 0) {
                    return +(millideg / 1000).toFixed(1);
                }
            }
        } catch {
            // sigue intentando la siguiente zona
        }
    }
    return null;
};

export const getGlobalStats = () => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
        cpu: {
            percent: +getCpuPercent().toFixed(1),
            cores: os.cpus().length,
            loadAverage: os.loadavg()
        },
        ram: {
            percent: +((usedMem / totalMem) * 100).toFixed(1),
            usedGB: +(usedMem / 1024 / 1024 / 1024).toFixed(2),
            totalGB: +(totalMem / 1024 / 1024 / 1024).toFixed(2)
        },
        disk: getDiskUsage('/'),
        temperature: getTemperatureC(),
        uptime: os.uptime(),
        timestamp: Date.now()
    };
};
