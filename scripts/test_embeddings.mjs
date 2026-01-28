
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load env specific for this script since we aren't running through Next.js
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
        console.error("Error loading .env.local", e);
    }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env.local");
    process.exit(1);
} else {
    console.log("✅ API Key Loaded");
}

const genAI = new GoogleGenerativeAI(apiKey);

const configs = [
    { model: 'text-embedding-004', options: {} },
    { model: 'text-embedding-004', options: { apiVersion: 'v1' } },
    { model: 'text-embedding-004', options: { apiVersion: 'v1beta' } },
    { model: 'models/text-embedding-004', options: {} },
    { model: 'embedding-001', options: {} },
    { model: 'models/embedding-001', options: {} },
    { model: 'text-embedding-004-preview', options: {} }
];

async function test() {
    console.log("Starting Embedding Model Tests...\n");

    for (const config of configs) {
        const modelName = config.model;
        const opts = config.options;
        const label = `${modelName} ${JSON.stringify(opts)}`;

        try {
            process.stdout.write(`Testing: ${label}... `);
            const model = genAI.getGenerativeModel({ model: modelName }, opts);
            const result = await model.embedContent("Hello world test");
            const values = result.embedding.values;
            console.log(`✅ SUCCESS (Dims: ${values.length})`);
        } catch (error) {
            console.log(`❌ FAILED`);
            console.log(`   Error: ${error.message.split('\n')[0]}`); 
        }
    }
}

test();
