const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';

const adminSupabase = createClient(supabaseUrl, SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Checking Classes ---');
    const { data: classes } = await adminSupabase.from('classes').select('id, name, active').limit(1);
    const cls = classes[0];
    console.log('Target class ID:', cls.id, 'Active:', cls.active);

    const { data, error } = await adminSupabase.from('classes').update({ active: false }).eq('id', cls.id).select().single();
    if (error) {
        console.error('Update using service role FAILED:', error);
    } else {
        console.log('Update using service role SUCCESS:', data);
        // revert
        await adminSupabase.from('classes').update({ active: true }).eq('id', cls.id);
    }
}
run();
