// scripts/apply_rls_migration.mjs
// Applies the RLS escalation fix migration directly to Supabase
// Run with: node scripts/apply_rls_migration.mjs

const SUPABASE_URL = 'https://pwhjjsxqoogmcairesub.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';

// We'll run each statement separately via the Supabase rpc endpoint
const statements = [
    `DROP POLICY IF EXISTS occurrences_update ON occurrences`,
    `CREATE POLICY occurrences_update ON occurrences
     FOR UPDATE
     USING (
       EXISTS (
         SELECT 1 FROM profiles
         WHERE profiles.auth_id = auth.uid()
         AND (
           profiles.role = 'admin'
           OR profiles.role = 'vice_director'
           OR (occurrences.tutor_id = profiles.id AND occurrences.status = 'PENDING_TUTOR')
         )
       )
     )
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM profiles
         WHERE profiles.auth_id = auth.uid()
         AND (
           profiles.role = 'admin'
           OR profiles.role = 'vice_director'
           OR occurrences.tutor_id = profiles.id
         )
       )
     )`,
    `DROP POLICY IF EXISTS actions_insert ON actions`,
    `CREATE POLICY actions_insert ON actions
     FOR INSERT WITH CHECK (
       EXISTS (
         SELECT 1 FROM occurrences o
         JOIN profiles p ON p.auth_id = auth.uid()
         WHERE o.id = actions.occurrence_id
           AND actions.author_id = p.id
           AND (
             p.role = 'admin'
             OR p.role = 'vice_director'
             OR o.tutor_id = p.id
           )
       )
     )`,
];

for (const sql of statements) {
    const short = sql.trim().substring(0, 50);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
        },
        body: JSON.stringify({ sql }),
    });
    const body = await response.text();
    console.log(`[${response.status}] ${short}... → ${body.substring(0, 100)}`);
}
