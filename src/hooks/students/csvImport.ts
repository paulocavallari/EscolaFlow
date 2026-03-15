import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { CSVImportResult } from '../../types/database';
import { STUDENT_KEYS } from './keys';

export function useImportCSV() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fileUri: string): Promise<CSVImportResult> => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { supabaseUrl, supabaseAnonKey } = await import('../../lib/supabase');

            const formData = new FormData();

            if (Platform.OS === 'web') {
                const response = await fetch(fileUri);
                const blob = await response.blob();
                const file = new File([blob], 'students.csv', { type: 'text/csv' });
                formData.append('file', file);
            } else {
                formData.append('file', {
                    uri: fileUri,
                    type: 'text/csv',
                    name: 'students.csv',
                } as unknown as Blob);
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);

            try {
                const result = await fetch(`${supabaseUrl}/functions/v1/import-csv`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': supabaseAnonKey,
                    },
                    body: formData,
                    signal: controller.signal,
                });

                if (!result.ok) {
                    const errBody = await result.text();
                    throw new Error(`CSV import failed: ${errBody}`);
                }

                return await result.json();
            } finally {
                clearTimeout(timeout);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
        },
    });
}
