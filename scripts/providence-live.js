import http from 'http';
import os from 'os';
import fs from 'fs';
import chalk from 'chalk';
import figlet from 'figlet';

// --- PALETA TÁCTICA THE MACHINE ---
const cYellow = chalk.hex('#fde047');
const cAmber = chalk.hex('#f59e0b');
const cGreen = chalk.hex('#22c55e');
const cRed = chalk.hex('#ef4444');
const cCyan = chalk.hex('#06b6d4');
const cDim = chalk.hex('#666666');
const cWhite = chalk.bold.white;

// --- CONFIGURACIÓN DE PANTALLA ---
const enterAltScreen = () => {
    process.stdout.write('\x1b[?1049h\x1b[?25l\x1b[H');
};

const exitAltScreen = () => {
    process.stdout.write('\x1b[?25h\x1b[?1049l');
    process.exit(0);
};

// Captura de teclas para salir
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
        if (key === 'q' || key === 'Q' || key === '\u0003' || key === '\u001b') {
            exitAltScreen();
        }
    });
}

process.on('SIGINT', exitAltScreen);
process.on('SIGTERM', exitAltScreen);

// --- ESTADO DE TELEMETRÍA ---
let telemetry = {
    global: {
        cpu: { percent: 0, cores: os.cpus().length },
        ram: { percent: 0, usedGB: 0, totalGB: (os.totalmem() / (1024 ** 3)).toFixed(1) },
        disk: { percent: 0, usedGB: 0, totalGB: 0 },
        temperature: 45,
        uptime: os.uptime()
    },
    containers: {}
};

// Obtención de telemetría (vía daemon local o fallback a OS)
const fetchTelemetry = () => {
    const req = http.get('http://localhost:8090/api/telemetry', { timeout: 800 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json && json.global) {
                    telemetry = json;
                }
            } catch (e) {}
        });
    });
    req.on('error', () => {
        // Fallback local directo
        const cpus = os.cpus();
        const load = os.loadavg()[0];
        const cpuP = Math.min(100, Math.round((load / cpus.length) * 100));
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        telemetry.global.cpu.percent = cpuP;
        telemetry.global.ram.percent = Math.round((used / total) * 100);
        telemetry.global.ram.usedGB = (used / (1024 ** 3)).toFixed(1);
        telemetry.global.ram.totalGB = (total / (1024 ** 3)).toFixed(1);
        telemetry.global.uptime = os.uptime();
        try {
            const stats = fs.statfsSync('/');
            const dTot = (stats.bsize * stats.blocks) / (1024 ** 3);
            const dFr = (stats.bsize * stats.bfree) / (1024 ** 3);
            telemetry.global.disk.totalGB = dTot.toFixed(0);
            telemetry.global.disk.usedGB = (dTot - dFr).toFixed(0);
            telemetry.global.disk.percent = Math.round(((dTot - dFr) / dTot) * 100);
        } catch (e) {}
    });
};

// Bar progress generator
const makeBar = (percent, width = 12) => {
    const p = Math.max(0, Math.min(100, percent || 0));
    const filled = Math.round((p / 100) * width);
    const empty = width - filled;
    const barStr = `${'■'.repeat(filled)}${'□'.repeat(empty)}`;
    if (p > 85) return cRed(`[${barStr}]`);
    if (p > 70) return cAmber(`[${barStr}]`);
    return cYellow(`[${barStr}]`);
};

const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

// --- ANIMACIÓN DEL OJO CIBERNÉTICO ---
let frame = 0;
const eyeFrames = [
    { pupil: '(       │    ⦿    │       )', reticle: 'CAM-01 [TARGET_ACQUIRED]', scanColor: cYellow },
    { pupil: '(      │     ⦿     │      )', reticle: 'CAM-01 [CALIBRATING...]', scanColor: cYellow },
    { pupil: '(     │      ⦿      │     )', reticle: 'CAM-02 [SCANNING HORIZON]', scanColor: cAmber },
    { pupil: '(    │       ⦿       │    )', reticle: 'CAM-03 [SUBJECT TRACKING]', scanColor: cGreen },
    { pupil: '(     │      ⦿      │     )', reticle: 'CAM-03 [LOCK CONFIRMED]', scanColor: cGreen },
    { pupil: '(      │     ⦿     │      )', reticle: 'CAM-04 [PRIMARY SURVEILLANCE]', scanColor: cYellow },
    { pupil: '(       │   (◉)   │       )', reticle: 'CAM-04 [THREAT_EVAL: NOMINAL]', scanColor: cGreen },
    { pupil: '(       │   (◎)   │       )', reticle: 'CAM-04 [TELEMETRY_SYNC: 60Hz]', scanColor: cCyan }
];

