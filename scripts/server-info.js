import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import chalk from 'chalk';
import os from 'os';

// --- UI HELPERS ---
const printHeader = () => {
    const title = figlet.textSync(' MAGNUS  OS ', { font: 'ANSI Shadow', horizontalLayout: 'full' });
    console.log(gradient('cyan', 'magenta').multiline(title));
    console.log(gradient.atlas('       v 2 . 1   -   S i s t e m a   I n t e g r a l   d e   G e s t i ó n \n'));
};

const getNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    let ipAddresses = [];
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname].forEach((iface) => {
            if ('IPv4' !== iface.family || iface.internal !== false) return;
            ipAddresses.push({ name: ifname, ip: iface.address });
        });
    });
    // Fallback if no network is found
    if (ipAddresses.length === 0) {
        ipAddresses.push({ name: 'local', ip: 'localhost' });
    }
    return ipAddresses;
};

const printStatusBox = () => {
    const localIps = getNetworkInfo();

    let localAccessLines = `${chalk.cyan('➜')}  Panel:      ${chalk.underline.white('http://localhost:4000')}\n`;
    localAccessLines += `${chalk.cyan('➜')}  Dominio:    ${chalk.underline.white('http://Manus.local:4000')} ${chalk.dim('(mDNS)')}\n`;

    localIps.forEach(net => {
        localAccessLines += `${chalk.cyan('➜')}  Red [${net.name}]: ${chalk.underline.white(`http://${net.ip}:4000`)}\n`;
    });

    const infoText = `
${chalk.bold.white('ACCESO LOCAL:')}
${localAccessLines.trim()}
`;

    console.log(boxen(infoText, {
        padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan',
        title: ' ESTADO DEL SISTEMA ', titleAlignment: 'center'
    }));
};

// --- MAIN EXECUTION ---
printHeader();
printStatusBox();
