import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Trophy, Users, ArrowRight } from 'lucide-react';

export const Landing = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Animations based on scroll
    // 0 to 0.4: Arms open (Redeemer pose)
    // 0.4 to 0.8: Content fades in

    // Arm Rotation: Starts close to body (80deg), opens to horizontal/up (-10deg)
    const leftArmRotation = useTransform(scrollYProgress, [0, 0.4], [80, -10]);
    const rightArmRotation = useTransform(scrollYProgress, [0, 0.4], [-80, 10]);

    // Halo/Sun Scale (Grows behind head)
    const haloScale = useTransform(scrollYProgress, [0, 0.4], [0.5, 1.2]);
    const haloOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

    // Opacity of hero text (fades out as you scroll)
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

    // Opacity of content (fades in after arms open)
    const contentOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
    const contentY = useTransform(scrollYProgress, [0.3, 0.5], [100, 0]);

    return (
        <div className="bg-slate-950 text-white min-h-[300vh] relative overflow-x-hidden font-sans selection:bg-theme-gold selection:text-black">

            {/* STICKY CONTAINER FOR ANIMATION */}
            <div className="fixed inset-0 w-full h-screen flex items-center justify-center pointer-events-none">

                {/* BACKGROUND GRID */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>

                {/* HERO TEXT */}
                <motion.div
                    style={{ opacity: heroOpacity }}
                    className="absolute top-24 text-center z-10"
                >
                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-theme-gold/10 text-theme-gold mb-6 border border-theme-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.2)] animate-pulse">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 uppercase mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        Magnus
                    </h1>
                    <p className="text-xl text-theme-gold/80 font-mono tracking-widest uppercase">
                        Protocolo de Soberanía
                    </p>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="mt-12"
                    >
                        <ChevronDown className="w-8 h-8 text-white/30 mx-auto" />
                    </motion.div>
                </motion.div>

                {/* SVG SILHOUETTE (THE REDEEMER STYLE) */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 800 800"
                    className="w-full h-full max-w-[1000px] max-h-[1000px] absolute bottom-[-15%] md:bottom-[-10%]"
                    preserveAspectRatio="xMidYMax slice"
                    style={{ filter: "drop-shadow(0 0 30px rgba(212, 175, 55, 0.15))" }}
                >
                    <defs>
                        <linearGradient id="robeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#222" />
                            <stop offset="100%" stopColor="#050505" />
                        </linearGradient>
                        <radialGradient id="haloGradient" cx="50%" cy="50%" r="50%">
                            <stop offset="60%" stopColor="rgba(212, 175, 55, 0)" />
                            <stop offset="90%" stopColor="rgba(212, 175, 55, 0.3)" />
                            <stop offset="100%" stopColor="rgba(212, 175, 55, 0)" />
                        </radialGradient>
                    </defs>

                    {/* --- HALO / SUN BEHIND HEAD --- */}
                    <motion.circle
                        cx="400" cy="280"
                        r="120"
                        fill="url(#haloGradient)"
                        style={{ scale: haloScale, opacity: haloOpacity }}
                        className="animate-pulse duration-[4000ms]"
                    />

                    {/* --- TORSO & HEAD (Static) --- */}
                    <g transform="translate(400, 400)">
                        {/* Head */}
                        <path d="M-25,-120 C-25,-150 25,-150 25,-120 C25,-100 15,-80 0,-80 C-15,-80 -25,-100 -25,-120 Z" fill="#151515" stroke="#333" strokeWidth="2" />

                        {/* Robed Body (Central Column) */}
                        <path d="M-40,-80 L40,-80 C50,-20 60,100 80,400 L-80,400 C-60,100 -50,-20 -40,-80 Z" fill="url(#robeGradient)" stroke="#333" strokeWidth="1" />

                        {/* Robe Folds (Details) */}
                        <path d="M-20,-80 Q-30,100 -40,400" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <path d="M20,-80 Q30,100 40,400" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    </g>

                    {/* --- LEFT ARM (Animated) - Robed Sleeve --- */}
                    {/* Pivot point at Shoulder: approx (360, 320) in viewBox */}
                    <motion.g
                        style={{
                            rotate: leftArmRotation,
                            originX: "360px",
                            originY: "320px"
                        }}
                    >
                        {/* New Arm Geometry relative to pivot 360,320 */}
                        <g transform="translate(360, 320)">
                            {/* Upper Arm / Sleeve */}
                            {/* Draws downwards initially */}
                            <path d="M0,0 L-20,150 Q20,160 40,140 Z" fill="url(#robeGradient)" stroke="#333" />
                            {/* Forearm / Sleeve opening */}
                            <path d="M-20,150 L-30,250 L10,240 L10,140 Z" fill="url(#robeGradient)" stroke="#333" />
                            {/* Hand */}
                            <path d="M-30,250 L-35,280 L-10,270 Z" fill="#D4AF37" opacity="0.8" />
                        </g>
                    </motion.g>

                    {/* --- RIGHT ARM (Animated) --- */}
                    <motion.g
                        style={{
                            rotate: rightArmRotation,
                            originX: "440px",
                            originY: "320px"
                        }}
                    >
                        <g transform="translate(440, 320)">
                            {/* Upper Arm / Sleeve (Mirrored) */}
                            <path d="M0,0 L20,150 Q-20,160 -40,140 Z" fill="url(#robeGradient)" stroke="#333" />
                            {/* Forearm / Sleeve opening */}
                            <path d="M20,150 L30,250 L-10,240 L-10,140 Z" fill="url(#robeGradient)" stroke="#333" />
                            {/* Hand */}
                            <path d="M30,250 L35,280 L10,270 Z" fill="#D4AF37" opacity="0.8" />
                        </g>
                    </motion.g>

                </svg>
            </div>


            {/* SCROLL CONTENT (Foreground) */}
            <div ref={containerRef} className="relative z-20">
                {/* Spacer for Animation */}
                <div className="h-[100vh]"></div>

                {/* Content Section */}
                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="min-h-screen bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-20 px-4 md:px-20 pb-40"
                >
                    <div className="max-w-6xl mx-auto pointer-events-auto">

                        <div className="text-center mb-24">
                            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">La Elite de la Sabiduría</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
                                Accede al conocimiento destilado de las mentes más brillantes de la historia.
                                Estrategia, Finanzas, Salud y Poder Personal en una sola plataforma.
                            </p>
                        </div>

                        {/* Mentors Showcase */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                            {[
                                { name: "Maquiavelo", role: "Poder y Estrategia", quote: "El fin justifica los medios.", color: "from-red-900/50" },
                                { name: "Marco Aurelio", role: "Control Emocional", quote: "Tienes poder sobre tu mente.", color: "from-blue-900/50" },
                                { name: "Séneca", role: "Gestión del Tiempo", quote: "No es que tengamos poco tiempo...", color: "from-amber-900/50" }
                            ].map((m, i) => (
                                <div key={i} className={`bg-gradient-to-br ${m.color} to-slate-900 border border-white/10 p-8 rounded-2xl hover:border-theme-gold/50 transition-colors group cursor-default`}>
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Users className="w-6 h-6 text-white/50 group-hover:text-theme-gold" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">{m.name}</h3>
                                    <p className="text-theme-gold text-xs uppercase tracking-wider mb-6">{m.role}</p>
                                    <p className="text-slate-400 italic">"{m.quote}"</p>
                                </div>
                            ))}
                        </div>

                        {/* Access Section */}
                        <div className="text-center bg-white/5 border border-white/10 rounded-3xl p-12 backdrop-blur-sm max-w-3xl mx-auto">
                            <h3 className="text-3xl font-bold mb-8">Comienza tu Ascenso</h3>
                            <div className="flex flex-col md:flex-row gap-6 justify-center">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-8 py-4 bg-theme-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 group"
                                >
                                    <span>INICIAR SESIÓN</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => navigate('/login')} // Redirects to Login, which has the link to Register
                                    className="px-8 py-4 bg-transparent border border-white/30 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    SOLICITAR ACCESO
                                </button>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>

        </div>
    );
};
