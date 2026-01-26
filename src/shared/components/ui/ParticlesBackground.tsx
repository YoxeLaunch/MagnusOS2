import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ParticlesBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 }); // Start off-screen
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let width = container.clientWidth;
        let height = container.clientHeight;

        const PARTICLE_COLOR = theme === 'dark' ? '#ffffff' : '#0f172a'; // White or Slate-900
        const LINE_COLOR = theme === 'dark' ? '255, 255, 255' : '15, 23, 42';

        const SNOWFLAKES = ['❄', '❅', '❆', '✨'];  // Snowflake symbols

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            symbol: string;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5; // Slight drift
                this.vy = Math.random() * 0.5 + 0.2;   // Fall down speed
                this.size = Math.random() * 10 + 8;    // Size for text
                this.symbol = SNOWFLAKES[Math.floor(Math.random() * SNOWFLAKES.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Swaying effect
                this.vx += (Math.random() - 0.5) * 0.01;
                // Limit horizontal speed
                if (Math.abs(this.vx) > 0.5) this.vx *= 0.9;

                // Wrap around bottom
                if (this.y > height) {
                    this.y = -10;
                    this.x = Math.random() * width;
                    // Reset speed variation
                    this.vy = Math.random() * 0.5 + 0.2;
                }

                // Wrap horizontal
                if (this.x > width) this.x = 0;
                if (this.x < 0) this.x = width;
            }

            draw() {
                if (!ctx) return;
                ctx.font = `${this.size}px serif`;
                ctx.fillStyle = PARTICLE_COLOR;
                ctx.globalAlpha = 0.6;
                ctx.fillText(this.symbol, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        }

        const init = () => {
            particles = [];
            // Density calculation - fewer flakes than dots as they are bigger
            const count = Math.floor((width * height) / 15000);
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Connections
            const connectDistance = 150;
            const mouseDistance = 200;

            for (let i = 0; i < particles.length; i++) {
                // Connect to other particles
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${LINE_COLOR}, ${1 - dist / connectDistance})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }

                // Connect to mouse
                const dx = particles[i].x - mouseRef.current.x;
                const dy = particles[i].y - mouseRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouseDistance) {
                    ctx.beginPath();
                    // Stronger connection to mouse
                    ctx.strokeStyle = `rgba(${theme === 'dark' ? '212, 175, 55' : '212, 175, 55'}, ${1 - dist / mouseDistance})`; // Gold connection to mouse
                    ctx.lineWidth = 1;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
                    ctx.stroke();

                    // Small attraction effect
                    /*
                    if (dist > 50) {
                        particles[i].vx += (mouseRef.current.x - particles[i].x) * 0.0001;
                        particles[i].vy += (mouseRef.current.y - particles[i].y) * 0.0001;
                    }
                    */
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            width = container.clientWidth;
            height = container.clientHeight;
            canvas.width = width;
            canvas.height = height;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Must account for relative position if container is not full screen, 
            // but here we assume background is full screen fixed/absolute.
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
    }, [theme]); // Re-init on theme change to update colors

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0">
            <canvas ref={canvasRef} className="opacity-40 hover:opacity-100 transition-opacity duration-500" />
        </div>
    );
};
