// scripts/apply_rls_migration.mjs
// Applies the RLS escalation fix migration directly to Supabase
// Run with: node scripts/apply_rls_migration.mjs

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

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
