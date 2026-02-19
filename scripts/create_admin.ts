
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
} else {
    console.warn('.env file not found');
}

const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
// Prefer service role key if available for admin privileges
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    console.error('Variables found:', Object.keys(envVars));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const email = 'admin@virgiliocapoani.com.br';
    const password = 'Pa7412365**';

    console.log(`Attempting to create user: ${email}`);

    // Check if we have service role key to use admin api
    if (envVars.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Using Service Role Key (Admin API)');
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        
        if (error) {
            console.error('Error creating user with Admin API:', error.message);
        } else {
            console.log('User created successfully with Admin API:', data.user?.id);
        }
    } else {
        console.log('Using Anon Key (Public API)');
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error('Error signing up user:', error.message);
        } else {
            console.log('User signed up:', data.user?.id);
            if (data.session) {
                console.log('Session created (user is logged in)');
            } else {
                console.log('User created but validation may be required (check email if enabled)');
            }
        }
    }
}

createAdmin();
