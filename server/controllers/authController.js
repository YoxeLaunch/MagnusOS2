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
        const newUser = req.body;

        const existing = await User.findByPk(newUser.username);
        if (existing) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Set role: admin only for the very first user when ALLOW_FIRST_ADMIN=true
        const userCount = await User.count();
        if (process.env.ALLOW_FIRST_ADMIN === 'true' && userCount === 0) {
            newUser.role = 'admin';
            console.log(`[AUTH] First user registered as admin via ALLOW_FIRST_ADMIN flag.`);
        } else {
            newUser.role = 'user';
        }

        // Hash Password
        newUser.password = await bcrypt.hash(newUser.password, 10);

        const created = await User.create(newUser);

        const userData = created.toJSON();
        const { password, ...safeUser } = userData;
        res.json(safeUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno en registro' });
    }
};

export const updatePassword = async (req, res) => {
    try {
        console.log('[UPDATE PASSWORD] Request received');
        console.log('[UPDATE PASSWORD] Params:', req.params);
        console.log('[UPDATE PASSWORD] Body:', { ...req.body, newPassword: '***' });

        const { username } = req.params;
        const { newPassword, adminUsername } = req.body;

        // Security: Verify admin is making the request
        if (!adminUsername) {
            console.log('[UPDATE PASSWORD] Missing adminUsername');
            return res.status(401).json({ error: 'Se requiere autenticación de administrador' });
        }

        console.log('[UPDATE PASSWORD] Looking up admin:', adminUsername);
        const admin = await User.findByPk(adminUsername);
        if (!admin) {
            console.log('[UPDATE PASSWORD] Admin not found');
            return res.status(403).json({ error: 'Administrador no encontrado' });
        }
        if (admin.role !== 'admin') {
            console.log('[UPDATE PASSWORD] User is not admin, role:', admin.role);
            return res.status(403).json({ error: 'Solo administradores pueden cambiar contraseñas' });
        }

        if (!newPassword) {
            console.log('[UPDATE PASSWORD] Missing newPassword');
            return res.status(400).json({ error: 'La nueva contraseña es requerida' });
        }

        console.log('[UPDATE PASSWORD] Looking up target user:', username);
        const user = await User.findByPk(username);
        if (!user) {
            console.log('[UPDATE PASSWORD] Target user not found');
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Hash new password
        console.log('[UPDATE PASSWORD] Hashing new password');
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        console.log(`[AUTH] Admin ${adminUsername} updated password for user ${username}`);
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('[UPDATE PASSWORD] Exception:', error);
        res.status(500).json({ error: 'Error interno al actualizar la contraseña' });
    }
};
