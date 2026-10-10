import crypto from 'crypto';
import { AuthSession } from '../models/index.js';

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const hashIp = (ip) => crypto.createHash('sha256').update(`${process.env.JWT_SECRET || ''}:${ip || ''}`).digest('hex');

export const createSession = async (user, req) => {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await AuthSession.create({
        id, username: user.username, expiresAt,
        userAgent: String(req.get('user-agent') || '').slice(0, 500), ipHash: hashIp(req.ip)
    });
    return { id, expiresAt, ttlSeconds: SESSION_TTL_SECONDS };
};

export const revokeSession = async (id, revokedBy) => AuthSession.update(
    { revokedAt: new Date(), revokedBy }, { where: { id, revokedAt: null } }
);
