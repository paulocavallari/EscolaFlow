// src/lib/constants.ts
// App-wide constants, labels, and color mappings

import { OccurrenceStatus, UserRole, ActionType, OccurrenceLocation, OccurrenceCategory, OccurrenceFinalCategory } from '../types/database';
import { darkColors } from './theme';

// ============================================================
// Backward-compat COLORS alias (maps to dark theme tokens)
// Use `useTheme().colors` in components for dynamic theming.
// ============================================================
export const COLORS = {
    primary: darkColors.primary,
    primaryDark: darkColors.primaryContainer,
    primaryLight: darkColors.onPrimaryContainer,
    secondary: darkColors.secondary,
    secondaryDark: darkColors.secondaryContainer,
    accent: darkColors.warning,
    accentDark: darkColors.warningContainer,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceLight: darkColors.surfaceContainerHigh,
    card: darkColors.surface,
    border: darkColors.outline,
    textPrimary: darkColors.onSurface,
    textSecondary: darkColors.onSurfaceVariant,
    textMuted: darkColors.onSurfaceVariant,
    success: darkColors.success,
    warning: darkColors.warning,
    error: darkColors.error,
    info: darkColors.secondary,
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.6)',
};

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
// Location Labels
// ============================================================

export const LOCATION_LABELS: Record<OccurrenceLocation, string> = {
    [OccurrenceLocation.SALA_DE_AULA]: 'Sala de Aula',
    [OccurrenceLocation.SALA_DE_LEITURA]: 'Sala de Leitura',
    [OccurrenceLocation.SALA_DE_INFORMATICA]: 'Sala de Informática',
    [OccurrenceLocation.CORREDORES]: 'Corredores',
    [OccurrenceLocation.REFEITORIO]: 'Refeitório',
    [OccurrenceLocation.QUADRA_POLIESPORTIVA]: 'Quadra Poliesportiva',
    [OccurrenceLocation.PATIO]: 'Pátio',
    [OccurrenceLocation.ARREDORES_DA_ESCOLA]: 'Arredores da Escola',
};

// ============================================================
// Occurrence Category Labels (28 creation-time categories)
// ============================================================

export const CATEGORY_LABELS: Record<OccurrenceCategory, string> = {
    [OccurrenceCategory.AGRESSAO_FISICA]: 'Agressão Física',
    [OccurrenceCategory.APOLOGIA_AO_NAZISMO]: 'Apologia ao Nazismo',
    [OccurrenceCategory.ASSEDIO_MORAL]: 'Assédio Moral',
    [OccurrenceCategory.ASSEDIO_SEXUAL]: 'Assédio Sexual',
    [OccurrenceCategory.BULLYING_E_CYBERBULLYING]: 'Bullying e Cyberbullying',
    [OccurrenceCategory.COMERCIALIZACAO_DE_ALCOOL_E_TABACO]: 'Comercialização de Álcool e Tabaco',
    [OccurrenceCategory.COMUNICACAO_VIOLENTA]: 'Comunicação Violenta / Conflito Verbal',
    [OccurrenceCategory.CONSUMO_DE_ALCOOL_E_TABACO]: 'Consumo de Álcool e Tabaco',
    [OccurrenceCategory.CONSUMO_DE_CIGARRO_ELETRONICO]: 'Consumo de Cigarro Eletrônico',
    [OccurrenceCategory.CONSUMO_DE_SUBSTANCIAS_ILICITAS]: 'Consumo de Substâncias Ilícitas',
    [OccurrenceCategory.DANOS_AO_PATRIMONIO]: 'Danos ao Patrimônio',
    [OccurrenceCategory.ENVOLVIMENTO_COM_TRAFICO]: 'Envolvimento com Tráfico de Drogas Ilícitas e Psicoativas',
    [OccurrenceCategory.FURTO]: 'Furto',
    [OccurrenceCategory.GORDOFOBIA]: 'Gordofobia',
    [OccurrenceCategory.HOMOFOBIA]: 'Homofobia',
    [OccurrenceCategory.IMPORTUNACAO_SEXUAL]: 'Importunação Sexual / Estupro',
    [OccurrenceCategory.INCITAMENTO_ATOS_INFRACIONAIS]: 'Incitamento e Associação a Atos Infracionais / Crimes',
    [OccurrenceCategory.INDISCIPLINA]: 'Indisciplina',
    [OccurrenceCategory.POSSE_DE_ARMA_BRANCA]: 'Posse de Arma Branca',
    [OccurrenceCategory.RACISMO]: 'Racismo',
    [OccurrenceCategory.ROUBO]: 'Roubo',
    [OccurrenceCategory.SINAIS_DE_ALTERACOES_EMOCIONAIS]: 'Sinais de Alterações Emocionais (Irritabilidade, Agressividade, Ansiedade, Pânico etc.)',
    [OccurrenceCategory.SINAIS_DE_AUTOMUTILACAO]: 'Sinais de Automutilação',
    [OccurrenceCategory.SINAIS_DE_ISOLAMENTO_SOCIAL]: 'Sinais de Isolamento Social',
    [OccurrenceCategory.TRANSFOBIA]: 'Transfobia',
    [OccurrenceCategory.USO_INADEQUADO_DE_DISPOSITIVOS]: 'Uso Inadequado de Dispositivos Eletrônicos',
    [OccurrenceCategory.XENOFOBIA]: 'Xenofobia',
    [OccurrenceCategory.OUTRO]: 'Outro Tipo de Ocorrência',
};

