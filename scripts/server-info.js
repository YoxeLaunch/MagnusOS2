import figlet from 'figlet';
import boxen from 'boxen';
import chalk from 'chalk';
import os from 'os';
import fs from 'fs';
import Docker from 'dockerode';

// --- PALETA DE COLORES "THE MACHINE" (PROVIDENCE) ---
const MACHINE_YELLOW = '#fde047';
const TACTICAL_AMBER = '#f59e0b';
const TACTICAL_GREEN = '#22c55e';
const TACTICAL_RED = '#ef4444';
const DIM_GRAY = '#777777';

const cYellow = chalk.hex(MACHINE_YELLOW);
const cAmber = chalk.hex(TACTICAL_AMBER);
const cGreen = chalk.hex(TACTICAL_GREEN);
const cRed = chalk.hex(TACTICAL_RED);
const cDim = chalk.hex(DIM_GRAY);

// --- HUD HELPERS ---
const makeBar = (percent, width = 10) => {
    const p = Math.max(0, Math.min(100, percent));
    const filled = Math.round((p / 100) * width);
    const empty = width - filled;
    const barStr = `${'■'.repeat(filled)}${'□'.repeat(empty)}`;
    if (p > 85) return cRed(`[${barStr}]`);
    if (p > 70) return cAmber(`[${barStr}]`);
    return cYellow(`[${barStr}]`);
};

const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
};

// --- HEADER PRINCIPAL ---
const printCyberEye = () => {
    const eye = [
        `       ${cYellow('┌──')}                                           ${cYellow('──┐')}`,
        `              ${cDim('. ─────────────────────────────── .')}`,
        `           ${cDim('. ´')}           ${cDim('\\')}     ${cDim('│')}     ${cDim('/')}           ${cDim('` .')}`,
        `          ${chalk.bold.white('/')}        ${chalk.bold.white('. ────┼─────┴─────┼──── .')}        ${chalk.bold.white('\\')}`,
        `     ${cYellow('─── [')}       ${chalk.bold.white('(       │   ')} ${cYellow.bold('(⦿)')} ${chalk.bold.white('   │       )')}       ${cYellow('] ───')}`,
        `          ${chalk.bold.white('\\')}        ${chalk.bold.white('` ────┼─────┬─────┼──── ´')}        ${chalk.bold.white('/')}`,
        `           ${cDim('` .')}           ${cDim('/')}     ${cDim('│')}     ${cDim('\\')}           ${cDim('. ´')}`,
        `              ${cDim('` ─────────────────────────────── ´')}`,
        `       ${cYellow('└──')}                                           ${cYellow('──┘')}`,
        `             ${cYellow.bold('[ TARGET_LOCK: NOMINAL // CAM-04 PRIMARY ]')}\n`
    ].join('\n');
    console.log(eye);
};

const printHeader = () => {
    printCyberEye();

    const termWidth = process.stdout.columns;
    const fontToUse = (termWidth && termWidth < 80) ? 'Slant' : 'ANSI Shadow';
    const ascii = figlet.textSync('PROVIDENCE', { font: fontToUse, horizontalLayout: 'full' });
    console.log(cYellow(ascii));
    
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const subheader = `      [ THE MACHINE // SURVEILLANCE & SYSTEM ARCHITECTURE ]\n`;
    console.log(chalk.bold.white(subheader));

    const statusRow = [
        chalk.bold.white('[SYS.IDENT: ') + cYellow.bold('PROVIDENCE') + chalk.bold.white(']'),
        chalk.bold.white('[STATUS: ') + cGreen.bold('ONLINE') + chalk.bold.white(']'),
        chalk.bold.white('[THREAT: ') + cGreen.bold('NOMINAL') + chalk.bold.white(']'),
        chalk.bold.white('[TIME: ') + cYellow(timeStr) + chalk.bold.white(']')
    ].join('   ');

    console.log(` ${statusRow}\n`);
};

