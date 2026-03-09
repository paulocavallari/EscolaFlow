// src/hooks/useOccurrences.ts
// TanStack Query hooks for occurrences CRUD operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import {
    Occurrence,
    OccurrenceWithRelations,
    OccurrenceInsert,
    OccurrenceStatus,
    ActionInsert,
    ActionType,
    AudioProcessingResult,
} from '../types/database';
import { useProfile } from './useProfile';

const OCCURRENCE_KEYS = {
    all: ['occurrences'] as const,
    lists: () => [...OCCURRENCE_KEYS.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...OCCURRENCE_KEYS.lists(), filters] as const,
    details: () => [...OCCURRENCE_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...OCCURRENCE_KEYS.details(), id] as const,
    stats: () => [...OCCURRENCE_KEYS.all, 'stats'] as const,
};

// ---- Fetch Occurrences List ----
export function useOccurrencesList(filters?: {
    status?: OccurrenceStatus;
    studentId?: string;
}) {
    const { profileId, canViewAllOccurrences } = useProfile();

    return useQuery({
        queryKey: OCCURRENCE_KEYS.list({ ...filters, profileId }),
        queryFn: async (): Promise<OccurrenceWithRelations[]> => {
            let query = supabase
                .from('occurrences')
                .select(`
          id, student_id, author_id, tutor_id, status, description_formal, created_at, updated_at,
          student:students!occurrences_student_id_fkey(id, name, matricula, class:classes!students_class_id_fkey(id, name)),
          author:profiles!occurrences_author_id_fkey(id, full_name, role),
          tutor:profiles!occurrences_tutor_id_fkey(id, full_name, role),
          actions(id, action_type, created_at, author:profiles!actions_author_id_fkey(id, full_name, role))
        `)
                .order('created_at', { ascending: false });

            // Apply status filter
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            // Apply student filter
            if (filters?.studentId) {
                query = query.eq('student_id', filters.studentId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return (data ?? []) as unknown as OccurrenceWithRelations[];
        },
        enabled: !!profileId,
        staleTime: 60_000,    // 1 minute — serve from cache on navigation
        gcTime: 300_000,      // 5 minutes — keep in memory
    });
}

// ---- Fetch Single Occurrence ----
export function useOccurrenceDetail(id: string) {
    return useQuery({
        queryKey: OCCURRENCE_KEYS.detail(id),
        queryFn: async (): Promise<OccurrenceWithRelations | null> => {
            const { data, error } = await supabase
                .from('occurrences')
                .select(`
          *,
          student:students!occurrences_student_id_fkey(*, class:classes!students_class_id_fkey(*)),
          author:profiles!occurrences_author_id_fkey(*),
          tutor:profiles!occurrences_tutor_id_fkey(*),
          actions(*, author:profiles!actions_author_id_fkey(*))
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as unknown as OccurrenceWithRelations;
        },
        enabled: !!id,
        staleTime: 30_000,   // 30s — detail view is refreshed more often
        gcTime: 180_000,     // 3 minutes
    });
}

// ---- Create Occurrence ----
export function useCreateOccurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: OccurrenceInsert): Promise<Occurrence> => {
            const { data, error } = await supabase
                .from('occurrences')
                .insert({
                    ...input,
                    status: OccurrenceStatus.PENDING_TUTOR,
                })
                .select()
                .single();

            if (error) throw error;
            return data as Occurrence;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
        },
    });
}

// ---- Add Action (Resolve / Escalate) ----
export function useAddAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: ActionInsert & { newStatus: OccurrenceStatus }): Promise<void> => {
            const { newStatus, ...actionData } = input;

            // Insert action
            const { error: actionError } = await supabase
                .from('actions')
                .insert(actionData);

            if (actionError) throw actionError;

            // Update occurrence status
            const { error: statusError } = await supabase
                .from('occurrences')
                .update({ status: newStatus })
                .eq('id', actionData.occurrence_id);

            if (statusError) throw statusError;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.detail(variables.occurrence_id) });
        },
    });
}

// ---- Update Action ----
export function useUpdateAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, description }: { id: string; description: string }): Promise<void> => {
            const { data, error } = await supabase
                .from('actions')
                .update({ description })
                .eq('id', id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Action not found or permission denied');
        },
        onSuccess: () => {
            // Invalidate to refresh occurrence details
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
        },
    });
}

// ---- Delete Occurrence ----
export function useDeleteOccurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('occurrences')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate the cache to ensure list refetches
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.lists() });
        },
    });
}



// ---- Process Text ----
export function useProcessText() {
    return useMutation({
        mutationFn: async (text: string): Promise<AudioProcessingResult> => { // Returns {original, formal} just like audio
            const TIMEOUT_MS = 60_000; // 60 seconds for text parsing

            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token || supabaseAnonKey;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {

                const res = await fetch(`${supabaseUrl}/functions/v1/process-text`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ text }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                const resText = await res.text();

                let parsed = null;
                try {
                    parsed = JSON.parse(resText);
                } catch (e) {
                    throw new Error(`Invalid JSON response: ${resText.substring(0, 100)}`);
                }

                if (!res.ok) {
                    const detailedError = parsed?.details || parsed?.error || `HTTP ${res.status}: ${JSON.stringify(parsed)}`;
                    throw new Error(detailedError);
                }

                // Return {original, formal}
                return parsed as AudioProcessingResult;
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') throw new Error('O processamento do texto demorou muito. Tente novamente.');
                throw err;
            }
        },
    });
}

// ---- Occurrence Stats ----
export function useOccurrenceStats() {
    return useQuery({
        queryKey: OCCURRENCE_KEYS.stats(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('occurrence_stats')
                .select('*');

            if (error) throw error;
            return data ?? [];
        },
    });
}

export { OCCURRENCE_KEYS };
export default useOccurrencesList;
