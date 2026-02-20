const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';

const adminSupabase = createClient(supabaseUrl, SERVICE_ROLE_KEY);

async function run() {
    console.log('Fetching Occurrences');
    const { data: occ } = await adminSupabase.from('occurrences').select('id, student_id, tutor_id, author_id, status');
    console.log(occ);

    console.log('Fetching Profs');
    const { data: profs } = await adminSupabase.from('profiles').select('id, full_name, role');
    console.log(profs);

    console.log('Fetching students');
    const { data: stds } = await adminSupabase.from('students').select('id, name, tutor_id');
    console.log(stds);
}

run();
