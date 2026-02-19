
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from ${envPath}`);

let envVars: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envVars = envContent.split('\n').reduce((acc, line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, string>);
}

const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
// Prefer service role key if available for admin privileges
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminRole() {
    const email = 'admin@virgiliocapoani.com.br';

    // 1. Get the user's UUID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError || !users) {
        console.error('Error fetching users:', userError);
        return;
    }

    const adminUser = users.find(u => u.email === email);
    if (!adminUser) {
        console.error(`User ${email} not found!`);
        return;
    }

    console.log(`Found admin user: ${adminUser.id}`);

    // 2. Fetch current profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_id', adminUser.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
    } else {
        console.log(`Current profile role: ${profile.role}`);
    }

    // 3. Update profile role to 'admin'
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('auth_id', adminUser.id);

    if (updateError) {
        console.error('Error updating profile role:', updateError);
    } else {
        console.log(`Successfully updated profile role to 'admin' for ${email}`);
    }

    // 4. Update user metadata for consistency (optional but good practice)
    const { error: metaError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { user_metadata: { role: 'admin' } }
    );

    if (metaError) {
        console.warn('Warning: Failed to update user_metadata (not critical):', metaError);
    } else {
        console.log('Updated user_metadata to role: admin');
    }
}

fixAdminRole();
