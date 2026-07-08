import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import chalk from 'chalk';
import os from 'os';
import Docker from 'dockerode';

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

const cleanContainerName = (raw) => {
    const name = raw.replace(/^\//, '');
    // Strip Docker Swarm-style suffix: name.<replica>.<taskid>
    const swarmMatch = name.match(/^(.+)\.(\d+)\.[a-z0-9]{20,}$/i);
    return swarmMatch ? `${swarmMatch[1]} #${swarmMatch[2]}` : name;
};

const statusStyle = (state, status) => {
    if (state === 'running') {
        if (/unhealthy/i.test(status)) return { icon: chalk.yellow('●'), text: chalk.yellow(status) };
        if (/health: starting/i.test(status)) return { icon: chalk.cyan('●'), text: chalk.cyan(status) };
        return { icon: chalk.green('●'), text: chalk.green(status) };
    }
    if (state === 'restarting') return { icon: chalk.yellow('◐'), text: chalk.yellow(status) };
    return { icon: chalk.red('○'), text: chalk.dim.red(status) };
};

const printDockerStatus = async () => {
    let containers;
    try {
        const docker = new Docker();
        containers = await docker.listContainers({ all: true });
    } catch (err) {
        console.log(boxen(chalk.red('Docker no disponible en este host.'), {
            padding: 1, margin: 1, borderStyle: 'round', borderColor: 'red',
            title: ' CONTENEDORES DOCKER ', titleAlignment: 'center'
        }));
        return;
    }

    if (containers.length === 0) {
        console.log(boxen(chalk.dim('No hay contenedores.'), {
            padding: 1, margin: 1, borderStyle: 'round', borderColor: 'gray',
            title: ' CONTENEDORES DOCKER ', titleAlignment: 'center'
        }));
        return;
    }

    containers.sort((a, b) => (a.State === 'running' ? 0 : 1) - (b.State === 'running' ? 0 : 1));

    const runningCount = containers.filter(c => c.State === 'running').length;
    const nameWidth = Math.min(28, Math.max(...containers.map(c => cleanContainerName(c.Names[0]).length)));

    const lines = containers.map((c) => {
        const name = cleanContainerName(c.Names[0]).padEnd(nameWidth).slice(0, nameWidth);
        const { icon, text } = statusStyle(c.State, c.Status);
        const ports = (c.Ports || [])
            .filter(p => p.PublicPort)
            .map(p => p.PublicPort)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(', ');
        const portsText = ports ? chalk.dim(`  :${ports}`) : '';
        return `${icon} ${chalk.white(name)}  ${text}${portsText}`;
    });

    const summary = chalk.bold.white(`${runningCount}/${containers.length} en ejecución`);

    console.log(boxen(`${lines.join('\n')}\n\n${summary}`, {
        padding: 1, margin: 1, borderStyle: 'round', borderColor: runningCount === containers.length ? 'green' : 'yellow',
        title: ' CONTENEDORES DOCKER ', titleAlignment: 'center'
    }));
};

// --- MAIN EXECUTION ---
printHeader();
printStatusBox();
await printDockerStatus();
