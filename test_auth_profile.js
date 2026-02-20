const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';

const adminSupabase = createClient(supabaseUrl, SERVICE_ROLE_KEY);

async function run() {
    const { data: profs } = await adminSupabase.from('profiles').select('id, full_name, auth_id, role');
    console.log('Profiles table:', profs);

    const { data: { users }, error } = await adminSupabase.auth.admin.listUsers();
    if (error) { console.error('Auth error', error); return; }
    console.log('\nAuth Users Table:', users.map(u => ({ id: u.id, email: u.email })));
}
run();
