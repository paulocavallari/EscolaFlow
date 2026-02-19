// src/types/database.ts
// TypeScript type definitions for the EscolaFlow database schema

// ============================================================
// Enums
// ============================================================

export enum UserRole {
    PROFESSOR = 'professor',
    VICE_DIRECTOR = 'vice_director',
    ADMIN = 'admin',
}

export enum OccurrenceStatus {
    PENDING_TUTOR = 'PENDING_TUTOR',
    ESCALATED_VP = 'ESCALATED_VP',
    CONCLUDED = 'CONCLUDED',
}

export enum ActionType {
    RESOLUTION = 'resolution',
    ESCALATION = 'escalation',
    VP_RESOLUTION = 'vp_resolution',
}

// ============================================================
// Table Row Types
// ============================================================

export interface Profile {
    id: string;
    auth_id: string;
    full_name: string;
    role: UserRole;
    whatsapp_number: string | null;
    email: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Class {
    id: string;
    name: string;
    year: number;
    active: boolean;
    created_at: string;
}

export interface Student {
    id: string;
    name: string;
    matricula: string | null;
    class_id: string;
    tutor_id: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Occurrence {
    id: string;
    student_id: string;
    author_id: string;
    tutor_id: string | null;
    description_original: string;
    description_formal: string;
    status: OccurrenceStatus;
    created_at: string;
    updated_at: string;
}

export interface Action {
    id: string;
    occurrence_id: string;
    author_id: string;
    description: string;
    action_type: ActionType;
    created_at: string;
}

// ============================================================
// Joined / Expanded Types (for queries with relations)
// ============================================================

export interface StudentWithRelations extends Student {
    class: Class;
    tutor: Profile | null;
}

export interface OccurrenceWithRelations extends Occurrence {
    student: Student & { class: Class };
    author: Profile;
    tutor: Profile | null;
    actions: ActionWithAuthor[];
}

export interface ActionWithAuthor extends Action {
    author: Profile;
}

// ============================================================
// Insert Types (for creating new rows)
// ============================================================

export interface ProfileInsert {
    auth_id: string;
    full_name: string;
    role: UserRole;
    whatsapp_number?: string | null;
    email?: string | null;
}

export interface ClassInsert {
    name: string;
    year?: number;
}

export interface StudentInsert {
    name: string;
    matricula?: string | null;
    class_id: string;
    tutor_id?: string | null;
}

export interface OccurrenceInsert {
    student_id: string;
    author_id: string;
    tutor_id?: string | null;
    description_original: string;
    description_formal: string;
}

export interface ActionInsert {
    occurrence_id: string;
    author_id: string;
    description: string;
    action_type: ActionType;
}

// ============================================================
// API Response Types
// ============================================================

export interface AudioProcessingResult {
    original: string;
    formal: string;
    rewrite_error?: string;
}

export interface CSVImportResult {
    total: number;
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
}

export interface OccurrenceStats {
    author_id: string;
    author_name: string;
    total_occurrences: number;
    pending: number;
    escalated: number;
    concluded: number;
}
