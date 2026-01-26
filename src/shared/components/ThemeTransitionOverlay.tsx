import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface Props {
    isVisible: boolean;
    targetTheme: 'light' | 'dark';
}

export const ThemeTransitionOverlay: React.FC<Props> = ({ isVisible, targetTheme }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* The Curtain Background */}
                    <motion.div
                        initial={{ clipPath: "circle(0% at 50% 50%)" }}
                        animate={{ clipPath: "circle(150% at 50% 50%)" }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="fixed inset-0 z-[9999] pointer-events-none"
                        style={{
                            backgroundColor: targetTheme === 'dark' ? 'var(--color-bg-dark)' : 'var(--color-bg-light)'
                        }}
                    />

                    {/* The Icon Animation - Centered and on top */}
                    <motion.div
                        className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                    >
                        {targetTheme === 'dark' ? (
                            <Moon size={120} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                        ) : (
                            <Sun size={120} className="text-yellow-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
