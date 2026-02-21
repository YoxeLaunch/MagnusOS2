import Docker from 'dockerode';
import fs from 'fs';

// Initialize Docker client
// We use the socket mounted in the container
const socketPath = '/var/run/docker.sock';
let docker = null;

if (fs.existsSync(socketPath)) {
    try {
        docker = new Docker({ socketPath });
        console.log('[DockerService] Connected to Docker Socket');
    } catch (err) {
        console.error('[DockerService] Failed to connect to socket:', err);
    }
} else {
    console.warn('[DockerService] Docker socket not found at', socketPath);
}

export const listContainers = async () => {
    if (!docker) return [];
    try {
        const containers = await docker.listContainers({ all: true });
        return containers;
    } catch (error) {
        console.error('[DockerService] Error listing containers:', error);
        return [];
    }
};

export const getContainerStats = async (containerId) => {
    if (!docker) return null;
    try {
        const container = docker.getContainer(containerId);
        const stats = await container.stats({ stream: false });
        // Calculate CPU %
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const numberCpus = stats.cpu_stats.online_cpus || 1;

        let cpuPercent = 0.0;
        if (systemCpuDelta > 0.0 && cpuDelta > 0.0) {
            cpuPercent = (cpuDelta / systemCpuDelta) * numberCpus * 100.0;
        }

        // Memory Usage
        const memoryUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
        const memoryLimit = stats.memory_stats.limit;
        const memoryPercent = (memoryUsage / memoryLimit) * 100.0;

        return {
            cpu: cpuPercent.toFixed(2),
            memory: (memoryUsage / 1024 / 1024).toFixed(2), // MB
            memoryLimit: (memoryLimit / 1024 / 1024).toFixed(2), // MB
            memoryPercent: memoryPercent.toFixed(2),
            netIO: stats.networks ? stats.networks : {}
        };
    } catch (error) {
        // console.error(`[DockerService] Error stats for ${containerId}:`, error.message);
        return null; // Container might be stopped
    }
};

export const getDockerInstance = () => docker;
