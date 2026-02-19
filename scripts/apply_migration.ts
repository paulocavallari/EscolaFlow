
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Force IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}


const client = new Client({
    host: 'db.pwhjjsxqoogmcairesub.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Pa7412365** ',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
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
