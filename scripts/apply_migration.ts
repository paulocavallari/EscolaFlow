
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Force IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}


const client = new Client({
    host: process.env.SUPABASE_DB_HOST || 'db.pwhjjsxqoogmcairesub.supabase.co',
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        if (!process.env.SUPABASE_DB_PASSWORD) {
            throw new Error('Missing SUPABASE_DB_PASSWORD in environment');
        }

        await client.connect();
        console.log('Connected to database');

        const migrationPath = path.resolve(__dirname, '../supabase/migrations/001_initial_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        console.log('Running migration...');

        await client.query(sql);

        console.log('Migration applied successfully!');

    } catch (err: any) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
