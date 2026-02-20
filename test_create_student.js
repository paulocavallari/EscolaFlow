const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    await supabase.auth.signInWithPassword({
        email: 'admin@virgiliocapoani.com.br',
        password: 'admin'
    });

    const { data: cls } = await supabase.from('classes').select('*').limit(1);
    const class_id = cls[0].id;

    console.log('Testing INSERT without guardian_phone...');
    const res1 = await supabase.from('students').insert({
        name: 'Test Student 1',
        class_id,
        active: true,
    }).select().single();
    if (res1.error) console.error('Er1:', res1.error);
    else console.log('Su1 ok');

    console.log('Testing INSERT with guardian_phone...');
    const res2 = await supabase.from('students').insert({
        name: 'Test Student 2',
        class_id,
        guardian_phone: '55119999999',
        active: true,
    }).select().single();
    if (res2.error) console.error('Er2:', res2.error);
    else console.log('Su2 ok');
}
run();
