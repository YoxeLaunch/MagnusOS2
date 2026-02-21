
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// 1. Security Headers (Helmet) con CSP básica
export const securityHeaders = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],   // Tailwind lo necesita
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "ws:", "wss:"],    // WebSocket/Socket.io
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        }
    }
});

// 2. Rate Limiting global (ajustado: 300 req / 15 min por IP)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests",
        message: "Has excedido el límite de peticiones. Por favor intenta más tarde."
    }
});

// Stricter limiter for sensitive routes (if needed later)
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 failed login attempts per hour
    message: "Demasiados intentos de inicio de sesión. Cuenta bloqueada temporalmente."
});
