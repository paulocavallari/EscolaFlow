import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Student, StudentInsert, StudentWithRelations } from '../../types/database';
import { STUDENT_KEYS } from './keys';

export function useStudentsList(classId?: string) {
    return useQuery({
        queryKey: STUDENT_KEYS.list({ classId }),
        queryFn: async (): Promise<StudentWithRelations[]> => {
            let query = supabase
                .from('students')
                .select(`
          *,
          class:classes!students_class_id_fkey(*),
          tutor:profiles!students_tutor_id_fkey(*)
        `)
                .eq('active', true)
                .order('name');

            if (classId) {
                query = query.eq('class_id', classId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data ?? []) as unknown as StudentWithRelations[];
        },
        staleTime: 120_000,
        gcTime: 600_000,
    });
}

export function useCreateStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: StudentInsert): Promise<Student> => {
            const { data, error } = await supabase
                .from('students')
                .insert(input)
                .select()
                .single();

            if (error) throw error;
            return data as Student;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
        },
    });
}

export function useUpdateStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Student> & { id: string }): Promise<Student> => {
            const { data, error } = await supabase
                .from('students')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Student;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
        },
    });
}

export function useDeleteStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('students')
                .update({ active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
        },
    });
}
