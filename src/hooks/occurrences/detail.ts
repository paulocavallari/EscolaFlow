import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { OccurrenceWithRelations } from '../../types/database';
import { OCCURRENCE_KEYS } from './keys';

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
        staleTime: 30_000,
        gcTime: 180_000,
    });
}
