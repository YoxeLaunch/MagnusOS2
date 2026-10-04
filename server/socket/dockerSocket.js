import { listContainers, getContainerStats, getDockerInstance } from '../services/dockerService.js';
import { getGlobalStats } from '../services/systemService.js';
import { socketAuthMiddleware } from './chatHandler.js';

export const initDockerSocket = (io) => {
    const dockerNamespace = io.of('/docker');

    // 1. JWT Authentication on Handshake
    dockerNamespace.use(socketAuthMiddleware);

    // 2. Strict Admin Role Authorization
    dockerNamespace.use((socket, next) => {
        const isAdmin = socket.user?.role === 'admin' || socket.user?.username?.toLowerCase() === 'soberano';
        if (!isAdmin) {
            console.warn(`[SECURITY:DOCKER] Denied /docker connection to non-admin: ${socket.user?.username}`);
            return next(new Error('Acceso denegado: Solo administradores tienen acceso al namespace /docker'));
        }
        next();
    });

    dockerNamespace.on('connection', (socket) => {
        console.log('[DockerSocket] Admin client connected:', socket.user?.username, socket.id);
        let statusInterval = null;
        let systemInterval = null;
        let stream = null;

        // --- Container Management ---
        socket.on('list-containers', async (callback) => {
            const containers = await listContainers();
            if (typeof callback === 'function') callback(containers);
            else socket.emit('containers-list', containers);
        });

        // --- Global System Stats (HUD) ---
        socket.on('subscribe-system-stats', () => {
            if (systemInterval) clearInterval(systemInterval);

            socket.emit('system-stats', getGlobalStats());
            systemInterval = setInterval(() => {
                socket.emit('system-stats', getGlobalStats());
            }, 4000);
        });

        socket.on('unsubscribe-system-stats', () => {
            if (systemInterval) clearInterval(systemInterval);
            systemInterval = null;
        });

        // --- Stats Streaming ---
        socket.on('subscribe-stats', async (containerId) => {
            if (statusInterval) clearInterval(statusInterval);

            console.log(`[DockerSocket] Subscribing to stats for ${containerId}`);

            const stats = await getContainerStats(containerId);
            socket.emit('container-stats', { id: containerId, stats });

            statusInterval = setInterval(async () => {
                const liveStats = await getContainerStats(containerId);
                socket.emit('container-stats', { id: containerId, stats: liveStats });
            }, 2000);
        });

        socket.on('unsubscribe-stats', () => {
            if (statusInterval) clearInterval(statusInterval);
            statusInterval = null;
        });

        // --- Terminal Streaming (DENY BY DEFAULT) ---
        socket.on('terminal-init', async ({ containerId }) => {
            // DENY BY DEFAULT unless explicitly enabled via environment variable
            if (process.env.ENABLE_DOCKER_TERMINAL !== 'true') {
                console.warn(`[SECURITY:DOCKER] Terminal exec blocked for container ${containerId}. ENABLE_DOCKER_TERMINAL is not enabled.`);
                socket.emit('terminal-error', 'Terminal Docker deshabilitada por defecto por política de seguridad');
                return;
            }

            const docker = getDockerInstance();
            if (!docker) return;

            try {
                const container = docker.getContainer(containerId);

                // Exec options
                const exec = await container.exec({
                    AttachStdin: true,
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: true,
                    Cmd: ['/bin/sh', '-c', 'if [ -x /bin/bash ]; then exec /bin/bash; else exec /bin/sh; fi']
                    // Try bash, fallback to sh. Some alpine containers only have sh.
                });

                // Start exec
                stream = await exec.start({ hijack: true, stdin: true });

                // Pipe output to socket
                // Dockerode streams are duplex
                docker.modem.demuxStream(stream, socket, socket); // This might not work directly for TTY

                // For TTY we just read directly
                stream.on('data', (chunk) => {
                    socket.emit('terminal-output', chunk.toString('utf8'));
                });

                stream.on('end', () => {
                    socket.emit('terminal-exit');
                });

                console.log(`[DockerSocket] Terminal attached to ${containerId}`);

            } catch (err) {
                console.error('[DockerSocket] Terminal error:', err);
                socket.emit('terminal-error', err.message);
            }
        });

        socket.on('terminal-input', (data) => {
            if (stream) {
                stream.write(data);
            }
        });

        socket.on('terminal-resize', ({ cols, rows }) => {
            // Resize is tricky with dockerode execution if not started with correct dimensions
            // Often ignored in simple implementations
        });

        socket.on('disconnect', () => {
            console.log('[DockerSocket] Client disconnected');
            if (statusInterval) clearInterval(statusInterval);
            if (systemInterval) clearInterval(systemInterval);
            if (stream) stream.end();
        });
    });
};
