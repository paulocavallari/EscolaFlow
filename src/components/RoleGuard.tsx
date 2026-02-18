// src/components/RoleGuard.tsx
// RBAC wrapper component — renders children only if user has required role

import React from 'react';
import { UserRole } from '../types/database';
import { useAuth } from '../hooks/useAuth';

interface RoleGuardProps {
    /** Roles allowed to see the children */
    allowedRoles: UserRole[];
    /** Content to render if allowed */
    children: React.ReactNode;
    /** Optional fallback content when access denied */
    fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const { profile, loading } = useAuth();

    if (loading) return null;

    if (!profile || !allowedRoles.includes(profile.role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default RoleGuard;
