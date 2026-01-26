import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * Helper class to manage JSON file operations asynchronously.
 * Includes basic caching to avoid hitting the disk on every read if data hasn't changed.
 * (Note: For a cluster setup, this cache needs a different strategy, but fine for single instance).
 */
export class JsonDb {
    constructor(filePath, defaultData = []) {
        this.filePath = filePath;
        this.defaultData = defaultData;
        this.cache = null;
        this.lastRead = 0;

        // Ensure directory exists synchronously on init
        const dir = path.dirname(filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Reads data from the JSON file. 
     * Uses fs/promises. 
     * @returns {Promise<any>} Parsed JSON data
     */
    async read(force = false) {
        // Simple cache strategy: if we have data and not forced, return it.
        // In a real scenario, we might check file mtime.
        if (this.cache && !force) {
            return this.cache;
        }

        try {
            // Check if file exists first
            try {
                await fs.access(this.filePath);
            } catch (e) {
                // File doesn't exist, return default and potentially write it
                return this.defaultData;
            }

            const data = await fs.readFile(this.filePath, 'utf8');
            this.cache = JSON.parse(data);
            this.lastRead = Date.now();
            return this.cache;
        } catch (error) {
            console.error(`[JsonDb] Error reading ${this.filePath}:`, error.message);
            return this.defaultData;
        }
    }

    /**
     * Writes data to the JSON file.
     * @param {any} data Data to write
     */
    async write(data) {
        try {
            const content = JSON.stringify(data, null, 2);
            await fs.writeFile(this.filePath, content, 'utf8');
            this.cache = data; // Update cache
            return true;
        } catch (error) {
            console.error(`[JsonDb] Error writing ${this.filePath}:`, error.message);
            throw error;
        }
    }
}
