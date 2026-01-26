import React, { createContext, useContext, useEffect, useState } from 'react';

interface TimeContextType {
    timeOffset: number;
    currentTime: Date;
    isSynced: boolean;
}

const TimeContext = createContext<TimeContextType>({
    timeOffset: 0,
    currentTime: new Date(),
    isSynced: false
});

export const useTime = () => useContext(TimeContext);

export const TimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [timeOffset, setTimeOffset] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSynced, setIsSynced] = useState(false);

    useEffect(() => {
        const syncTime = async (retries = 3) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout per request

                const res = await fetch('https://worldtimeapi.org/api/ip', {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error('API Error');

                const data = await res.json();
                if (data.datetime) {
                    const serverTime = new Date(data.datetime).getTime();
                    const deviceTime = Date.now();
                    const offset = serverTime - deviceTime;

                    setTimeOffset(offset);
                    setIsSynced(true);
                    console.log(`[TimeSync] Synced! Offset: ${offset}ms`);
                }
            } catch (error) {
                console.warn(`[TimeSync] Failed. Retries left: ${retries}`, error);
                if (retries > 0) {
                    // Non-blocking retry - don't await, let the app continue
                    setTimeout(() => syncTime(retries - 1), 2000);
                } else {
                    // After all retries, just use device time
                    setIsSynced(true);
                    console.log('[TimeSync] Using device time as fallback');
                }
            }
        };

        syncTime();
    }, []);

    // Update global clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date(Date.now() + timeOffset));
        }, 1000);
        return () => clearInterval(timer);
    }, [timeOffset]);

    return (
        <TimeContext.Provider value={{ timeOffset, currentTime, isSynced }}>
            {children}
        </TimeContext.Provider>
    );
};