const renderEye = (frameIdx) => {
    const f = eyeFrames[frameIdx % eyeFrames.length];
    const bracketColor = (frameIdx % 4 === 0) ? cWhite : cYellow;

    return [
        `       ${bracketColor('┌──')}                                           ${bracketColor('──┐')}`,
        `              ${cDim('. ─────────────────────────────── .')}`,
        `           ${cDim('. ´')}           ${cDim('\\')}     ${cDim('│')}     ${cDim('/')}           ${cDim('` .')}`,
        `          ${cWhite('/')}        ${cWhite('. ────┼─────┴─────┼──── .')}        ${cWhite('\\')}`,
        `     ${cYellow('─── [')}       ${cWhite(f.pupil)}       ${cYellow('] ───')}`,
        `          ${cWhite('\\')}        ${cWhite('` ────┼─────┬─────┼──── ´')}        ${cWhite('/')}`,
        `           ${cDim('` .')}           ${cDim('/')}     ${cDim('│')}     ${cDim('\\')}           ${cDim('. ´')}`,
        `              ${cDim('` ─────────────────────────────── ´')}`,
        `       ${bracketColor('└──')}                                           ${bracketColor('──┘')}`,
        `             ${f.scanColor(f.reticle)}`
    ];
};

// Eventos de vigilancia simulados para el ticker inferior
const surveillanceEvents = [
    'PRIMARY SENSOR: TCP/IP STACK SYNCHRONIZED',
    'AVAHI MDNS BROADCAST: providence.local [222/223]',
    'DOCKER SOCKET: ACTIVE MONITORING STREAMING',
    'GEOSPATIAL MATRIX: GODS EYE VIEW [4173] SATELLITES & OSINT TRACKED',
    'OSINT TACTICAL: OSIRIS [3333] RECON SCANNERS & CCTVS ACTIVE',
    'SEARCH MATRIX: SEARXNG [8082] & GATEWAY [8083] SYNCED',
    'HEURISTIC ENGINE: ZERO ANOMALIES DETECTED',
    'AI CORE: OLLAMA / PANEL READY FOR DISPATCH',
    'NETWORK INTERFACE eno1: DUPLEX 1000Mbps FULL'
];

