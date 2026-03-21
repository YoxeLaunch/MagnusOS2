import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    try {
        const genAI = new GoogleGenerativeAI(key);
        // List models is not directly on the main SDK object like this, 
        // but we can try a fetch if the key allows it.
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await resp.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log(e.message);
    }
}
listModels();
