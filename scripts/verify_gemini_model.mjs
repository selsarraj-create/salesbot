
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

async function test() {
    const modelName = "gemini-embedding-001"; // Exact name found in list
    console.log(`Testing model: ${modelName}...`);

    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent("Hello world test");
        const values = result.embedding.values;
        console.log(`✅ SUCCESS (Dims: ${values.length})`);
    } catch (error) {
        console.log(`❌ FAILED`);
        console.log(`   Error: ${error.message}`);
    }
}

test();
