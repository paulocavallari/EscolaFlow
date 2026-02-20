// src/hooks/useStudents.ts
// TanStack Query hooks for students, classes, and profiles management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
    Student,
    StudentWithRelations,
    StudentInsert,
    Class,
    ClassInsert,
    Profile,
    ProfileInsert,
    CSVImportResult,
} from '../types/database';

// ============================================================
// Query Keys
// ============================================================

const STUDENT_KEYS = {
    all: ['students'] as const,
    lists: () => [...STUDENT_KEYS.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...STUDENT_KEYS.lists(), filters] as const,
};

const CLASS_KEYS = {
    all: ['classes'] as const,
    lists: () => [...CLASS_KEYS.all, 'list'] as const,
};

const PROFILE_KEYS = {
    all: ['profiles'] as const,
    lists: () => [...PROFILE_KEYS.all, 'list'] as const,
    tutors: () => [...PROFILE_KEYS.all, 'tutors'] as const,
};

// ============================================================
// Students
// ============================================================

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
            // Soft delete
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

// ============================================================
// CSV Import
// ============================================================

export function useImportCSV() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fileUri: string): Promise<CSVImportResult> => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(fileUri);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('file', {
                uri: fileUri,
                type: 'text/csv',
                name: 'students.csv',
            } as unknown as Blob);

            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const result = await fetch(`${supabaseUrl}/functions/v1/import-csv`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!result.ok) {
                const errBody = await result.text();
                throw new Error(`CSV import failed: ${errBody}`);
            }

            return await result.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
        },
    });
}

// ============================================================
// Classes
// ============================================================

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
            // Soft delete
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

// ============================================================
// Profiles (Users)
// ============================================================

export function useProfilesList() {
    return useQuery({
        queryKey: PROFILE_KEYS.lists(),
        queryFn: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('active', true)
                .order('full_name');

            if (error) throw error;
            return (data ?? []) as Profile[];
        },
    });
}

export function useTutorsList() {
    return useQuery({
        queryKey: PROFILE_KEYS.tutors(),
        queryFn: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('active', true)
                .in('role', ['professor', 'vice_director'])
                .order('full_name');

            if (error) throw error;
            return (data ?? []) as Profile[];
        },
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }): Promise<Profile> => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Profile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.all });
        },
    });
}

export { STUDENT_KEYS, CLASS_KEYS, PROFILE_KEYS };
