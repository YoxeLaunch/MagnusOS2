import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        base: '/',
        server: {
            port: 4000,
            host: '0.0.0.0',
            allowedHosts: true,
            proxy: {
                '/api': {
                    target: 'http://localhost:4001',
                    changeOrigin: true,
                    secure: false,
                },
                '/socket.io': {
                    target: 'http://localhost:3001',
                    ws: true,
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
        plugins: [react()],
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                        'vendor-ui': ['framer-motion', 'lucide-react', 'recharts'],
                        'vendor-utils': ['date-fns', 'socket.io-client', 'i18next']
                    }
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@finanza': path.resolve(__dirname, './src/apps/finanza'),
                '@magnus': path.resolve(__dirname, './src/apps/magnus'),
            }
        }
    }
});
