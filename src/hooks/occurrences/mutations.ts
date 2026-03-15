import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseAnonKey, supabaseUrl } from '../../lib/supabase';
import { useAuth } from '../useAuth';
import { Occurrence, OccurrenceInsert, OccurrenceStatus } from '../../types/database';
import { OCCURRENCE_KEYS } from './keys';

export function useCreateOccurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: OccurrenceInsert): Promise<Occurrence> => {
            const TIMEOUT_MS = 15_000;

            const insertPromise = supabase
                .from('occurrences')
                .insert({
                    ...input,
                    status: OccurrenceStatus.PENDING_TUTOR,
                })
                .select()
                .single();

            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('O salvamento demorou demais. Verifique sua conexão e tente novamente.')), TIMEOUT_MS);
            });

            const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

            if (error) throw error;
            return data as Occurrence;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
        },
    });
}

export function useDeleteOccurrence() {
    const queryClient = useQueryClient();
    const { session } = useAuth();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            const token = session?.access_token;

            if (!token) throw new Error('Não autenticado. Faça login novamente.');

            const response = await fetch(`${supabaseUrl}/functions/v1/delete-occurrence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({ occurrence_id: id }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(errData.error || 'Falha ao excluir ocorrência.');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.lists() });
        },
    });
}
