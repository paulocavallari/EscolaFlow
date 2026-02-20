const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    await supabase.auth.signInWithPassword({
        email: 'admin@virgiliocapoani.com.br',
        password: 'admin'
    });

    const { data: occ } = await supabase.from('occurrences').select('id, status').limit(1);
    const occurrence = occ[0];
    console.log('Target occurrence:', occurrence.id, occurrence.status);

    const { error: patchError } = await supabase
        .from('occurrences')
        .update({ status: 'CONCLUDED' })
        .eq('id', occurrence.id);

    if (patchError) {
        console.error('PATCH 400 ERROR DETAILED:', patchError);
    } else {
        console.log('PATCH SUCCESS!');
    }
}
run();
