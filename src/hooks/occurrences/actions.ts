import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { ActionInsert, OccurrenceCategory, OccurrenceStatus } from '../../types/database';
import { OCCURRENCE_KEYS } from './keys';

export function useAddAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: ActionInsert & { newStatus: OccurrenceStatus; category?: OccurrenceCategory }): Promise<void> => {
            const { newStatus, category, ...actionData } = input;

            const { error: actionError } = await supabase
                .from('actions')
                .insert(actionData);

            if (actionError) throw actionError;

            const updatePayload: Record<string, any> = { status: newStatus };
            if (category) {
                updatePayload.category = category;
            }

            const { error: statusError } = await supabase
                .from('occurrences')
                .update(updatePayload)
                .eq('id', actionData.occurrence_id);

            if (statusError) throw statusError;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.detail(variables.occurrence_id) });
        },
    });
}

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
            queryClient.invalidateQueries({ queryKey: OCCURRENCE_KEYS.all });
        },
    });
}