// ============================================================
// Final Category Labels (50 AI-assigned categories)
// ============================================================

export const FINAL_CATEGORY_LABELS: Record<OccurrenceFinalCategory, string> = {
    [OccurrenceFinalCategory.ACIDENTES_E_EVENTOS_INESPERADOS]: 'Acidentes e Eventos Inesperados',
    [OccurrenceFinalCategory.AGRESSAO_FISICA]: 'Agressão Física',
    [OccurrenceFinalCategory.ALERTA_DE_DESAPARECIMENTO]: 'Alerta de Desaparecimento',
    [OccurrenceFinalCategory.AMEACA_DE_ATAQUE_ATIVO]: 'Ameaça de Ataque Ativo',
    [OccurrenceFinalCategory.APOLOGIA_AO_NAZISMO]: 'Apologia ao Nazismo',
    [OccurrenceFinalCategory.ASSEDIO_MORAL]: 'Assédio Moral',
    [OccurrenceFinalCategory.ASSEDIO_SEXUAL]: 'Assédio Sexual',
    [OccurrenceFinalCategory.ATAQUE_ATIVO_CONCRETIZADO]: 'Ataque Ativo Concretizado',
    [OccurrenceFinalCategory.ATOS_OBSCENOS]: 'Atos Obscenos / Atos Libidinosos',
    [OccurrenceFinalCategory.BULLYING_E_CYBERBULLYING]: 'Bullying e Cyberbullying',
    [OccurrenceFinalCategory.COMERCIALIZACAO_DE_ALCOOL_E_TABACO]: 'Comercialização de Álcool e Tabaco',
    [OccurrenceFinalCategory.COMUNICACAO_VIOLENTA]: 'Comunicação Violenta / Conflito Verbal',
    [OccurrenceFinalCategory.CONSUMO_DE_ALCOOL_E_TABACO]: 'Consumo de Álcool e Tabaco',
    [OccurrenceFinalCategory.CONSUMO_DE_CIGARRO_ELETRONICO]: 'Consumo de Cigarro Eletrônico',
    [OccurrenceFinalCategory.CONSUMO_DE_SUBSTANCIAS_ILICITAS]: 'Consumo de Substâncias Ilícitas',
    [OccurrenceFinalCategory.CRIMES_CIBERNETICOS]: 'Crimes Cibernéticos',
    [OccurrenceFinalCategory.DANOS_AO_PATRIMONIO]: 'Danos ao Patrimônio',
    [OccurrenceFinalCategory.ENVOLVIMENTO_COM_TRAFICO]: 'Envolvimento com Tráfico de Drogas Ilícitas e Psicoativas',
    [OccurrenceFinalCategory.EVASAO_ESCOLAR]: 'Evasão Escolar',
    [OccurrenceFinalCategory.FAKE_NEWS]: 'Fake News – Disseminação de Informações Falsas',
    [OccurrenceFinalCategory.FEMINICIDIO]: 'Feminicídio',
    [OccurrenceFinalCategory.FURTO]: 'Furto',
    [OccurrenceFinalCategory.GORDOFOBIA]: 'Gordofobia',
    [OccurrenceFinalCategory.HOMICIDIO]: 'Homicídio / Homicídio Tentado',
    [OccurrenceFinalCategory.HOMOFOBIA]: 'Homofobia',
    [OccurrenceFinalCategory.IMPORTUNACAO_SEXUAL]: 'Importunação Sexual / Estupro',
    [OccurrenceFinalCategory.INCITAMENTO_ATOS_INFRACIONAIS]: 'Incitamento e Associação a Atos Infracionais / Crimes',
    [OccurrenceFinalCategory.INDISCIPLINA]: 'Indisciplina',
    [OccurrenceFinalCategory.INVASAO]: 'Invasão',
    [OccurrenceFinalCategory.MAL_SUBITO]: 'Mal Súbito',
    [OccurrenceFinalCategory.OBITO]: 'Óbito',
    [OccurrenceFinalCategory.OCUPACAO_DE_UNIDADE_ESCOLAR]: 'Ocupação de Unidade Escolar',
    [OccurrenceFinalCategory.POSSE_DE_ARMA_BRANCA]: 'Posse de Arma Branca',
    [OccurrenceFinalCategory.POSSE_DE_ARMA_DE_BRINQUEDO]: 'Posse de Arma de Brinquedo',
    [OccurrenceFinalCategory.POSSE_DE_ARMA_DE_FOGO]: 'Posse de Arma de Fogo / Simulacro',
    [OccurrenceFinalCategory.RACISMO]: 'Racismo',
    [OccurrenceFinalCategory.ROUBO]: 'Roubo',
    [OccurrenceFinalCategory.SEQUESTRO]: 'Sequestro',
    [OccurrenceFinalCategory.SINAIS_DE_ALTERACOES_EMOCIONAIS]: 'Sinais de Alterações Emocionais (Irritabilidade, Agressividade, Ansiedade, Pânico etc.)',
    [OccurrenceFinalCategory.SINAIS_DE_AUTOMUTILACAO]: 'Sinais de Automutilação',
    [OccurrenceFinalCategory.SINAIS_DE_ISOLAMENTO_SOCIAL]: 'Sinais de Isolamento Social',
    [OccurrenceFinalCategory.SITUACAO_DE_AMEACA]: 'Situação de Ameaça',
    [OccurrenceFinalCategory.SUICIDIO_CONCRETIZADO]: 'Suicídio Concretizado',
    [OccurrenceFinalCategory.TENTATIVA_DE_SUICIDIO]: 'Tentativa de Suicídio',
    [OccurrenceFinalCategory.TRANSFOBIA]: 'Transfobia',
    [OccurrenceFinalCategory.USO_INADEQUADO_DE_DISPOSITIVOS]: 'Uso Inadequado de Dispositivos Eletrônicos',
    [OccurrenceFinalCategory.VIOLENCIA_DE_GENERO]: 'Violência de Gênero contra Meninas e Mulheres',
    [OccurrenceFinalCategory.VIOLENCIA_DOMESTICA]: 'Violência Doméstica / Maus Tratos',
    [OccurrenceFinalCategory.VULNERABILIDADE_FAMILIAR]: 'Vulnerabilidade Familiar / Cuidados Parentais',
    [OccurrenceFinalCategory.XENOFOBIA]: 'Xenofobia',
};

