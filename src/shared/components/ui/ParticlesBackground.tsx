import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ParticlesBackground = () => {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseRef     = useRef({ x: -9999, y: -9999 });
    const { theme }    = useTheme();

    useEffect(() => {
        const canvas    = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let frameCount = 0; // throttle: render every 2nd frame → ~30fps
        let particles: Particle[] = [];
        let width  = container.clientWidth;
        let height = container.clientHeight;

        // Colors per theme
        const isDark      = theme === 'dark';
        const GOLD        = '212,175,55';
        const LINE_COLOR  = isDark ? '255,255,255' : '15,23,42';

        // Lightweight symbols — pure ASCII/Unicode, no emoji (emoji are GPU-heavy in canvas)
        // Leaf-like shapes using text: ♦ ◆ ● · ✦ ✧ ◇
        const SYMBOLS = ['✦', '✧', '◆', '◇', '·', '•', '◦'];

        class Particle {
            x:      number;
            y:      number;
            vx:     number;
            vy:     number;
            size:   number;
            alpha:  number;
            symbol: string;
            // pre-computed sway offset so we don't call Math.sin per frame
            swayPhase:  number;
            swaySpeed:  number;

            constructor() {
                this.x         = Math.random() * width;
                this.y         = Math.random() * height;
                this.vx        = (Math.random() - 0.5) * 0.4;
                this.vy        = Math.random() * 0.35 + 0.08;
                this.size      = Math.random() * 9 + 6;
                this.alpha     = Math.random() * 0.3 + 0.15;
                this.symbol    = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = Math.random() * 0.008 + 0.003;
            }

            update() {
                // Sway via phase — avoids per-frame Math.sin(y) recalc
                this.swayPhase += this.swaySpeed;
                this.vx = Math.sin(this.swayPhase) * 0.25;

                this.x += this.vx;
                this.y += this.vy;

                if (this.y > height + 20) {
                    this.y      = -20;
                    this.x      = Math.random() * width;
                    this.vy     = Math.random() * 0.35 + 0.08;
                    this.symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                }
                if (this.x > width  + 20) this.x = -20;
                if (this.x < -20)         this.x = width + 20;
            }

            draw() {
                ctx!.font        = `${this.size}px sans-serif`;
                ctx!.fillStyle   = isDark ? `rgba(255,255,255,${this.alpha})` : `rgba(15,23,42,${this.alpha})`;
                ctx!.globalAlpha = 1;
                ctx!.fillText(this.symbol, this.x, this.y);
            }
        }

        const init = () => {
            particles = [];
            // Cap at 60 particles max — sufficient visual density, low CPU cost
            const count = Math.min(60, Math.floor((width * height) / 22000));
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            frameCount++;

            // Throttle to ~30fps (skip every other frame)
            if (frameCount % 2 !== 0) return;

            ctx.clearRect(0, 0, width, height);

            // Update & draw
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }

            // Lightweight connections: only near-mouse (skip particle-particle O(n²))
            const mouseX = mouseRef.current.x;
            const mouseY = mouseRef.current.y;
            if (mouseX > 0 && mouseY > 0) {
                const MOUSE_DIST = 160;
                for (let i = 0; i < particles.length; i++) {
                    const dx   = particles[i].x - mouseX;
                    const dy   = particles[i].y - mouseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MOUSE_DIST) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${GOLD},${(1 - dist / MOUSE_DIST) * 0.6})`;
                        ctx.lineWidth   = 0.8;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(mouseX, mouseY);
                        ctx.stroke();
                    }
                }
            }
        };

        const handleResize = () => {
            width  = container.clientWidth;
            height = container.clientHeight;
            canvas.width  = width;
            canvas.height = height;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0">
            <canvas ref={canvasRef} className="opacity-50" />
        </div>
    );
};
