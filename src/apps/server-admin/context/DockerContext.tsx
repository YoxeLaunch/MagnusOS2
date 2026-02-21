import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface DockerContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const DockerContext = createContext<DockerContextType>({ socket: null, isConnected: false });

export const useDocker = () => useContext(DockerContext);

export const DockerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Connect to the /docker namespace
        // Use relative path to avoid CORS/Port issues in production
        // The socket is served by the same express instance
        const socketInstance = io(`${window.location.protocol}//${window.location.hostname}:${window.location.port}/docker`, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        socketInstance.on('connect', () => {
            console.log('[DockerClient] Connected');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('[DockerClient] Disconnected');
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <DockerContext.Provider value={{ socket, isConnected }}>
            {children}
        </DockerContext.Provider>
    );
};
