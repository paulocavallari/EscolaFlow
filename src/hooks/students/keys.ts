export const STUDENT_KEYS = {
    all: ['students'] as const,
    lists: () => [...STUDENT_KEYS.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...STUDENT_KEYS.lists(), filters] as const,
};

export const CLASS_KEYS = {
    all: ['classes'] as const,
    lists: () => [...CLASS_KEYS.all, 'list'] as const,
};

export const PROFILE_KEYS = {
    all: ['profiles'] as const,
    lists: () => [...PROFILE_KEYS.all, 'list'] as const,
    tutors: () => [...PROFILE_KEYS.all, 'tutors'] as const,
};
