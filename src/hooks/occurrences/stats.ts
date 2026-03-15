import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../useProfile';
import { OCCURRENCE_KEYS } from './keys';

export function useOccurrenceStats() {
    const { profileId } = useProfile();

    return useQuery({
        queryKey: OCCURRENCE_KEYS.stats(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('occurrence_stats')
                .select('*');

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!profileId,
    });
}
