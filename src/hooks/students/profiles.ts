import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types/database';
import { PROFILE_KEYS } from './keys';

export function useProfilesList() {
    return useQuery({
        queryKey: PROFILE_KEYS.lists(),
        queryFn: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('active', true)
                .order('full_name');

            if (error) throw error;
            return (data ?? []) as Profile[];
        },
        staleTime: 120_000,
        gcTime: 600_000,
    });
}

export function useTutorsList() {
    return useQuery({
        queryKey: PROFILE_KEYS.tutors(),
        queryFn: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('active', true)
                .in('role', ['professor', 'vice_director'])
                .order('full_name');

            if (error) throw error;
            return (data ?? []) as Profile[];
        },
        staleTime: 120_000,
        gcTime: 600_000,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }): Promise<Profile> => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Profile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.all });
        },
    });
}
