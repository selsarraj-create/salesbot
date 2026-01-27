
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres:CWaaat0Nd7f39H1G@db.xcqqntvniitgmrhxkgya.supabase.co:5432/postgres';

async function migrate() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        const sqlPath = path.join(__dirname, '../supabase/migrations/013_add_stress_testing.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration 013...');
        await client.query(sql);
        console.log('Migration successful!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
