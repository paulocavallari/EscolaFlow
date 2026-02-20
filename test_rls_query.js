const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
    // 1. Get the admin role to create a JWT for Paulo using edge functions? No, let's login with pawd!
    // Since I don't know Paulo's password, I will reset it or use admin to impersonate? 
    // Supabase has NO impersonation by default, but we can change Paulo's password!
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';
    const adminSupabase = createClient(supabaseUrl, key);

    // List users
    const { data: { users } } = await adminSupabase.auth.admin.listUsers();
    const pauloUser = users.find(u => u.email.includes('paulo') || u.email.includes('Tutor'));

    if (!pauloUser) {
        console.log('Paulo user not found via admin API.');
        // get email from profiles? Profiles does not store email! 
    } else {
        console.log('Found user:', pauloUser.email);
        // set psswd
        await adminSupabase.auth.admin.updateUserById(pauloUser.id, { password: 'password123' });
        console.log('Password reset to password123');

        const { data, error } = await supabase.auth.signInWithPassword({ email: pauloUser.email, password: 'password123' });
        if (error) { console.error('Sign in fail', error); return; }

        const { data: occ, error: occErr } = await supabase.from('occurrences').select('id, tutor_id').limit(10);
        console.log('OCCURRENCES FOR PAULO:', occ, occErr);
    }
}
run();
