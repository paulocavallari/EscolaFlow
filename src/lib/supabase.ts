// src/lib/supabase.ts
// Supabase client initialization for React Native

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// These are PUBLIC values — safe to have as fallbacks since they are bundled into
// the client-side JS by Expo regardless. The EXPO_PUBLIC_ prefix makes them
// accessible on the client; the fallbacks ensure Vercel builds work even if
// the Metro bundler doesn't pick up .env.production at build time.
export const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    'https://pwhjjsxqoogmcairesub.supabase.co';

export const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDY5OTUsImV4cCI6MjA4NzAyMjk5NX0.pF9Chqbex0EUqPg8BeN2uHmofCqswHVXcQMQi8Jz1u4';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Important for React Native
    },
});

export default supabase;
