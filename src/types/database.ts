// src/types/database.ts
// TypeScript type definitions for the Ocorrências VC database schema

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

export enum OccurrenceLocation {
    SALA_DE_AULA = 'SALA_DE_AULA',
    SALA_DE_LEITURA = 'SALA_DE_LEITURA',
    SALA_DE_INFORMATICA = 'SALA_DE_INFORMATICA',
    CORREDORES = 'CORREDORES',
    REFEITORIO = 'REFEITORIO',
    QUADRA_POLIESPORTIVA = 'QUADRA_POLIESPORTIVA',
    PATIO = 'PATIO',
    ARREDORES_DA_ESCOLA = 'ARREDORES_DA_ESCOLA',
}

export enum OccurrenceCategory {
    AGRESSAO_FISICA = 'AGRESSAO_FISICA',
    APOLOGIA_AO_NAZISMO = 'APOLOGIA_AO_NAZISMO',
    ASSEDIO_MORAL = 'ASSEDIO_MORAL',
    ASSEDIO_SEXUAL = 'ASSEDIO_SEXUAL',
    BULLYING_E_CYBERBULLYING = 'BULLYING_E_CYBERBULLYING',
    COMERCIALIZACAO_DE_ALCOOL_E_TABACO = 'COMERCIALIZACAO_DE_ALCOOL_E_TABACO',
    COMUNICACAO_VIOLENTA = 'COMUNICACAO_VIOLENTA',
    CONSUMO_DE_ALCOOL_E_TABACO = 'CONSUMO_DE_ALCOOL_E_TABACO',
    CONSUMO_DE_CIGARRO_ELETRONICO = 'CONSUMO_DE_CIGARRO_ELETRONICO',
    CONSUMO_DE_SUBSTANCIAS_ILICITAS = 'CONSUMO_DE_SUBSTANCIAS_ILICITAS',
    DANOS_AO_PATRIMONIO = 'DANOS_AO_PATRIMONIO',
    ENVOLVIMENTO_COM_TRAFICO = 'ENVOLVIMENTO_COM_TRAFICO',
    FURTO = 'FURTO',
    GORDOFOBIA = 'GORDOFOBIA',
    HOMOFOBIA = 'HOMOFOBIA',
    IMPORTUNACAO_SEXUAL = 'IMPORTUNACAO_SEXUAL',
    INCITAMENTO_ATOS_INFRACIONAIS = 'INCITAMENTO_ATOS_INFRACIONAIS',
    INDISCIPLINA = 'INDISCIPLINA',
    POSSE_DE_ARMA_BRANCA = 'POSSE_DE_ARMA_BRANCA',
    RACISMO = 'RACISMO',
    ROUBO = 'ROUBO',
    SINAIS_DE_ALTERACOES_EMOCIONAIS = 'SINAIS_DE_ALTERACOES_EMOCIONAIS',
    SINAIS_DE_AUTOMUTILACAO = 'SINAIS_DE_AUTOMUTILACAO',
    SINAIS_DE_ISOLAMENTO_SOCIAL = 'SINAIS_DE_ISOLAMENTO_SOCIAL',
    TRANSFOBIA = 'TRANSFOBIA',
    USO_INADEQUADO_DE_DISPOSITIVOS = 'USO_INADEQUADO_DE_DISPOSITIVOS',
    XENOFOBIA = 'XENOFOBIA',
    OUTRO = 'OUTRO',
    // Simplified teacher-facing categories (added in migration 20260316160000)
    DISCRIMINACAO = 'DISCRIMINACAO',
    VIOLENCIA_FISICA = 'VIOLENCIA_FISICA',
    VIOLENCIA_VERBAL = 'VIOLENCIA_VERBAL',
    CONSUMO_DE_SUBSTANCIAS = 'CONSUMO_DE_SUBSTANCIAS',
    PORTE_DE_ARMAS = 'PORTE_DE_ARMAS',
    SOFRIMENTO_EMOCIONAL = 'SOFRIMENTO_EMOCIONAL',
    EMERGENCIA_DE_SAUDE = 'EMERGENCIA_DE_SAUDE',
}