// --- TELEMETRÍA Y RED ---
const getNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    const activeIps = [];
    const isVirtual = (name) => /^(docker|br-|veth|lo|virbr|tun|tap)/i.test(name);

    Object.keys(interfaces).sort().forEach((ifname) => {
        if (isVirtual(ifname)) return;
        interfaces[ifname].forEach((iface) => {
            if ('IPv4' !== iface.family || iface.internal !== false) return;
            activeIps.push({ name: ifname, ip: iface.address });
        });
    });

    if (activeIps.length === 0) {
        activeIps.push({ name: 'local', ip: '127.0.0.1' });
    }
    return activeIps;
};

const printSystemHUD = () => {
    // CPU Stats
    const cpus = os.cpus();
    const coreCount = cpus.length;
    const loadAvg = os.loadavg();
    const cpuPercent = Math.min(100, Math.round((loadAvg[0] / coreCount) * 100));

    // RAM Stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const totalGB = (totalMem / (1024 ** 3)).toFixed(1);
    const usedGB = (usedMem / (1024 ** 3)).toFixed(1);
    const ramPercent = Math.round((usedMem / totalMem) * 100);

    // Disk Stats
    let diskText = '';
    try {
        const stats = fs.statfsSync('/');
        const dTotal = (stats.bsize * stats.blocks) / (1024 ** 3);
        const dFree = (stats.bsize * stats.bfree) / (1024 ** 3);
        const dUsed = dTotal - dFree;
        const dPercent = Math.round((dUsed / dTotal) * 100);
        diskText = `${cYellow.bold('Disk Array:')}  ${makeBar(dPercent)} ${dUsed.toFixed(0)}GB / ${dTotal.toFixed(0)}GB (${dPercent}%)`;
    } catch {
        diskText = `${cYellow.bold('Disk Array:')}  [DATOS NO DISPONIBLES]`;
    }

    const uptimeStr = formatUptime(os.uptime());
    const localIps = getNetworkInfo();

    // Líneas HUD
    const hudCol1 = `${cYellow.bold('CPU Load:')}    ${makeBar(cpuPercent)} ${cpuPercent}% (${coreCount} cores, load: ${loadAvg[0].toFixed(2)})`;
    const hudCol2 = `${cYellow.bold('RAM Memory:')}  ${makeBar(ramPercent)} ${usedGB}GB / ${totalGB}GB (${ramPercent}%)`;
    const hudCol3 = `${cYellow.bold('Host Uptime:')} ${chalk.white(uptimeStr)}  ${cDim(`[Kernel: Linux ${os.release()}]`)}`;

    // Red
    let networkLines = `${cYellow('➜')}  ${chalk.bold('Portal Maestro:')}  ${chalk.underline.white('http://providence.local/')} ${cDim('(o http://localhost/)')}\n`;
    networkLines += `${cYellow('➜')}  ${chalk.bold('God\'s Eye View:')} ${chalk.underline.white('http://providence.local:4173/')}\n`;
    networkLines += `${cYellow('➜')}  ${chalk.bold('OSIRIS:')}          ${chalk.underline.white('http://providence.local:3333/')}\n`;
    networkLines += `${cYellow('➜')}  ${chalk.bold('Buscador Web:')}    ${chalk.underline.white('http://providence.local:8082/')}\n`;
    networkLines += `${cYellow('➜')}  ${chalk.bold('Telemetry API:')}   ${chalk.underline.white('http://providence.local:8090/api/telemetry')}\n`;

    localIps.forEach(net => {
        const label = net.name.startsWith('wl') ? 'Wi-Fi' : net.name.startsWith('en') ? 'Ethernet' : 'LAN';
        networkLines += `${cYellow('➜')}  ${chalk.bold(`${label} [${net.name}]:`)} ${chalk.underline.white(`http://${net.ip}/`)}\n`;
    });

    const svcRow1 = `  ${cYellow('•')} ${chalk.white('Portal:')}    ${cYellow(':80, :8000')}  ${cDim('|')}  ${cYellow('•')} ${chalk.white('God\'s Eye:')} ${cYellow(':4173')}  ${cDim('|')}  ${cYellow('•')} ${chalk.white('Search:')}    ${cYellow(':8082')}`;
    const svcRow2 = `  ${cYellow('•')} ${chalk.white('AI Studio:')} ${cYellow(':8081')}      ${cDim('|')}  ${cYellow('•')} ${chalk.white('Kiwix:')}      ${cYellow(':8080')}  ${cDim('|')}  ${cYellow('•')} ${chalk.white('Dokploy:')}   ${cYellow(':3000')}`;
    const svcRow3 = `  ${cYellow('•')} ${chalk.white('Dockge:')}    ${cYellow(':5001')}      ${cDim('|')}  ${cYellow('•')} ${chalk.white('Port:')}       ${cYellow(':9443')}  ${cDim('|')}  ${cYellow('•')} ${chalk.white('n8n:')}       ${cYellow(':5678')}`;
    const svcRow4 = `  ${cYellow('•')} ${chalk.white('Pi-hole:')}   ${cYellow(':443')}       ${cDim('|')}  ${cYellow('•')} ${chalk.white('OS2:')}        ${cYellow(':4000')}  ${cDim('|')}  ${cYellow('•')} ${chalk.white('Gateway:')}   ${cYellow(':8083')}`;
    const svcRow5 = `  ${cYellow('•')} ${chalk.white('OSIRIS:')}    ${cYellow(':3333')}       ${cDim('|')}  ${cYellow('•')} ${chalk.white('OSIRIS-Int:')} ${cYellow(':4440')}  ${cDim('|')}  ${cYellow('•')} ${chalk.white('OSIRIS-Cch:')}${cYellow(':8088')}`;

    const content = `
${chalk.bold.white('--- [ TELEMETRÍA DE HARDWARE ] ---')}
${hudCol1}
${hudCol2}
${diskText}
${hudCol3}

${chalk.bold.white('--- [ TOPOLOGÍA DE RED Y ACCESO ] ---')}
${networkLines.trim()}

${chalk.bold.white('--- [ DIRECTORIO DE SERVICIOS Y PROYECTOS ] ---')}
${svcRow1}
${svcRow2}
${svcRow3}
${svcRow4}
${svcRow5}
`.trim();

    console.log(boxen(content, {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'yellow',
        title: chalk.bold.hex(MACHINE_YELLOW)(' [ HARDWARE HUD & RED // PROVIDENCE ] '),
        titleAlignment: 'center'
    }));
};

