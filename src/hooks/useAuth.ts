// src/hooks/useAuth.ts
// Authentication hook wrapping Supabase auth

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types/database';

export interface AuthState {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    isViceDirector: boolean;
    isProfessor: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useAuthProvider(): AuthState {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from profiles table
    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }
            return data as Profile;
        } catch (err) {
            console.error('Profile fetch failed:', err);
            return null;
        }
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) {
                fetchProfile(s.user.id).then((p) => {
                    setProfile(p);
                }).finally(() => {
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        }).catch((err) => {
            console.error('Session get error:', err);
            setLoading(false);
        });

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, s) => {
                setSession(s);
                setUser(s?.user ?? null);
                if (s?.user) {
                    try {
                        const p = await fetchProfile(s.user.id);
                        setProfile(p);
                    } catch (err) {
                        console.error('Profile fetch error on state change:', err);
                        setProfile(null);
                    }
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const signIn = useCallback(async (email: string, password: string) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        return { error: error?.message ?? null };
    }, []);

    const signOut = useCallback(async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setProfile(null);
        setLoading(false);
    }, []);

    return {
        session,
        user,
        profile,
        loading,
        signIn,
        signOut,
        isAdmin: profile?.role === UserRole.ADMIN,
        isViceDirector: profile?.role === UserRole.VICE_DIRECTOR,
        isProfessor: profile?.role === UserRole.PROFESSOR,
    };
}

export { AuthContext };

export default useAuth;
