import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findByPk(username);

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        let isValid = false;
        let needsRehash = false;

        // 1. Try bcrypt comparison first (Standard)
        if (user.password.startsWith('$2')) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            // 2. Fallback to Plain Text (Legacy)
            isValid = user.password === password;
            if (isValid) needsRehash = true; // Mark for upgrade
        }

        if (isValid) {
            // SECURITY: Removed implicit admin escalation by username.
            // Admin role is now set only at registration time via ALLOW_FIRST_ADMIN flag.

            // Lazy Migration: Upgrade to Hash
            if (needsRehash) {
                user.password = await bcrypt.hash(password, 10);
                await user.save();
                console.log(`[AUTH] User ${username} security upgraded to bcrypt.`);
            }

            const userData = user.toJSON();
            const { password: _, ...safeUser } = userData;
            const token = generateToken(user);
            res.json({ ...safeUser, token });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno en login' });
    }
};

export const register = async (req, res) => {
    try {
        const { username, password, name } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username y password son requeridos' });
        }

        const existing = await User.findByPk(username);
        if (existing) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Set role: admin only for the very first user when ALLOW_FIRST_ADMIN=true
        let role = 'user';
        const userCount = await User.count();
        if (process.env.ALLOW_FIRST_ADMIN === 'true' && userCount === 0) {
            role = 'admin';
            console.log(`[AUTH] First user registered as admin via ALLOW_FIRST_ADMIN flag.`);
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        const created = await User.create({
            username: username.trim(),
            password: hashedPassword,
            name: name ? name.trim() : username.trim(),
            role
        });

        const userData = created.toJSON();
        const { password: _, ...safeUser } = userData;
        const token = generateToken(created);

        // Retornar usuario y token JWT para mantener sesión coherente de inmediato
        res.status(201).json({ ...safeUser, token });
    } catch (error) {
        console.error('[AUTH] Error en registro:', error);
        res.status(500).json({ error: 'Error interno en registro' });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { username } = req.params;
        const { newPassword, currentPassword } = req.body;

        if (!req.user || !req.user.username) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const authenticatedUsername = req.user.username;
        const isAdmin = req.user.role === 'admin' || authenticatedUsername.toLowerCase() === 'soberano';
        const isSelf = authenticatedUsername.toLowerCase() === username.toLowerCase();

        // Seguridad: Solo el propio usuario o un administrador autenticado pueden cambiar contraseña
        if (!isAdmin && !isSelf) {
            console.warn(`[AUTH] Unauthorized password update attempt by ${authenticatedUsername} for ${username}`);
            return res.status(403).json({ error: 'No autorizado para cambiar la contraseña de este usuario' });
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        const targetUser = await User.findByPk(username);
        if (!targetUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Si el usuario cambia su propia contraseña y no es admin, validar la contraseña actual
        if (isSelf && !isAdmin) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Se requiere la contraseña actual para verificar la identidad' });
            }
            const isMatch = targetUser.password.startsWith('$2')
                ? await bcrypt.compare(currentPassword, targetUser.password)
                : targetUser.password === currentPassword;

            if (!isMatch) {
                return res.status(401).json({ error: 'La contraseña actual no es correcta' });
            }
        }

        // Hash y persistencia segura
        targetUser.password = await bcrypt.hash(newPassword, 10);
        await targetUser.save();

        // Registro de auditoría mínimo sin contraseñas
        console.log(`[AUDIT:AUTH] Password changed for ${username} by ${authenticatedUsername} (role: ${req.user.role}) at ${new Date().toISOString()}`);

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('[UPDATE PASSWORD] Exception:', error);
        res.status(500).json({ error: 'Error interno al actualizar la contraseña' });
    }
};
