import concurrently from 'concurrently';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import chalk from 'chalk';
import os from 'os';
import { Writable } from 'stream';

// --- CONFIGURATION ---
const SERVICES = {
    SERVER: { name: 'CEREBRO', status: 'WAITING...', color: 'magenta', url: 'http://localhost:4001' },
    CLIENT: { name: 'INTERFAZ', status: 'WAITING...', color: 'cyan', url: 'http://localhost:4000' },
    TUNNEL: { name: 'RED GLOBAL', status: 'WAITING...', color: 'yellow', url: null } // URL captured dynamically
};

let isTunnelReady = false;

// --- UI HELPERS ---
const clearScreen = () => console.clear();

const printHeader = () => {
    const title = figlet.textSync(' MAGNUS  OS ', { font: 'ANSI Shadow', horizontalLayout: 'full' });
    console.log(gradient('cyan', 'magenta').multiline(title));
    console.log(gradient.atlas('       v 2 . 1   -   S i s t e m a   I n t e g r a l   d e   G e s t i ó n \n'));
};

const getNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname].forEach((iface) => {
            if ('IPv4' !== iface.family || iface.internal !== false) return;
            ipAddress = iface.address;
        });
    });
    return ipAddress;
};

const printStatusBox = () => {
    const localIp = getNetworkInfo();
    const tunnelUrl = SERVICES.TUNNEL.url || chalk.dim('Esperando conexión...');
    const tunnelStatus = SERVICES.TUNNEL.url ? chalk.bold.green('EN LÍNEA') : chalk.yellow('CONECTANDO...');

    const infoText = `
${chalk.bold.white('ACCESO LOCAL:')}
${chalk.cyan('➜')}  Panel:      ${chalk.underline.white(`http://localhost:4000`)}
${chalk.cyan('➜')}  Red Local:  ${chalk.underline.white(`http://${localIp}:4000`)}

${chalk.bold.white('ACCESO REMOTO:')}
${chalk.yellow('➜')}  Cloudflare: ${chalk.underline.yellow(tunnelUrl)}
${chalk.dim('     Estado:')}     ${tunnelStatus}

${chalk.gray('----------------------------------------')}
${chalk.bold.magenta(SERVICES.SERVER.name)}: ${SERVICES.SERVER.status}
${chalk.bold.cyan(SERVICES.CLIENT.name)}: ${SERVICES.CLIENT.status}
`;

    console.log(boxen(infoText, {
        padding: 1, margin: 1, borderStyle: 'round', borderColor: SERVICES.TUNNEL.url ? 'green' : 'cyan',
        title: ` ESTADO DEL SISTEMA `, titleAlignment: 'center'
    }));
};

// --- LOG PARSING ---
// Custom stream to intercept logs and update status
const logInterceptor = new Writable({
    write(chunk, encoding, callback) {
        const line = chunk.toString();

        // Pass through to stdout (keep logs visible)
        process.stdout.write(line);

        // Analyze Line
        if (line.includes('SistemaM Server Modular')) {
            SERVICES.SERVER.status = chalk.green('ONLINE');
        }

        if (line.includes('Local:') && line.includes('http://localhost')) {
            SERVICES.CLIENT.status = chalk.green('ONLINE');
        }

        // Cloudflare URL capture
        const tunnelMatch = line.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/);
        if (tunnelMatch) {
            SERVICES.TUNNEL.url = tunnelMatch[1];
            SERVICES.TUNNEL.status = chalk.green('ONLINE');
            if (!isTunnelReady) {
                isTunnelReady = true;
                // Reprint header and box when tunnel is ready to make it obvious
                console.log('\n\n');
                console.log(chalk.green.bold('>>> TÚNEL CLOUDFLARE ESTABLECIDO <<<'));
                printStatusBox();
            }
        }

        callback();
    }
});

// --- MAIN EXECUTION ---
clearScreen();
printHeader();
printStatusBox();

console.log(chalk.bold.white('\n🚀 INICIANDO SERVICIOS... \n'));

const { result } = concurrently(
    [
        { command: 'npm run server', name: 'BACKEND', prefixColor: 'magenta' },
        { command: 'npm run dev', name: 'FRONTEND', prefixColor: 'cyan' },
        { command: 'cloudflared tunnel --url http://localhost:4000 || echo "Cloudflared not found (skipped)"', name: 'TUNNEL', prefixColor: 'yellow' }
    ],
    {
        prefix: 'name',
        killOthers: ['failure'],
        restartTries: 3,
        outputStream: logInterceptor // Intercept output
    }
);

result.then(
    () => console.log(chalk.green('\n✅ Sistema detenido.')),
    () => console.log(chalk.red('\n❌ Error en ejecución.'))
);
