
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        }
    } catch (e) {
        console.error("Error loading .env", e);
    }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
console.log(`Using API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NONE'}`);

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("Fetching available models...");
        // Using the ModelManager to list models
        // Note: The SDK exposes this differently depending on version, 
        // but typically genAI.getGenerativeModel is for usage.
        // We might need to make a raw REST call if SDK doesn't expose listModels easily 
        // effectively without a confusing interface, but let's try a direct fetch if SDK fails.

        // Actually, for the JS SDK, listing models often requires using the specific API operation
        // or just hitting the endpoint directly to be sure.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.models) {
            console.log("No models found or bad format:", data);
            return;
        }

        console.log("\n✅ AVAILABLE MODELS:");
        const embeddingModels = data.models.filter(m => m.name.includes('embedding'));
        const otherModels = data.models.filter(m => !m.name.includes('embedding'));

        console.log("\n--- EMBEDDING MODELS ---");
        embeddingModels.forEach(m => console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods})`));

        console.log("\n--- OTHER MODELS (All) ---");
        otherModels.forEach(m => console.log(`- ${m.name}`));

    } catch (error) {
        console.error("❌ FAILED to list models:", error.message);
    }
}

listModels();
