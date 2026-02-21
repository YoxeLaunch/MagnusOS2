
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// 1. Security Headers (Helmet) con CSP básica
export const securityHeaders = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: false, // Desactivar HSTS para evitar redirección forzada a HTTPS en red local
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "ws:", "wss:", "https://worldtimeapi.org"], // Permitir worldtimeapi
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null, // Evitar promoción forzada a HTTPS
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
