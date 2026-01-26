
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// 1. Basic Security Headers (Helmet)
// Disables X-Powered-By, sets XSS filter, HSTS, etc.
export const securityHeaders = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for images
    contentSecurityPolicy: false // Disable CSP for now to avoid frontend issues
});

// 2. Rate Limiting (Brute Force Protection)
// Limits requests from the same IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
