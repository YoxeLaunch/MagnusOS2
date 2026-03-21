import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    try {
        const genAI = new GoogleGenerativeAI(key);
        // We can't easily list models with the SDK without a key and permissions, 
        // but let's try a different model name.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("test");
        console.log(result.response.text());
    } catch (e) {
        console.log(e.message);
    }
}
listModels();
