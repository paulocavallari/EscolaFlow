export const OCCURRENCE_KEYS = {
    all: ['occurrences'] as const,
    lists: () => [...OCCURRENCE_KEYS.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...OCCURRENCE_KEYS.lists(), filters] as const,
    details: () => [...OCCURRENCE_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...OCCURRENCE_KEYS.details(), id] as const,
    stats: () => [...OCCURRENCE_KEYS.all, 'stats'] as const,
};
