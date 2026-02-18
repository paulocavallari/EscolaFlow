// src/hooks/useProfile.ts
// Hook for accessing the current user's profile and role

import { useAuth } from './useAuth';
import { Profile, UserRole } from '../types/database';

export interface UseProfileReturn {
    profile: Profile | null;
    role: UserRole | null;
    profileId: string | null;
    fullName: string;
    isLoading: boolean;
    canCreateOccurrences: boolean;
    canTreatOccurrences: boolean;
    canEscalate: boolean;
    canManageAdmin: boolean;
    canViewAllOccurrences: boolean;
}

export function useProfile(): UseProfileReturn {
    const { profile, loading } = useAuth();

    const role = profile?.role ?? null;

    return {
        profile,
        role,
        profileId: profile?.id ?? null,
        fullName: profile?.full_name ?? '',
        isLoading: loading,

        // Permission checks
        canCreateOccurrences: role !== null, // All roles can create
        canTreatOccurrences: role === UserRole.PROFESSOR || role === UserRole.VICE_DIRECTOR,
        canEscalate: role === UserRole.PROFESSOR, // Only tutors escalate
        canManageAdmin: role === UserRole.ADMIN,
        canViewAllOccurrences: role === UserRole.ADMIN || role === UserRole.VICE_DIRECTOR,
    };
}

export default useProfile;