// --- DOCKER SURVEILLANCE ---
const getContainerRawName = (c) => {
    if (c?.Names && Array.isArray(c.Names) && c.Names.length > 0 && c.Names[0]) {
        return c.Names[0];
    }
    if (c?.Labels?.['com.docker.swarm.task.name']) {
        return c.Labels['com.docker.swarm.task.name'];
    }
    if (c?.Labels?.['com.docker.swarm.service.name']) {
        return c.Labels['com.docker.swarm.service.name'];
    }
    if (c?.Labels?.['com.docker.compose.service']) {
        return c.Labels['com.docker.compose.service'];
    }
    if (c?.Image && typeof c.Image === 'string') {
        return c.Image.split(':')[0].split('/').pop();
    }
    if (c?.Id && typeof c.Id === 'string') {
        return c.Id.slice(0, 12);
    }
    return 'nodo_desconocido';
};

const cleanContainerName = (raw) => {
    if (!raw || typeof raw !== 'string') return 'desconocido';
    let name = raw.replace(/^\//, '');
    name = name.replace(/^[a-f0-9]{12}_/, '');
    const swarmMatch = name.match(/^(.+)\.(\d+)\.[a-z0-9]{20,}$/i);
    return swarmMatch ? `${swarmMatch[1]} #${swarmMatch[2]}` : name;
};

const cleanStatus = (s) => {
    if (!s || typeof s !== 'string') return 'desconocido';
    return s
        .replace(/About an hour/i, '1h')
        .replace(/hours?/i, 'h')
        .replace(/minutes?/i, 'm')
        .replace(/seconds?/i, 's')
        .replace(/\(healthy\)/i, chalk.green('✓'))
        .replace(/\(unhealthy\)/i, chalk.red('✗'))
        .replace(/\s+/g, ' ')
        .trim();
};

const statusStyle = (state, status) => {
    const cleanDesc = cleanStatus(status);
    const st = (state || '').toLowerCase();
    if (st === 'running') {
        if (/unhealthy/i.test(status || '')) return { badge: cAmber('[DEGRADED]'), text: chalk.yellow(cleanDesc) };
        if (/health: starting/i.test(status || '')) return { badge: chalk.cyan('[STARTING]'), text: chalk.cyan(cleanDesc) };
        return { badge: cGreen('[ONLINE]  '), text: chalk.white(cleanDesc) };
    }
    if (st === 'restarting') return { badge: cAmber('[RESTART] '), text: chalk.yellow(cleanDesc) };
    if (st === 'dead') return { badge: cRed('[DEAD]    '), text: chalk.red(cleanDesc) };
    return { badge: cDim('[HALTED]  '), text: chalk.dim(cleanDesc) };
};

const printDockerSurveillance = async () => {
    let containers;
    try {
        const docker = new Docker();
        containers = await docker.listContainers({ all: true });
    } catch (err) {
        console.log(boxen(cRed('Docker Daemon fuera de línea o inaccesible.'), {
            padding: 1, margin: 1, borderStyle: 'round', borderColor: 'red',
            title: ' [ DOCKER SURVEILLANCE MATRIX ] ', titleAlignment: 'center'
        }));
        return;
    }

    if (!Array.isArray(containers) || containers.length === 0) {
        console.log(boxen(cDim('No se detectaron nodos activos en la matriz.'), {
            padding: 1, margin: 1, borderStyle: 'round', borderColor: 'gray',
            title: ' [ DOCKER SURVEILLANCE MATRIX ] ', titleAlignment: 'center'
        }));
        return;
    }

    // Filtrar réplicas muertas de servicios que ya están activos para evitar saturar la matriz
    const activeNames = new Set(
        containers
            .filter(c => c.State === 'running')
            .map(c => cleanContainerName(getContainerRawName(c)))
    );
    const uniqueContainers = containers.filter(c => {
        if (c.State === 'running') return true;
        const name = cleanContainerName(getContainerRawName(c));
        return !activeNames.has(name);
    });

    // Ordenar: primero los en ejecución
    uniqueContainers.sort((a, b) => (a.State === 'running' ? 0 : 1) - (b.State === 'running' ? 0 : 1));

    const runningCount = uniqueContainers.filter(c => c.State === 'running').length;
    const nameWidth = 24;

    const lines = uniqueContainers.map((c) => {
        const name = cleanContainerName(getContainerRawName(c)).padEnd(nameWidth).slice(0, nameWidth);
        const { badge, text } = statusStyle(c.State, c.Status);
        const ports = (c.Ports || [])
            .filter(p => p && p.PublicPort)
            .map(p => p.PublicPort)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, 3)
            .join(', ');
        const portsText = ports ? cYellow(`  :${ports}`) : '';
        return ` ${badge} ${chalk.bold.white(name)}  ${text}${portsText}`;
    });

    const summary = chalk.bold.white(`[VIGILANCIA: `) +
        cGreen.bold(`${runningCount} ACTIVOS`) +
        chalk.bold.white(` // `) +
        cDim(`${uniqueContainers.length - runningCount} EN ESPERA`) +
        chalk.bold.white(` // TOTAL: ${uniqueContainers.length} NODOS]`);

    console.log(boxen(`${lines.join('\n')}\n\n${summary}`, {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'yellow',
        title: chalk.bold.hex(MACHINE_YELLOW)(' [ DOCKER SURVEILLANCE MATRIX ] '),
        titleAlignment: 'center'
    }));
};

// --- EJECUCIÓN PRINCIPAL ---
printHeader();
printSystemHUD();
await printDockerSurveillance();

const callout = boxen(
    `${cYellow.bold('>> MONITOR EN VIVO:')} Escribe ${chalk.bold.white("'providence'")} o ${chalk.bold.white("'hud'")} para activar la matriz táctica en tiempo real.`,
    {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'single',
        borderColor: 'yellow'
    }
);
console.log(callout);

