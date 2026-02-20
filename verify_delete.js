const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@virgiliocapoani.com.br',
        password: 'admin' // The default pwd, if incorrect we will see
    });
    if (authErr) {
        console.error('Auth Error:', authErr.message);
        return;
    }
    console.log('Auth:', 'Success');

    const { data: classes } = await supabase.from('classes').select('*').eq('active', true).limit(1);
    const cls = classes[0];
    console.log('Target Class active:', cls.active);

    const { count, error, data } = await supabase.from('classes').update({ active: false }).eq('id', cls.id).select();
    console.log('Update return:', data, error);

    // Reverting for safety
    await supabase.from('classes').update({ active: true }).eq('id', cls.id);
}
run();
