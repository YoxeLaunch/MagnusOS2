import fs from 'fs';
import path from 'path';
import https from 'https';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
const pdf = pdfModule.default || pdfModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URLS = {
    USD: "https://dgii.gov.do/estadisticas/tasaCambio/1Dlar/Dolar2025.pdf",
    EUR: "https://dgii.gov.do/estadisticas/tasaCambio/2Euro/Euro2025.pdf"
};

const OUTPUT_FILE = path.join(__dirname, '../public/data/rates.json');

// Helper to download file to buffer
const downloadPdf = (url) => {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                // If 2025 file is missing (e.g. early in year), try 2024 or just fail gracefully?
                // For now, fail with clear message.
                reject(new Error(`Failed to fetch ${url}: Status ${res.statusCode}`));
                return;
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
            res.on('error', reject);
        }).on('error', reject);
    });
};

const parseRateFromText = (text, type) => {
    // Basic strategy: Look for date patterns and rates.
    // The PDFs usually list dates and Buy/Sell rates. 
    // We want the last valid entry.
    // This is a heuristic parser.

    // Split into lines
    const lines = text.split(/\n/).filter(l => l.trim().length > 0);

    // Look for lines that look like data rows
    // Example row might look like: "01/01/2025 60.50 61.20"
    // Regex for date DD/MM/YYYY or similar
    // We'll iterate backwards to find the latest data

    let buy = 0;
    let sell = 0;
    let found = false;

    // Simple number searching regex
    // Looks for lines with at least 2 decimal numbers (supporting dot or comma)
    const numberPattern = /(\d{2,3}[.,]\d{2,4})/g;

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const matches = line.match(numberPattern);

        if (matches && matches.length >= 2) {
            // Replace comma with dot for JS parsing
            const cleanNumber = (str) => parseFloat(str.replace(',', '.'));

            const v1 = cleanNumber(matches[matches.length - 2]);
            const v2 = cleanNumber(matches[matches.length - 1]);

            if (!isNaN(v1) && !isNaN(v2)) {
                buy = v1;
                sell = v2;
                found = true;
                console.log(`[${type}] Found data: Buy ${buy} / Sell ${sell} in line: "${line.trim().substring(0, 50)}..."`);
                break;
            }
        }
    }

    if (!found) {
        console.warn(`[${type}] ⚠️  WARNING: Could not parse rates from PDF text. Using hardcoded defaults.`);
    }

    return { buy, sell };
};

const LOCAL_SOURCE_DIR = path.join(__dirname, '../public/data_source');
const LOCAL_FILES = {
    USD: path.join(LOCAL_SOURCE_DIR, 'Dolar2025.pdf'),
    EUR: path.join(LOCAL_SOURCE_DIR, 'Euro2025.pdf')
};

const getPdfBuffer = async (url, localPath) => {
    // 1. Try Local File
    if (fs.existsSync(localPath)) {
        console.log(`[SOURCE] Found local file: ${localPath}`);
        return fs.readFileSync(localPath);
    }

    // 2. Fallback to Download
    console.log(`[SOURCE] Local file not found. Downloading from ${url}...`);
    return await downloadPdf(url);
};

const main = async () => {
    console.log("Starting DGII Rate Sync...");

    const rates = {
        lastUpdated: new Date().toISOString(),
        usd: { buy: 60.00, sell: 60.50 },
        eur: { buy: 63.00, sell: 65.00 }
    };

    try {
        // Ensure source dir exists
        if (!fs.existsSync(LOCAL_SOURCE_DIR)) {
            fs.mkdirSync(LOCAL_SOURCE_DIR, { recursive: true });
        }

        // 1. Process USD
        try {
            const usdBuffer = await getPdfBuffer(URLS.USD, LOCAL_FILES.USD);
            const usdData = await pdf(usdBuffer);
            const usdRates = parseRateFromText(usdData.text, "USD");
            if (usdRates.buy > 0) rates.usd = usdRates;
        } catch (e) {
            console.error("Error processing USD:", e.message);
        }

        // 2. Process EUR
        try {
            const eurBuffer = await getPdfBuffer(URLS.EUR, LOCAL_FILES.EUR);
            const eurData = await pdf(eurBuffer);
            const eurRates = parseRateFromText(eurData.text, "EUR");
            if (eurRates.buy > 0) rates.eur = eurRates;
        } catch (e) {
            console.error("Error processing EUR:", e.message);
        }

        // 3. Save to JSON (even if partial success)
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rates, null, 2));
        console.log(`Success! Latest rates saved to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("Critial Sync Failure:", error);
    }
};

main();