// ============================================================
// Pre-generated descriptions for categories 1-27
// ============================================================

export const CATEGORY_DEFAULT_DESCRIPTIONS: Partial<Record<OccurrenceCategory, string>> = {
    [OccurrenceCategory.AGRESSAO_FISICA]: 'O(a) aluno(a) envolveu-se em episódio de agressão física contra outro(a) aluno(a) nas dependências da escola. O fato foi presenciado pela equipe escolar, que interveio imediatamente para conter a situação e garantir a segurança dos envolvidos.',
    [OccurrenceCategory.APOLOGIA_AO_NAZISMO]: 'O(a) aluno(a) realizou manifestação de apologia ao nazismo nas dependências da escola, por meio de gestos, símbolos ou falas que remetem à ideologia nazista. A equipe escolar interveio imediatamente.',
    [OccurrenceCategory.ASSEDIO_MORAL]: 'O(a) aluno(a) praticou assédio moral contra outro(a) estudante, por meio de humilhações, intimidações ou constrangimentos repetidos. A situação foi relatada à equipe escolar para as devidas providências.',
    [OccurrenceCategory.ASSEDIO_SEXUAL]: 'Foi registrada situação de assédio sexual envolvendo o(a) aluno(a), com condutas de natureza sexual não desejada dirigidas a outro(a) estudante. A equipe escolar tomou conhecimento do fato e adotou as providências previstas no protocolo institucional.',
    [OccurrenceCategory.BULLYING_E_CYBERBULLYING]: 'O(a) aluno(a) praticou atos de bullying e/ou cyberbullying contra outro(a) estudante, com condutas de intimidação, humilhação ou perseguição, seja presencialmente ou por meios digitais. O fato foi comunicado à equipe escolar.',
    [OccurrenceCategory.COMERCIALIZACAO_DE_ALCOOL_E_TABACO]: 'O(a) aluno(a) foi flagrado(a) comercializando produtos derivados de álcool e/ou tabaco nas dependências da escola. A equipe escolar apreendeu o material e registrou a ocorrência.',
    [OccurrenceCategory.COMUNICACAO_VIOLENTA]: 'O(a) aluno(a) envolveu-se em episódio de comunicação violenta e/ou conflito verbal com outro(a) estudante ou membro da equipe escolar. O fato provocou perturbação do ambiente escolar e foi mediado pela equipe pedagógica.',
    [OccurrenceCategory.CONSUMO_DE_ALCOOL_E_TABACO]: 'O(a) aluno(a) foi flagrado(a) consumindo álcool e/ou tabaco nas dependências da escola. A equipe escolar interveio e registrou a ocorrência para acompanhamento.',
    [OccurrenceCategory.CONSUMO_DE_CIGARRO_ELETRONICO]: 'O(a) aluno(a) foi flagrado(a) fazendo uso de cigarro eletrônico (vape/pod) nas dependências da escola. O dispositivo foi apreendido e a equipe escolar registrou a ocorrência.',
    [OccurrenceCategory.CONSUMO_DE_SUBSTANCIAS_ILICITAS]: 'O(a) aluno(a) foi flagrado(a) consumindo substâncias ilícitas nas dependências da escola. A equipe escolar interveio imediatamente e acionou os procedimentos institucionais previstos.',
    [OccurrenceCategory.DANOS_AO_PATRIMONIO]: 'O(a) aluno(a) causou danos ao patrimônio da escola, danificando intencionalmente bens móveis ou imóveis da unidade escolar. O fato foi registrado e comunicado à equipe gestora.',
    [OccurrenceCategory.ENVOLVIMENTO_COM_TRAFICO]: 'O(a) aluno(a) apresentou indícios de envolvimento com tráfico de drogas ilícitas e/ou psicoativas nas dependências ou proximidades da escola. A equipe escolar registrou a ocorrência e acionou os protocolos institucionais.',
    [OccurrenceCategory.FURTO]: 'O(a) aluno(a) foi identificado(a) como autor(a) de furto de pertences de outro(a) estudante ou de bens da escola. O fato foi registrado e os responsáveis foram comunicados.',
    [OccurrenceCategory.GORDOFOBIA]: 'O(a) aluno(a) praticou ato discriminatório de gordofobia contra outro(a) estudante, por meio de ofensas, piadas ou exclusão motivada pela aparência física. A equipe escolar tomou ciência e registrou a ocorrência.',
    [OccurrenceCategory.HOMOFOBIA]: 'O(a) aluno(a) praticou ato discriminatório de homofobia contra outro(a) estudante, por meio de ofensas, intimidações ou exclusão motivada pela orientação sexual. A equipe escolar registrou a ocorrência.',
    [OccurrenceCategory.IMPORTUNACAO_SEXUAL]: 'Foi registrada situação de importunação sexual envolvendo o(a) aluno(a). A equipe escolar tomou conhecimento do fato e adotou imediatamente as providências previstas no protocolo institucional.',
    [OccurrenceCategory.INCITAMENTO_ATOS_INFRACIONAIS]: 'O(a) aluno(a) praticou incitamento e/ou associação a atos infracionais ou crimes nas dependências da escola, incentivando outros estudantes à prática de condutas ilícitas. A equipe escolar registrou a ocorrência.',
    [OccurrenceCategory.INDISCIPLINA]: 'O(a) aluno(a) apresentou comportamento de indisciplina em sala de aula, descumprindo as normas de convivência escolar. O fato prejudicou o andamento das atividades pedagógicas e foi registrado pela equipe docente.',
    [OccurrenceCategory.POSSE_DE_ARMA_BRANCA]: 'O(a) aluno(a) foi flagrado(a) portando arma branca nas dependências da escola. O objeto foi apreendido pela equipe escolar e as autoridades competentes foram acionadas conforme protocolo institucional.',
    [OccurrenceCategory.RACISMO]: 'O(a) aluno(a) praticou ato de racismo contra outro(a) estudante ou membro da comunidade escolar, por meio de ofensas, discriminação ou tratamento desigual motivado pela raça ou cor. A equipe escolar registrou a ocorrência.',
    [OccurrenceCategory.ROUBO]: 'O(a) aluno(a) foi identificado(a) como autor(a) de roubo, utilizando ameaça ou violência para subtrair pertences de outro(a) estudante ou bens da escola. O fato foi registrado e as providências institucionais foram tomadas.',
    [OccurrenceCategory.SINAIS_DE_ALTERACOES_EMOCIONAIS]: 'O(a) aluno(a) apresentou sinais de alterações emocionais, tais como irritabilidade excessiva, agressividade, ansiedade ou episódios de pânico durante o período escolar. A equipe pedagógica registrou a ocorrência para acompanhamento.',
    [OccurrenceCategory.SINAIS_DE_AUTOMUTILACAO]: 'Foram observados sinais de automutilação no(a) aluno(a) durante o período escolar. A equipe pedagógica registrou a ocorrência e acionou os procedimentos de acolhimento e encaminhamento previstos.',
    [OccurrenceCategory.SINAIS_DE_ISOLAMENTO_SOCIAL]: 'O(a) aluno(a) apresentou sinais de isolamento social persistente, evitando interações com colegas e participação nas atividades escolares. A equipe pedagógica registrou a ocorrência para acompanhamento.',
    [OccurrenceCategory.TRANSFOBIA]: 'O(a) aluno(a) praticou ato discriminatório de transfobia contra outro(a) estudante, por meio de ofensas, intimidações ou exclusão motivada pela identidade de gênero. A equipe escolar registrou a ocorrência.',
    [OccurrenceCategory.USO_INADEQUADO_DE_DISPOSITIVOS]: 'O(a) aluno(a) fez uso inadequado de dispositivos eletrônicos durante o período escolar, descumprindo as normas da escola sobre utilização de celulares e outros aparelhos. A equipe docente registrou a ocorrência.',
    [OccurrenceCategory.XENOFOBIA]: 'O(a) aluno(a) praticou ato discriminatório de xenofobia contra outro(a) estudante, por meio de ofensas ou exclusão motivada pela nacionalidade ou origem. A equipe escolar registrou a ocorrência.',
};

// ============================================================
// App Config
// ============================================================

export const APP_NAME = 'Ocorrências VC';
export const ITEMS_PER_PAGE = 20;


