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
          *,
          student:students!occurrences_student_id_fkey(*, class:classes!students_class_id_fkey(*)),
          author:profiles!occurrences_author_id_fkey(*),
          tutor:profiles!occurrences_tutor_id_fkey(*),
          actions(*, author:profiles!actions_author_id_fkey(*))
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
        },
    });
}

// ---- Process Audio ----
export function useProcessAudio() {
    return useMutation({
        mutationFn: async (audioUri: string): Promise<AudioProcessingResult> => {
            // Build FormData with the recorded audio file
            const formData = new FormData();

            if (Platform.OS === 'web') {
                // On Web: fetch blob from the blob: URI
                const blobResponse = await fetch(audioUri);
                const blob = await blobResponse.blob();
                formData.append('audio', blob, 'recording.m4a');
            } else {
                // On Native: pass the file object directly
                formData.append('audio', {
                    uri: audioUri,
                    type: 'audio/m4a',
                    name: 'recording.m4a',
                } as any);
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('User is not authenticated');
            }

            const functionUrl = `${supabaseUrl}/functions/v1/process-audio`;

            // Use native fetch so FormData is sent as proper multipart/form-data
            // (supabase.functions.invoke serializes FormData as JSON, breaking the upload)
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabaseAnonKey,
                    // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
                },
                body: formData,
            });

            let responseData: any;
            try {
                responseData = await response.json();
            } catch {
                throw new Error(`Audio processing failed: invalid response (status ${response.status})`);
            }

            if (!response.ok) {
                const message = responseData?.error ?? responseData?.details ?? 'Audio processing failed';
                console.error('Process audio error:', message, responseData);
                throw new Error(message);
            }

            // Edge function may return 200 with an error field on partial failures
            if (responseData?.error && !responseData?.original) {
                console.error('Process audio returned error:', responseData.error);
                throw new Error(responseData.error);
            }

            return responseData as AudioProcessingResult;
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
