import { Op } from 'sequelize';
import { User } from '../models/index.js'; // From Finanza DB
import { Message } from '../models/system/index.js'; // From System DB

// In-memory active connections (not persisted)
let connectedUsers = new Map();

/**
 * Helper to enrich messages with sender details manually (Cross-DB Join)
 */
async function enrichMessagesWithSenders(messages) {
    // 1. Collect unique usernames
    const usernames = [...new Set(messages.map(m => m.fromUsername))];

    // 2. Fetch users from Finanza DB
    const users = await User.findAll({
        where: { username: { [Op.in]: usernames } },
        attributes: ['username', 'name', 'role', 'tags']
    });

    // 3. Create Map
    const userMap = new Map(users.map(u => [u.username, u]));

    // 4. Attach details
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
            to: msg.toUsername, // For private messages
            replyTo: replyTo
        };
    });
}

/**
 * Initializes Socket.IO event listeners
 * @param {import('socket.io').Server} io 
 */
export const initSocket = (io) => {
    io.on('connection', async (socket) => {
        console.log('[SOCKET] New connection:', socket.id);

        try {
            // 1. Send Public History (Last 50 messages)
            const publicMessages = await Message.findAll({
                where: { type: 'public' },
                order: [['createdAt', 'DESC']],
                limit: 50
            });

            const enriched = await enrichMessagesWithSenders(publicMessages);
            socket.emit('chat_history', enriched.reverse()); // Oldest first
        } catch (error) {
            console.error('[SOCKET] Error fetching history:', error);
        }

        // 2. User Joins
        socket.on('join', async (userId) => {
            const username = userId.username || userId;
            console.log(`[SOCKET] Join Request from:`, username);
            socket.join(username);

            try {
                const user = await User.findByPk(username);
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
            } catch (err) {
                console.error('[SOCKET] Error joining user:', err);
            }
        });

        // 3. New Public Message
        socket.on('send_message', async (messageData) => {
            try {
                const newMessage = await Message.create({
                    text: messageData.text,
                    fromUsername: messageData.username,
                    type: 'public',
                    replyTo: messageData.replyTo ? JSON.stringify(messageData.replyTo) : null
                });

                // Manual Fetch for Sender
                const sender = await User.findByPk(newMessage.fromUsername, {
                    attributes: ['name', 'role', 'tags']
                });

                const formatted = {
                    id: newMessage.id,
                    text: newMessage.text,
                    username: newMessage.fromUsername,
                    name: sender?.name,
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

        // 4. Private Message
        socket.on('send_private_message', async ({ to, text, from, replyTo }) => {
            try {
                const newMessage = await Message.create({
                    text,
                    fromUsername: from,
                    toUsername: to,
                    type: 'private',
                    replyTo: replyTo ? JSON.stringify(replyTo) : null
                });

                const sender = await User.findByPk(from, { attributes: ['name'] });

                const formatted = {
                    id: newMessage.id,
                    text: newMessage.text,
                    from: newMessage.fromUsername,
                    to: newMessage.toUsername,
                    name: sender?.name,
                    timestamp: newMessage.createdAt,
                    type: 'private',
                    replyTo: replyTo
                };

                io.to(to).emit('receive_private_message', formatted);
                socket.emit('receive_private_message', formatted);
            } catch (error) {
                console.error('[SOCKET] Error sending private message:', error);
            }
        });

        // 5. Get Private History
        socket.on('get_private_history', async ({ withUser, currentUser }) => {
            try {
                const messages = await Message.findAll({
                    where: {
                        type: 'private',
                        [Op.or]: [
                            { fromUsername: currentUser, toUsername: withUser },
                            { fromUsername: withUser, toUsername: currentUser }
                        ]
                    },
                    order: [['createdAt', 'ASC']],
                    limit: 50
                });

                // Enrich with names
                const senderNames = {};
                // Helper to get name
                const getName = async (username) => {
                    if (senderNames[username]) return senderNames[username];
                    const u = await User.findByPk(username, { attributes: ['name'] });
                    senderNames[username] = u?.name || username;
                    return senderNames[username];
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
                        replyTo: replyTo
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

        // 7. System Broadcast
        socket.on('admin:broadcast', (data) => {
            console.log('[SOCKET] Broadcast received:', data);
            io.emit('system:broadcast', {
                ...data,
                timestamp: new Date()
            });
        });
    });
};


