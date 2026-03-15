-- Migration: Add location, category, and final_category to occurrences
-- Adds enum types for occurrence location (8 options), creation category (28 options),
-- and AI-assigned final category (50 options).

-- ============================================================
-- 1. Create enum: occurrence_location (8 school locations)
-- ============================================================
CREATE TYPE occurrence_location AS ENUM (
  'SALA_DE_AULA',
  'SALA_DE_LEITURA',
  'SALA_DE_INFORMATICA',
  'CORREDORES',
  'REFEITORIO',
  'QUADRA_POLIESPORTIVA',
  'PATIO',
  'ARREDORES_DA_ESCOLA'
);

-- ============================================================
-- 2. Create enum: occurrence_category (28 creation-time categories)
-- ============================================================
CREATE TYPE occurrence_category AS ENUM (
  'AGRESSAO_FISICA',
  'APOLOGIA_AO_NAZISMO',
  'ASSEDIO_MORAL',
  'ASSEDIO_SEXUAL',
  'BULLYING_E_CYBERBULLYING',
  'COMERCIALIZACAO_DE_ALCOOL_E_TABACO',
  'COMUNICACAO_VIOLENTA',
  'CONSUMO_DE_ALCOOL_E_TABACO',
  'CONSUMO_DE_CIGARRO_ELETRONICO',
  'CONSUMO_DE_SUBSTANCIAS_ILICITAS',
  'DANOS_AO_PATRIMONIO',
  'ENVOLVIMENTO_COM_TRAFICO',
  'FURTO',
  'GORDOFOBIA',
  'HOMOFOBIA',
  'IMPORTUNACAO_SEXUAL',
  'INCITAMENTO_ATOS_INFRACIONAIS',
  'INDISCIPLINA',
  'POSSE_DE_ARMA_BRANCA',
  'RACISMO',
  'ROUBO',
  'SINAIS_DE_ALTERACOES_EMOCIONAIS',
  'SINAIS_DE_AUTOMUTILACAO',
  'SINAIS_DE_ISOLAMENTO_SOCIAL',
  'TRANSFOBIA',
  'USO_INADEQUADO_DE_DISPOSITIVOS',
  'XENOFOBIA',
  'OUTRO'
);

-- ============================================================
-- 3. Create enum: occurrence_final_category (50 AI-assigned categories)
-- ============================================================
CREATE TYPE occurrence_final_category AS ENUM (
  'ACIDENTES_E_EVENTOS_INESPERADOS',
  'AGRESSAO_FISICA',
  'ALERTA_DE_DESAPARECIMENTO',
  'AMEACA_DE_ATAQUE_ATIVO',
  'APOLOGIA_AO_NAZISMO',
  'ASSEDIO_MORAL',
  'ASSEDIO_SEXUAL',
  'ATAQUE_ATIVO_CONCRETIZADO',
  'ATOS_OBSCENOS',
  'BULLYING_E_CYBERBULLYING',
  'COMERCIALIZACAO_DE_ALCOOL_E_TABACO',
  'COMUNICACAO_VIOLENTA',
  'CONSUMO_DE_ALCOOL_E_TABACO',
  'CONSUMO_DE_CIGARRO_ELETRONICO',
  'CONSUMO_DE_SUBSTANCIAS_ILICITAS',
  'CRIMES_CIBERNETICOS',
  'DANOS_AO_PATRIMONIO',
  'ENVOLVIMENTO_COM_TRAFICO',
  'EVASAO_ESCOLAR',
  'FAKE_NEWS',
  'FEMINICIDIO',
  'FURTO',
  'GORDOFOBIA',
  'HOMICIDIO',
  'HOMOFOBIA',
  'IMPORTUNACAO_SEXUAL',
  'INCITAMENTO_ATOS_INFRACIONAIS',
  'INDISCIPLINA',
  'INVASAO',
  'MAL_SUBITO',
  'OBITO',
  'OCUPACAO_DE_UNIDADE_ESCOLAR',
  'POSSE_DE_ARMA_BRANCA',
  'POSSE_DE_ARMA_DE_BRINQUEDO',
  'POSSE_DE_ARMA_DE_FOGO',
  'RACISMO',
  'ROUBO',
  'SEQUESTRO',
  'SINAIS_DE_ALTERACOES_EMOCIONAIS',
  'SINAIS_DE_AUTOMUTILACAO',
  'SINAIS_DE_ISOLAMENTO_SOCIAL',
  'SITUACAO_DE_AMEACA',
  'SUICIDIO_CONCRETIZADO',
  'TENTATIVA_DE_SUICIDIO',
  'TRANSFOBIA',
  'USO_INADEQUADO_DE_DISPOSITIVOS',
  'VIOLENCIA_DE_GENERO',
  'VIOLENCIA_DOMESTICA',
  'VULNERABILIDADE_FAMILIAR',
  'XENOFOBIA'
);

-- ============================================================
-- 4. Add columns to occurrences table
-- ============================================================
ALTER TABLE occurrences
  ADD COLUMN location occurrence_location NOT NULL DEFAULT 'SALA_DE_AULA',
  ADD COLUMN category occurrence_category NOT NULL DEFAULT 'OUTRO',
  ADD COLUMN final_category occurrence_final_category NULL;
