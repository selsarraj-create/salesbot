const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local without dotenv
function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Could not read .env.local');
    }
}

loadEnv();

const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgres://postgres.').replace('.supabase.co', ':5432/postgres?sslmode=require') + '&password=' + encodeURIComponent(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log('Connecting to DB...');

async function run() {
    if (!connectionString || connectionString.includes('undefined')) {
        console.error('DATABASE_URL or Supabase credentials not found in .env.local');
        return;
    }

    const client = new Client({
        connectionString: connectionString
    });

    try {
        await client.connect();

        const sqlPath = path.join(__dirname, '../supabase/migrations/014_add_thinking_support.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: 014_add_thinking_support.sql');
        await client.query(sql);
        console.log('Migration successful! Thinking columns added.');

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

run();
