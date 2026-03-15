import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Class, ClassInsert } from '../../types/database';
import { CLASS_KEYS } from './keys';

export function useClassesList() {
    return useQuery({
        queryKey: CLASS_KEYS.lists(),
        queryFn: async (): Promise<Class[]> => {
            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            return (data ?? []) as Class[];
        },
        staleTime: 300_000,
        gcTime: 900_000,
    });
}

export function useCreateClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: ClassInsert): Promise<Class> => {
            const { data, error } = await supabase
                .from('classes')
                .insert(input)
                .select()
                .single();

            if (error) throw error;
            return data as Class;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
        },
    });
}

export function useUpdateClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Class> & { id: string }): Promise<Class> => {
            const { data, error } = await supabase
                .from('classes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Class;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
        },
    });
}

export function useDeleteClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('classes')
                .update({ active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
        },
    });
}