// --- LOOP DE RENDERIZADO (10 FPS) ---
const render = () => {
    frame++;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');

    const g = telemetry.global;
    const cpuP = g.cpu.percent || 0;
    const ramP = g.ram.percent || 0;
    const diskP = g.disk.percent || 0;
    const temp = g.temperature ? `${g.temperature}°C` : '42°C';
    const uptimeStr = formatUptime(g.uptime || os.uptime());

    const termCols = process.stdout.columns || 80;
    const termRows = process.stdout.rows || 24;

    const eyeLines = renderEye(Math.floor(frame / 2));
    const eventText = surveillanceEvents[Math.floor(frame / 20) % surveillanceEvents.length];

    // Contenedores ordenados por cpu o estado
    const contKeys = Object.keys(telemetry.containers || {});
    const runningConts = contKeys.filter(k => telemetry.containers[k].running);

    let output = '\x1b[H'; // Cursor a origen sin parpadeo

    // Encabezado
    output += `${cYellow.bold(' PROVIDENCE // NEXUS ')} ${cDim('── [ THE MACHINE TACTICAL MONITOR ] ──')} ${cWhite.bold(`TIME: ${timeStr}`)}${cYellow(`:${ms}`)}\n`;
    output += `${cWhite('[SYS.IDENT: ')}${cYellow.bold('PROVIDENCE')}${cWhite(']  ')}`;
    output += `${cWhite('[STATUS: ')}${cGreen.bold('ONLINE')}${cWhite(']  ')}`;
    output += `${cWhite('[THREAT: ')}${cGreen.bold('NOMINAL')}${cWhite(']  ')}`;
    output += `${cWhite('[NODES: ')}${cYellow.bold(`${runningConts.length}/${contKeys.length || 21}`)}${cWhite(']  ')}`;
    output += `${cWhite('[UPTIME: ')}${cDim(uptimeStr)}${cWhite(']')}\n`;
    output += cDim('─'.repeat(Math.min(termCols, 80))) + '\n';

    // Ojo y Telemetría Central
    const hudLines = [
        `${cYellow.bold('CPU LOAD:')}     ${makeBar(cpuP)} ${String(cpuP).padStart(3)}%  ${cDim(`(${g.cpu.cores || 4} Cores)`)}`,
        `${cYellow.bold('RAM USAGE:')}    ${makeBar(ramP)} ${String(ramP).padStart(3)}%  ${cWhite(`${g.ram.usedGB || 0}GB`)} / ${g.ram.totalGB || 8}GB`,
        `${cYellow.bold('DISK ARRAY:')}   ${makeBar(diskP)} ${String(diskP).padStart(3)}%  ${cWhite(`${g.disk.usedGB || 0}GB`)} / ${g.disk.totalGB || 455}GB`,
        `${cYellow.bold('SYSTEM TEMP:')}  ${cGreen(temp)}  ${cDim('| Kernel:')} ${cWhite('Linux ' + os.release().split('-')[0])}`,
        `${cYellow.bold('TOPOLOGY:')}     ${cWhite('providence.local')} ${cDim('[:80, :4173, :8082, :8090, :8081]')}`,
        `${cYellow.bold('LAN IP:')}       ${cWhite('192.168.100.222')} ${cDim('(eno1)')}`
    ];

    // Mostrar el Ojo
    eyeLines.forEach(line => {
        output += line + '\n';
    });

    output += '\n' + cDim('─'.repeat(Math.min(termCols, 80))) + '\n';
    output += `${cWhite.bold(' [ HARDWARE TELEMETRY STREAM ]')}\n`;
    hudLines.forEach(h => output += `   ${h}\n`);

    output += '\n' + cDim('─'.repeat(Math.min(termCols, 80))) + '\n';
    output += `${cWhite.bold(' [ SURVEILLANCE MATRIX // NODES ]')}\n`;

    // Lista compacta de contenedores clave con prioridad para servicios principales
    const priority = ['portal', 'godseye', 'osiris', 'providence-gods-eye-view', 'search', 'magnus-panel', 'kiwix', 'magnus-os', 'dockge', 'portainer', 'pihole', 'n8n', 'search-api'];
    const sortedKeys = [...contKeys].sort((a, b) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });
    const maxItems = termRows > 28 ? 10 : 7;
    const previewList = sortedKeys.slice(0, maxItems);
    if (previewList.length > 0) {
        previewList.forEach(k => {
            const c = telemetry.containers[k];
            const name = (c.name || k).padEnd(20).slice(0, 20);
            const status = c.running ? cGreen('[ONLINE]  ') : cRed('[STOPPED] ');
            const cpu = c.cpuPercent !== undefined ? `${String(c.cpuPercent).padStart(4)}% CPU` : '';
            const mem = c.memoryMB ? `${String(Math.round(c.memoryMB)).padStart(4)}MB` : '';
            output += `   ${status} ${cWhite(name)}  ${cYellow(cpu)}  ${cDim(mem)}\n`;
        });
    } else {
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('magnus_portal')}        ${cDim(':80, :8000')}\n`;
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('gods_eye_view')}        ${cDim(':4173')}\n`;
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('osiris')}               ${cDim(':3333')}\n`;
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('search-searxng')}       ${cDim(':8082')}\n`;
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('portal_telemetry')}     ${cDim(':8090')}\n`;
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('magnus_panel_web')}     ${cDim(':8081')}\n`;
        output += `   ${cGreen('[ONLINE]  ')} ${cWhite('kiwix_biblioteca')}     ${cDim(':8080')}\n`;
    }

    output += '\n' + cDim('─'.repeat(Math.min(termCols, 80))) + '\n';
    output += ` ${cYellow('FEED:')} ${cDim(eventText)}\n`;
    output += ` ${cCyan.bold('CONTROLES:')} Presiona ${cYellow.bold('q')} o ${cYellow.bold('Ctrl+C')} para salir a la terminal de Linux.\n`;

    process.stdout.write(output);
};

// Iniciar
enterAltScreen();
fetchTelemetry();
setInterval(fetchTelemetry, 1500);
setInterval(render, 100);
