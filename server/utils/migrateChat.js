import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Message } from '../models/system/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_DB_PATHS = {
    CHAT: path.join(__dirname, '..', 'chat.json'),
    PRIVATE_CHAT: path.join(__dirname, '..', 'private_chats.json')
};

export const migrateChatData = async () => {
    try {
        const count = await Message.count();
        if (count > 0) {
            console.log('[MIGRATION] Messages table not empty, skipping JSON migration.');
            return;
        }

        console.log('[MIGRATION] Starting Chat JSON -> SQLite migration...');

        // 1. Migrate Public Chat
        if (fs.existsSync(JSON_DB_PATHS.CHAT)) {
            const raw = fs.readFileSync(JSON_DB_PATHS.CHAT, 'utf8');
            const messages = JSON.parse(raw || '[]');

            if (messages.length > 0) {
                const formatted = messages.map(msg => ({
                    id: msg.id, // Keep existing UUID if possible, or let DB generate
                    text: msg.text,
                    fromUsername: msg.username, // In public chat 'username' is sender
                    type: 'public',
                    timestamp: msg.timestamp || new Date()
                }));

                await Message.bulkCreate(formatted);
                console.log(`[MIGRATION] Migrated ${formatted.length} public messages.`);
            }
        }

        // 2. Migrate Private Chats
        if (fs.existsSync(JSON_DB_PATHS.PRIVATE_CHAT)) {
            const raw = fs.readFileSync(JSON_DB_PATHS.PRIVATE_CHAT, 'utf8');
            const privateChats = JSON.parse(raw || '{}');

            let privateCount = 0;
            const messagesToInsert = [];

            // privateChats structure: { "user1_user2": [ {from, to, text...} ] }
            for (const [key, chats] of Object.entries(privateChats)) {
                if (Array.isArray(chats)) {
                    chats.forEach(msg => {
                        messagesToInsert.push({
                            id: msg.id,
                            text: msg.text,
                            fromUsername: msg.from,
                            toUsername: msg.to,
                            type: 'private',
                            timestamp: msg.timestamp || new Date()
                        });
                    });
                }
            }

            if (messagesToInsert.length > 0) {
                // Batch insert
                await Message.bulkCreate(messagesToInsert);
                console.log(`[MIGRATION] Migrated ${messagesToInsert.length} private messages.`);
            }
        }

        console.log('[MIGRATION] Chat migration complete.');

    } catch (error) {
        console.error('[MIGRATION] Error migrating chat:', error);
    }
};
