import { listContainers, getContainerStats, getDockerInstance } from '../services/dockerService.js';

export const initDockerSocket = (io) => {
    const dockerNamespace = io.of('/docker');

    dockerNamespace.on('connection', (socket) => {
        console.log('[DockerSocket] Client connected:', socket.id);
        let statusInterval = null;
        let stream = null;

        // --- Container Management ---
        socket.on('list-containers', async (callback) => {
            const containers = await listContainers();
            if (typeof callback === 'function') callback(containers);
            else socket.emit('containers-list', containers);
        });

        // --- Stats Streaming ---
        socket.on('subscribe-stats', async (containerId) => {
            // Clear existing interval if any
            if (statusInterval) clearInterval(statusInterval);

            console.log(`[DockerSocket] Subscribing to stats for ${containerId}`);

            // Initial emit
            const stats = await getContainerStats(containerId);
            socket.emit('container-stats', { id: containerId, stats });

            // Poll every 2 seconds
            statusInterval = setInterval(async () => {
                const liveStats = await getContainerStats(containerId);
                socket.emit('container-stats', { id: containerId, stats: liveStats });
            }, 2000);
        });

        socket.on('unsubscribe-stats', () => {
            if (statusInterval) clearInterval(statusInterval);
            statusInterval = null;
        });

        // --- Terminal Streaming ---
        socket.on('terminal-init', async ({ containerId }) => {
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
            if (stream) stream.end();
        });
    });
};
