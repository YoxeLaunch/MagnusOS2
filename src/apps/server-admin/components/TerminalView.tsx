import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useDocker } from '../context/DockerContext';
import '@xterm/xterm/css/xterm.css';

interface Props {
    containerId: string;
}

export const TerminalView: React.FC<Props> = ({ containerId }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const { socket } = useDocker();
    const xtermRef = useRef<Terminal | null>(null);

    useEffect(() => {
        if (!terminalRef.current || !socket) return;

        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#0f1219',
                foreground: '#cbe0f0',
                cursor: '#ff00aa',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();
        xtermRef.current = term;

        // Subscribe to container terminal
        socket.emit('terminal-init', { containerId });

        term.onData((data) => {
            socket.emit('terminal-input', data);
        });

        const handleOutput = (data: string) => {
            term.write(data);
        };

        socket.on('terminal-output', handleOutput);

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            socket.off('terminal-output', handleOutput);
            window.removeEventListener('resize', handleResize);
            term.dispose();
            socket.emit('terminal-exit'); // Optional cleanup
        };
    }, [containerId, socket]);

    return (
        <div ref={terminalRef} className="w-full h-full" />
    );
};
