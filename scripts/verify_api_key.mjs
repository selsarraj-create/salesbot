
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load env specific for this script
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
console.log(`Loaded API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NONE'}`);

const genAI = new GoogleGenerativeAI(apiKey);

const configs = [
    { model: 'text-embedding-004', options: {} },
    { model: 'text-embedding-004', options: { apiVersion: 'v1' } },
    { model: 'text-embedding-004', options: { apiVersion: 'v1beta' } },
    { model: 'embedding-001', options: {} },
    { model: 'embedding-001', options: { apiVersion: 'v1' } },
    { model: 'embedding-001', options: { apiVersion: 'v1beta' } },
];

async function test() {
    console.log("Starting Exhaustive Model Tests with New Key...\n");

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