export enum OccurrenceFinalCategory {
    ACIDENTES_E_EVENTOS_INESPERADOS = 'ACIDENTES_E_EVENTOS_INESPERADOS',
    AGRESSAO_FISICA = 'AGRESSAO_FISICA',
    ALERTA_DE_DESAPARECIMENTO = 'ALERTA_DE_DESAPARECIMENTO',
    AMEACA_DE_ATAQUE_ATIVO = 'AMEACA_DE_ATAQUE_ATIVO',
    APOLOGIA_AO_NAZISMO = 'APOLOGIA_AO_NAZISMO',
    ASSEDIO_MORAL = 'ASSEDIO_MORAL',
    ASSEDIO_SEXUAL = 'ASSEDIO_SEXUAL',
    ATAQUE_ATIVO_CONCRETIZADO = 'ATAQUE_ATIVO_CONCRETIZADO',
    ATOS_OBSCENOS = 'ATOS_OBSCENOS',
    BULLYING_E_CYBERBULLYING = 'BULLYING_E_CYBERBULLYING',
    COMERCIALIZACAO_DE_ALCOOL_E_TABACO = 'COMERCIALIZACAO_DE_ALCOOL_E_TABACO',
    COMUNICACAO_VIOLENTA = 'COMUNICACAO_VIOLENTA',
    CONSUMO_DE_ALCOOL_E_TABACO = 'CONSUMO_DE_ALCOOL_E_TABACO',
    CONSUMO_DE_CIGARRO_ELETRONICO = 'CONSUMO_DE_CIGARRO_ELETRONICO',
    CONSUMO_DE_SUBSTANCIAS_ILICITAS = 'CONSUMO_DE_SUBSTANCIAS_ILICITAS',
    CRIMES_CIBERNETICOS = 'CRIMES_CIBERNETICOS',
    DANOS_AO_PATRIMONIO = 'DANOS_AO_PATRIMONIO',
    ENVOLVIMENTO_COM_TRAFICO = 'ENVOLVIMENTO_COM_TRAFICO',
    EVASAO_ESCOLAR = 'EVASAO_ESCOLAR',
    FAKE_NEWS = 'FAKE_NEWS',
    FEMINICIDIO = 'FEMINICIDIO',
    FURTO = 'FURTO',
    GORDOFOBIA = 'GORDOFOBIA',
    HOMICIDIO = 'HOMICIDIO',
    HOMOFOBIA = 'HOMOFOBIA',
    IMPORTUNACAO_SEXUAL = 'IMPORTUNACAO_SEXUAL',
    INCITAMENTO_ATOS_INFRACIONAIS = 'INCITAMENTO_ATOS_INFRACIONAIS',
    INDISCIPLINA = 'INDISCIPLINA',
    INVASAO = 'INVASAO',
    MAL_SUBITO = 'MAL_SUBITO',
    OBITO = 'OBITO',
    OCUPACAO_DE_UNIDADE_ESCOLAR = 'OCUPACAO_DE_UNIDADE_ESCOLAR',
    POSSE_DE_ARMA_BRANCA = 'POSSE_DE_ARMA_BRANCA',
    POSSE_DE_ARMA_DE_BRINQUEDO = 'POSSE_DE_ARMA_DE_BRINQUEDO',
    POSSE_DE_ARMA_DE_FOGO = 'POSSE_DE_ARMA_DE_FOGO',
    RACISMO = 'RACISMO',
    ROUBO = 'ROUBO',
    SEQUESTRO = 'SEQUESTRO',
    SINAIS_DE_ALTERACOES_EMOCIONAIS = 'SINAIS_DE_ALTERACOES_EMOCIONAIS',
    SINAIS_DE_AUTOMUTILACAO = 'SINAIS_DE_AUTOMUTILACAO',
    SINAIS_DE_ISOLAMENTO_SOCIAL = 'SINAIS_DE_ISOLAMENTO_SOCIAL',
    SITUACAO_DE_AMEACA = 'SITUACAO_DE_AMEACA',
    SUICIDIO_CONCRETIZADO = 'SUICIDIO_CONCRETIZADO',
    TENTATIVA_DE_SUICIDIO = 'TENTATIVA_DE_SUICIDIO',
    TRANSFOBIA = 'TRANSFOBIA',
    USO_INADEQUADO_DE_DISPOSITIVOS = 'USO_INADEQUADO_DE_DISPOSITIVOS',
    VIOLENCIA_DE_GENERO = 'VIOLENCIA_DE_GENERO',
    VIOLENCIA_DOMESTICA = 'VIOLENCIA_DOMESTICA',
    VULNERABILIDADE_FAMILIAR = 'VULNERABILIDADE_FAMILIAR',
    XENOFOBIA = 'XENOFOBIA',
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
    force_password_change: boolean;
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
    guardian_phone?: string | null;
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
    location: OccurrenceLocation;
    category: OccurrenceCategory;
    final_category: OccurrenceFinalCategory | null;
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
    force_password_change?: boolean;
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
    guardian_phone?: string | null;
}

export interface OccurrenceInsert {
    student_id: string;
    author_id: string;
    tutor_id?: string | null;
    description_original: string;
    description_formal: string;
    location: OccurrenceLocation;
    category: OccurrenceCategory;
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
    /** Diagnostic: which OpenRouter model was actually used */
    model_used?: string;
    /** Diagnostic: how many fallback models were tried before success */
    fallbacks_tried?: number;
    /** Diagnostic: total processing time in milliseconds (Edge Function side) */
    duration_ms?: number;
    /** Set when formalization failed and original text was returned as-is */
    error?: string | null;
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
