import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js'; // From Finanza DB
import { Message } from '../models/system/index.js'; // From System DB

// In-memory active connections (not persisted)
let connectedUsers = new Map();

/**
 * Socket.IO Handshake Authentication Middleware
 * Enforces valid JWT token before establishing connection
 */
export const socketAuthMiddleware = (socket, next) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error('[SOCKET:AUTH] JWT_SECRET not configured');
        return next(new Error('Configuración de seguridad incorrecta en el servidor'));
    }

    const authHeader = socket.handshake.headers?.authorization;
    const token = socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
        socket.handshake.query?.token;

    if (!token) {
        return next(new Error('Acceso denegado: Token JWT requerido'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded; // { username, role }
        next();
    } catch (err) {
        return next(new Error('Acceso denegado: Token inválido o expirado'));
    }
};

/**
 * Helper to enrich messages with sender details manually (Cross-DB Join)
 */
async function enrichMessagesWithSenders(messages) {
    const usernames = [...new Set(messages.map(m => m.fromUsername))];

    const users = await User.findAll({
        where: { username: { [Op.in]: usernames } },
        attributes: ['username', 'name', 'role', 'tags']
    });

    const userMap = new Map(users.map(u => [u.username, u]));

    return messages.map(msg => {
        const sender = userMap.get(msg.fromUsername);
        let replyTo = null;
        try {
            replyTo = msg.replyTo ? JSON.parse(msg.replyTo) : null;
        } catch (e) { }

        return {
            id: msg.id,
            text: msg.text,
            username: msg.fromUsername,
            name: sender?.name || msg.fromUsername,
            role: sender?.role,
            tags: sender?.tags,
            timestamp: msg.createdAt,
            type: msg.type,
            to: msg.toUsername,
            replyTo: replyTo
        };
    });
}

/**
 * Initializes Socket.IO event listeners with strict JWT identity
 * @param {import('socket.io').Server} io 
 */
export const initSocket = (io) => {
    // 1. Enforce handshake authentication
    io.use(socketAuthMiddleware);

    io.on('connection', async (socket) => {
        const authenticatedUsername = socket.user?.username;
        console.log(`[SOCKET] Authenticated connection from ${authenticatedUsername} (id: ${socket.id})`);

        if (!authenticatedUsername) {
            socket.disconnect(true);
            return;
        }

        // Auto-join personal room by authenticated identity
        socket.join(authenticatedUsername);

        try {
            // Update connected users map
            const user = await User.findByPk(authenticatedUsername);
            if (user) {
                connectedUsers.set(socket.id, {
                    username: user.username,
                    name: user.name,
                    socketId: socket.id,
                    status: 'online',
                    role: user.role,
                    tags: user.tags,
                    preferences: user.preferences
                });

                const userList = Array.from(connectedUsers.values());
                io.emit('users_update', userList);
            }

            // Send Public History (Last 50 messages)
            const publicMessages = await Message.findAll({
                where: { type: 'public' },
                order: [['createdAt', 'DESC']],
                limit: 50
            });

            const enriched = await enrichMessagesWithSenders(publicMessages);
            socket.emit('chat_history', enriched.reverse()); // Oldest first
        } catch (error) {
            console.error('[SOCKET] Error in connection init:', error);
        }

        // 2. User Joins (acknowledgment, identity is locked to socket.user.username)
        socket.on('join', async () => {
            console.log(`[SOCKET] Join acknowledged for ${authenticatedUsername}`);
            socket.join(authenticatedUsername);
        });

        // 3. New Public Message (REMITENTE SIEMPRE ES socket.user.username)
        socket.on('send_message', async (messageData) => {
            try {
                if (!messageData.text || typeof messageData.text !== 'string' || messageData.text.trim().length === 0) {
                    return;
                }

                const cleanText = messageData.text.trim().substring(0, 4000);

                const newMessage = await Message.create({
                    text: cleanText,
                    fromUsername: authenticatedUsername, // Inmutable: derivado del JWT
                    type: 'public',
                    replyTo: messageData.replyTo ? JSON.stringify(messageData.replyTo) : null
                });

                const sender = await User.findByPk(authenticatedUsername, {
                    attributes: ['name', 'role', 'tags']
                });

                const formatted = {
                    id: newMessage.id,
                    text: newMessage.text,
                    username: authenticatedUsername,
                    name: sender?.name || authenticatedUsername,
                    role: sender?.role,
                    tags: sender?.tags,
                    timestamp: newMessage.createdAt,
                    type: 'public',
                    replyTo: messageData.replyTo
                };

                io.emit('receive_message', formatted);
            } catch (error) {
                console.error('[SOCKET] Error sending public message:', error);
            }
        });

        // 4. Private Message (REMITENTE SIEMPRE ES socket.user.username)
        socket.on('send_private_message', async ({ to, text, replyTo }) => {
            try {
                if (!to || !text || typeof text !== 'string' || text.trim().length === 0) {
                    return;
                }

                const cleanText = text.trim().substring(0, 4000);

                const newMessage = await Message.create({
                    text: cleanText,
                    fromUsername: authenticatedUsername, // Inmutable: derivado del JWT
                    toUsername: to,
                    type: 'private',
                    replyTo: replyTo ? JSON.stringify(replyTo) : null
                });

                const sender = await User.findByPk(authenticatedUsername, { attributes: ['name'] });

                const formatted = {
                    id: newMessage.id,
                    text: newMessage.text,
                    from: authenticatedUsername,
                    to,
                    name: sender?.name || authenticatedUsername,
                    timestamp: newMessage.createdAt,
                    type: 'private',
                    replyTo
                };

                io.to(to).emit('receive_private_message', formatted);
                socket.emit('receive_private_message', formatted);
            } catch (error) {
                console.error('[SOCKET] Error sending private message:', error);
            }
        });

        // 5. Get Private History (SOLO puede consultar conversaciones donde es participante: A <-> B)
        socket.on('get_private_history', async ({ withUser }) => {
            try {
                if (!withUser) return;

                const messages = await Message.findAll({
                    where: {
                        type: 'private',
                        [Op.or]: [
                            { fromUsername: authenticatedUsername, toUsername: withUser },
                            { fromUsername: withUser, toUsername: authenticatedUsername }
                        ]
                    },
                    order: [['createdAt', 'ASC']],
                    limit: 50
                });

                const senderNames = {};
                const getName = async (uName) => {
                    if (senderNames[uName]) return senderNames[uName];
                    const u = await User.findByPk(uName, { attributes: ['name'] });
                    senderNames[uName] = u?.name || uName;
                    return senderNames[uName];
                };

                const formatted = await Promise.all(messages.map(async msg => {
                    let replyTo = null;
                    try {
                        replyTo = msg.replyTo ? JSON.parse(msg.replyTo) : null;
                    } catch (e) { }

                    return {
                        id: msg.id,
                        text: msg.text,
                        from: msg.fromUsername,
                        to: msg.toUsername,
                        timestamp: msg.createdAt,
                        type: 'private',
                        name: await getName(msg.fromUsername),
                        replyTo
                    };
                }));

                socket.emit('private_history', { withUser, messages: formatted });
            } catch (error) {
                console.error('[SOCKET] Error fetching private history:', error);
            }
        });

        // 6. Disconnect
        socket.on('disconnect', () => {
            const user = connectedUsers.get(socket.id);
            if (user) {
                console.log(`[SOCKET] User disconnected: ${user.username}`);
                connectedUsers.delete(socket.id);
                io.emit('users_update', Array.from(connectedUsers.values()));
            }
        });

        // 7. Typing Indicators
        socket.on('typing', ({ room }) => {
            const payload = { username: authenticatedUsername, room: room || 'global' };
            if (room === 'global' || !room) {
                socket.broadcast.emit('user_typing', payload);
            } else {
                io.to(room).emit('user_typing', payload);
            }
        });

        socket.on('stop_typing', ({ room }) => {
            const payload = { username: authenticatedUsername, room: room || 'global' };
            if (room === 'global' || !room) {
                socket.broadcast.emit('user_stop_typing', payload);
            } else {
                io.to(room).emit('user_stop_typing', payload);
            }
        });

        // 8. Admin Broadcast (RESTRINGIDO A ADMIN / SOBERANO POR JWT)
        socket.on('admin:broadcast', (data) => {
            const isAdmin = socket.user?.role === 'admin' || authenticatedUsername.toLowerCase() === 'soberano';
            if (!isAdmin) {
                console.warn(`[SECURITY:SOCKET] Unauthorized admin:broadcast attempt by ${authenticatedUsername}`);
                socket.emit('error', { message: 'Acceso denegado: solo administradores pueden emitir anuncios.' });
                return;
            }

            console.log(`[SOCKET] Admin broadcast sent by ${authenticatedUsername}:`, data?.title);
            io.emit('system:broadcast', {
                ...data,
                sender: authenticatedUsername,
                timestamp: new Date()
            });
        });
    });
};



