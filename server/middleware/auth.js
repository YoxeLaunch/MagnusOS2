// ========================================
// server/middleware/auth.js — JWT Verification Middleware
// ========================================
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware que verifica el JWT en cada request protegido.
 * El token debe enviarse en el header: Authorization: Bearer <token>
 *
 * Modo STRICT: rechaza requests sin token válido (401).
 */
export const verifyJWT = (req, res, next) => {
    if (!JWT_SECRET) {
        console.error('[AUTH] JWT_SECRET no está configurado. Verificar .env');
        return res.status(500).json({ error: 'Configuración de seguridad incorrecta' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { username, role, iat, exp }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
        }
        return res.status(403).json({ error: 'Token inválido.' });
    }
};

/**
 * Middleware opcional: Si hay token válido lo adjunta al request,
 * pero NO bloquea el request si no hay token.
 * Útil para rutas que pueden ser públicas pero se benefician del contexto del usuario.
 */
export const optionalJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (token && JWT_SECRET) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch {
            // Token inválido o expirado — continuamos sin usuario autenticado
            req.user = null;
        }
    }
    next();
};

/**
 * Helper para generar un token JWT
 */
export const generateToken = (user) => {
    if (!JWT_SECRET) throw new Error('JWT_SECRET no configurado');
    return jwt.sign(
        { username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
};
