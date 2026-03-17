-- Migration: Add simplified teacher-facing categories to occurrence_category enum
-- These 7 new values complement the 28 existing values, forming 9 simplified categories
-- visible to professors when creating occurrences.
-- DANOS_AO_PATRIMONIO and INDISCIPLINA already exist and complete the 9 teacher categories.
-- All original 28 values are preserved for backward compatibility with existing data.

ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'DISCRIMINACAO';
ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'VIOLENCIA_FISICA';
ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'VIOLENCIA_VERBAL';
ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'CONSUMO_DE_SUBSTANCIAS';
ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'PORTE_DE_ARMAS';
ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'SOFRIMENTO_EMOCIONAL';
ALTER TYPE occurrence_category ADD VALUE IF NOT EXISTS 'EMERGENCIA_DE_SAUDE';
