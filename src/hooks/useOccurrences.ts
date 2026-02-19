// src/hooks/useOccurrences.ts
// TanStack Query hooks for occurrences CRUD operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
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
            // Convert audio to base64 and send as JSON.
            // This avoids FormData multipart issues and lets supabase.functions.invoke
            // handle all auth headers (anon key + JWT) automatically and correctly.
            let audioBase64: string;
            let mimeType: string;

            if (Platform.OS === 'web') {
                // Web: audioUri is a blob: URL
                const blobResponse = await fetch(audioUri);
                const blob = await blobResponse.blob();
                mimeType = blob.type || 'audio/webm';

                const arrayBuffer = await blob.arrayBuffer();
                const uint8 = new Uint8Array(arrayBuffer);
                // Convert to base64 in chunks to avoid call stack overflow on large files
                const chunkSize = 8192;
                let binary = '';
                for (let i = 0; i < uint8.length; i += chunkSize) {
                    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
                }
                audioBase64 = btoa(binary);
            } else {
                // Native: audioUri is a file:// path — read it via fetch (RN supports this)
                const fileResponse = await fetch(audioUri);
                const blob = await fileResponse.blob();
                mimeType = 'audio/mp4';

                const arrayBuffer = await blob.arrayBuffer();
                const uint8 = new Uint8Array(arrayBuffer);
                const chunkSize = 8192;
                let binary = '';
                for (let i = 0; i < uint8.length; i += chunkSize) {
                    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
                }
                audioBase64 = btoa(binary);
            }

            // supabase.functions.invoke handles anon key + JWT auth automatically
            const { data, error } = await supabase.functions.invoke('process-audio', {
                body: { audio: audioBase64, mimeType },
            });

            if (error) {
                console.error('Process audio invoke error:', error);
                throw new Error(error.message || 'Audio processing failed');
            }

            if (data?.error && !data?.original) {
                console.error('Process audio returned error:', data.error);
                throw new Error(data.error);
            }

            return data as AudioProcessingResult;
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
