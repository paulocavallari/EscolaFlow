// src/lib/constants.ts
// App-wide constants, labels, and color mappings

import { OccurrenceStatus, UserRole, ActionType } from '../types/database';

// ============================================================
// Status Labels (Portuguese)
// ============================================================

export const STATUS_LABELS: Record<OccurrenceStatus, string> = {
    [OccurrenceStatus.PENDING_TUTOR]: 'Aguardando Tratativa',
    [OccurrenceStatus.ESCALATED_VP]: 'Encaminhado à Vice-Direção',
    [OccurrenceStatus.CONCLUDED]: 'Concluída',
};

export const STATUS_COLORS: Record<OccurrenceStatus, { bg: string; text: string; border: string }> = {
    [OccurrenceStatus.PENDING_TUTOR]: {
        bg: '#FFF3CD',
        text: '#856404',
        border: '#FFEEBA',
    },
    [OccurrenceStatus.ESCALATED_VP]: {
        bg: '#F8D7DA',
        text: '#721C24',
        border: '#F5C6CB',
    },
    [OccurrenceStatus.CONCLUDED]: {
        bg: '#D4EDDA',
        text: '#155724',
        border: '#C3E6CB',
    },
};

// ============================================================
// Role Labels
// ============================================================

export const ROLE_LABELS: Record<UserRole, string> = {
    [UserRole.PROFESSOR]: 'Professor(a)',
    [UserRole.VICE_DIRECTOR]: 'Vice-Diretor(a)',
    [UserRole.ADMIN]: 'Administrador(a)',
};

export const ROLE_COLORS: Record<UserRole, string> = {
    [UserRole.PROFESSOR]: '#4A90D9',
    [UserRole.VICE_DIRECTOR]: '#7B68EE',
    [UserRole.ADMIN]: '#E74C3C',
};

// ============================================================
// Action Type Labels
// ============================================================

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
    [ActionType.RESOLUTION]: 'Resolução',
    [ActionType.ESCALATION]: 'Escalonamento',
    [ActionType.VP_RESOLUTION]: 'Resolução Vice-Direção',
};

// ============================================================
// App Config
// ============================================================

export const APP_NAME = 'EscolaFlow';
export const ITEMS_PER_PAGE = 20;

// ============================================================
// Theme Colors
// ============================================================

export const COLORS = {
    // Primary palette
    primary: '#6366F1',      // Indigo
    primaryDark: '#4F46E5',
    primaryLight: '#A5B4FC',

    // Secondary
    secondary: '#0EA5E9',    // Sky blue
    secondaryDark: '#0284C7',

    // Accent
    accent: '#F59E0B',       // Amber
    accentDark: '#D97706',

    // Neutrals
    background: '#0F172A',   // Slate 900
    surface: '#1E293B',      // Slate 800
    surfaceLight: '#334155',  // Slate 700
    card: '#1E293B',
    border: '#475569',       // Slate 600

    // Text
    textPrimary: '#F8FAFC',  // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B',    // Slate 500

    // Status
    success: '#10B981',      // Emerald
    warning: '#F59E0B',      // Amber
    error: '#EF4444',        // Red
    info: '#3B82F6',         // Blue

    // Misc
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.6)',
} as const;
