import { Client } from 'pg';
import dns from 'dns';

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const client = new Client({
    host: 'db.pwhjjsxqoogmcairesub.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Pa7412365**',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sql = `
            DROP POLICY IF EXISTS occurrences_update ON occurrences;
            CREATE POLICY occurrences_update ON occurrences
            FOR UPDATE USING (
                get_my_role() = 'admin'
                OR get_my_role() = 'vice_director'
                OR (tutor_id = get_my_profile_id() AND status = 'PENDING_TUTOR')
            );

            DROP POLICY IF EXISTS actions_insert ON actions;
            CREATE POLICY actions_insert ON actions
            FOR INSERT WITH CHECK (
                author_id = get_my_profile_id()
                AND EXISTS (
                    SELECT 1 FROM occurrences o
                    WHERE o.id = actions.occurrence_id
                    AND (
                        get_my_role() = 'admin'
                        OR get_my_role() = 'vice_director'
                        OR (o.tutor_id = get_my_profile_id() AND o.status = 'PENDING_TUTOR')
                    )
                )
            );
        `;

        await client.query(sql);
        console.log('Migration 002 applied successfully!');
    } catch (err: any) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
