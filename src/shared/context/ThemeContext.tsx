import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeTransitionOverlay } from '../components/ThemeTransitionOverlay';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                return savedTheme;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark'; // Default to dark preference for this user profile if unsure
    });

    const [isTransitioning, setIsTransitioning] = useState(false);
    // When transitioning STARTS, we are "going to" the opposite of current theme
    // We hold this value so the overlay color doesn't flip mid-transition
    const [transitionTarget, setTransitionTarget] = useState<Theme>(theme);

    useEffect(() => {
        const root = window.document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light'); // Optional but sometimes useful
            root.classList.remove('dark');
        }

        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        if (isTransitioning) return; // Prevent double clicks

        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTransitionTarget(nextTheme);
        setIsTransitioning(true);

        // Timeline:
        // 0ms: Start transition (Curtain enters)
        // 500ms: Curtain covers screen. Switch underlying theme.
        // 1000ms: Curtain finishes exit animation (managed by AnimatePresence?) 
        // Actually, we need to wait for enter to finish, then switch, then exit.

        setTimeout(() => {
            setTheme(nextTheme);

            // Give DOM a moment to repaint with new theme behind the curtain
            setTimeout(() => {
                setIsTransitioning(false); // Triggers curtain exit
            }, 100);
        }, 500); // Matches approx half of animation duration
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
            <ThemeTransitionOverlay isVisible={isTransitioning} targetTheme={transitionTarget} />
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
