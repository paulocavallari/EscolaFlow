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

// ---- Process Audio ----
export function useProcessAudio() {
    return useMutation({
        mutationFn: async (audioUri: string): Promise<AudioProcessingResult> => {
            // Convert audio to base64 and send as JSON.
            // This avoids FormData multipart issues and lets supabase.functions.invoke
            // handle all auth headers (anon key + JWT) automatically and correctly.
            let audioBase64: string;
            let mimeType: string;

            console.log('[processAudio] Starting. Platform:', Platform.OS, 'URI:', audioUri.slice(0, 60));

            if (Platform.OS === 'web') {
                // Web: audioUri is a blob: URL
                console.log('[processAudio] Fetching blob from URI...');
                const blobResponse = await fetch(audioUri);
                const blob = await blobResponse.blob();
                mimeType = blob.type || 'audio/webm';
                console.log('[processAudio] Blob fetched. size=', blob.size, 'type=', mimeType);

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
                console.log('[processAudio] Fetching native file...');
                const fileResponse = await fetch(audioUri);
                const blob = await fileResponse.blob();
                mimeType = 'audio/mp4';
                console.log('[processAudio] Native file fetched. size=', blob.size);

                const arrayBuffer = await blob.arrayBuffer();
                const uint8 = new Uint8Array(arrayBuffer);
                const chunkSize = 8192;
                let binary = '';
                for (let i = 0; i < uint8.length; i += chunkSize) {
                    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
                }
                audioBase64 = btoa(binary);
            }

            console.log('[processAudio] Base64 ready. length=', audioBase64.length, 'mimeType=', mimeType);

            // Use raw fetch instead of supabase.functions.invoke because invoke 
            // swallows the JSON error body on 500 status codes.
            const TIMEOUT_MS = 90_000; // 90 seconds

            console.log('[processAudio] Invoking Edge Function process-audio via fetch...');

            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token || supabaseAnonKey;

            const invokePromise = fetch(`${supabaseUrl}/functions/v1/process-audio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ audio: audioBase64, mimeType })
            }).then(async (res) => {
                const text = await res.text();
                let parsed = null;
                try {
                    parsed = JSON.parse(text);
                } catch (e) {
                    throw new Error(`Invalid JSON response (status ${res.status}): ${text.substring(0, 100)}`);
                }

                if (!res.ok) {
                    // This is where we catch the detailed 500 error from the Edge Function
                    const detailedError = parsed?.details || parsed?.error || `HTTP ${res.status}: ${JSON.stringify(parsed)}`;
                    throw new Error(detailedError);
                }

                return { data: parsed, error: null };
            }).catch(error => {
                return { data: null, error };
            });

            const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
                setTimeout(
                    () => reject(new Error('Tempo limite atingido. O servidor demorou demais para responder.')),
                    TIMEOUT_MS
                )
            );

            const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

            console.log('[processAudio] Edge Function responded. error=', error, 'data keys=', data ? Object.keys(data) : null);

            if (error) {
                console.error('Process audio custom fetch error:', error);
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

// ---- Process Text ----
export function useProcessText() {
    return useMutation({
        mutationFn: async (text: string): Promise<AudioProcessingResult> => { // Returns {original, formal} just like audio
            const TIMEOUT_MS = 30_000; // 30 seconds for text parsing

            console.log('[processText] Invoking Edge Function process-text via fetch...');

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
