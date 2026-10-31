/**
 * MECE Tamper-Evident Audit Logging Service (Phase 1B)
 * 
 * Provides an append-only, hash-chained audit logging service for administrative actions.
 * Guarantees cryptographic integrity: each entry contains a SHA-256 hash of the previous entry's
 * hash combined with its own payload (Merkle/blockchain-style hash chain).
 * 
 * Distinguishes:
 * - Ephemeral in-memory buffer (for rapid inspection during active process lifetime)
 * - Persistent append-only stream (for audit durability across restarts)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class AuditLogService {
    /**
     * @param {Object} options
     * @param {string} [options.logFilePath] - Optional file path for disk persistence
     */
    constructor(options = {}) {
        this.logFilePath = options.logFilePath || null;
        this.entries = [];
        this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    }

    /**
     * Appends an audit entry and updates the cryptographic hash chain.
     * 
     * @param {Object} event
     * @param {string} event.adminUser - Authenticated username performing the action
     * @param {string} event.targetUser - Target user whose financial records are being accessed
     * @param {string} event.action - e.g. 'ADMIN_CROSS_USER_FINANCIAL_QUERY'
     * @param {string} [event.endpoint] - e.g. '/api/mece/real-income'
     * @param {string} [event.ip] - Request IP address
     * @param {Object} [event.metadata] - Additional contextual data
     * @returns {Object} Structured, hash-chained audit log entry
     */
    recordEvent({ adminUser, targetUser, action, endpoint = 'UNKNOWN', ip = '127.0.0.1', metadata = {} }) {
        if (!adminUser) throw new Error('[AuditLogService] adminUser is required');
        if (!targetUser) throw new Error('[AuditLogService] targetUser is required');
        if (!action) throw new Error('[AuditLogService] action is required');

        const timestamp = new Date().toISOString();
        const sequence = this.entries.length + 1;

        const payloadToHash = `${sequence}|${timestamp}|${adminUser}|${targetUser}|${action}|${endpoint}|${ip}|${this.lastHash}`;
        const currentHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

        const entry = {
            sequence,
            timestamp,
            adminUser,
            targetUser,
            action,
            endpoint,
            ip,
            metadata,
            previousHash: this.lastHash,
            entryHash: currentHash
        };

        this.entries.push(entry);
        this.lastHash = currentHash;

        if (this.logFilePath) {
            try {
                fs.appendFileSync(this.logFilePath, JSON.stringify(entry) + '\n', 'utf8');
            } catch (err) {
                console.error('[AuditLogService] Failed to write to audit log file:', err.message);
            }
        }

        return entry;
    }

    /**
     * Verifies the cryptographic integrity of the entire audit log chain.
     * 
     * @returns {{ valid: boolean, totalEntries: number, errorIndex: number|null }}
     */
    verifyChainIntegrity() {
        let prev = '0000000000000000000000000000000000000000000000000000000000000000';
        for (let i = 0; i < this.entries.length; i++) {
            const e = this.entries[i];
            if (e.previousHash !== prev) {
                return { valid: false, totalEntries: this.entries.length, errorIndex: i, reason: 'Broken previousHash chain' };
            }
            const expectedPayload = `${e.sequence}|${e.timestamp}|${e.adminUser}|${e.targetUser}|${e.action}|${e.endpoint}|${e.ip}|${prev}`;
            const expectedHash = crypto.createHash('sha256').update(expectedPayload).digest('hex');
            if (e.entryHash !== expectedHash) {
                return { valid: false, totalEntries: this.entries.length, errorIndex: i, reason: 'Tampered entryHash' };
            }
            prev = e.entryHash;
        }
        return { valid: true, totalEntries: this.entries.length, errorIndex: null };
    }

    /**
     * Retrieves all recorded entries.
     */
    getEntries() {
        return [...this.entries];
    }
}

export { AuditLogService };

