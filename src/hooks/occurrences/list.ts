import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { OccurrenceStatus, OccurrenceWithRelations } from '../../types/database';
import { useProfile } from '../useProfile';
import { OCCURRENCE_KEYS } from './keys';

export function useOccurrencesList(filters?: {
    status?: OccurrenceStatus;
    studentId?: string;
}) {
    const { profileId } = useProfile();

    return useQuery({
        queryKey: OCCURRENCE_KEYS.list({ ...filters, profileId }),
        queryFn: async (): Promise<OccurrenceWithRelations[]> => {
            let query = supabase
                .from('occurrences')
                .select(`
          id, student_id, author_id, tutor_id, status, description_formal, created_at, updated_at, location, category, final_category,
          student:students!occurrences_student_id_fkey(id, name, matricula, class:classes!students_class_id_fkey(id, name)),
          author:profiles!occurrences_author_id_fkey(id, full_name, role),
          tutor:profiles!occurrences_tutor_id_fkey(id, full_name, role),
          actions(id, action_type, created_at, author:profiles!actions_author_id_fkey(id, full_name, role))
        `)
                .order('created_at', { ascending: false });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            if (filters?.studentId) {
                query = query.eq('student_id', filters.studentId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return (data ?? []) as unknown as OccurrenceWithRelations[];
        },
        enabled: !!profileId,
        staleTime: 60_000,
        gcTime: 300_000,
    });
}
