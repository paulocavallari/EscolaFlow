# Arquitetura do EscolaFlow

## 1. Objetivo do sistema
O EscolaFlow e o aplicativo Ocorrências VC digitalizam o ciclo de registro e tratativa de ocorrências escolares com foco em:
- padronização da linguagem dos relatos,
- rastreabilidade de decisões,
- redução de tempo operacional,
- comunicação mais rápida com responsáveis e equipe gestora.

## 2. Contexto arquitetural
### 2.1 Stack principal
- Frontend: React Native 0.81 + Expo 54 + Expo Router
- Linguagem: TypeScript
- Estado remoto: TanStack Query v5
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- IA de formalização: OpenRouter (modelo racing multi-tier)
- Mensageria: Evolution API (WhatsApp)
- Build/distribuição: EAS Build

### 2.2 Princípios adotados
- App cliente com privilégios mínimos (anon key + RLS)
- Regras sensíveis concentradas em Edge Functions autenticadas
- Forte separação entre UI, hooks de domínio e integração externa
- Falha graciosa em serviços de IA (degradação para texto original)

## 3. Visão de componentes
## 3.1 App móvel/web
- Camada de rotas: app/ via Expo Router
- Camada de apresentação: componentes reutilizáveis em src/components/
- Camada de dados: hooks de domínio em src/hooks/
- Camada de serviços: integrações em src/services/
- Camada de infraestrutura cliente: src/lib/ (Supabase, theme, queryClient)

## 3.2 Backend Supabase
- Banco relacional com RLS por papel
- Edge Functions para operações privilegiadas e integrações externas
- Migrations versionadas em supabase/migrations/

## 4. Fluxos principais
### 4.1 Fluxo de criação de ocorrência
1. Professor seleciona aluno, local e categoria
2. Relato é digitado/gravado
3. Edge Function process-text formaliza o texto
4. Usuário revisa e confirma
5. Ocorrência é persistida em occurrences

### 4.2 Fluxo de tratativa
1. Tutor registra providência
2. Pode concluir ou escalar para vice-direção
3. Vice-diretor registra devolutiva e conclui
4. Histórico fica em actions

### 4.3 Fluxo de categoria
- Categoria inicial é atribuída no registro
- Em tratativa, tutor/vice-diretor podem reclassificar
- Se ocorrência estiver em OUTRO, conclusão exige seleção de categoria válida
- O PDF exibe a categoria consolidada final

## 5. Decisões de arquitetura
### 5.1 Expo Router (file-based routing)
Motivação:
- estrutura previsível por pastas,
- menor boilerplate,
- integração nativa com Expo.

Trade-off:
- acoplamento da organização de telas ao filesystem.

### 5.2 TanStack Query para estado remoto
Motivação:
- cache e invalidação robustos,
- melhor UX com loading/error states,
- simplificação de re-fetch pós mutação.

Trade-off:
- necessidade de disciplina de query keys.

### 5.3 Supabase como BaaS principal
Motivação:
- acelera autenticação, banco e serverless,
- RLS nativo reduz lógica de autorização no app.

Trade-off:
- requer governança rigorosa de políticas SQL.

### 5.4 Formalização via OpenRouter com corrida por tiers
Motivação:
- reduzir latência média,
- aumentar resiliência a indisponibilidade/rate-limit.

Trade-off:
- variabilidade de estilo entre modelos,
- manutenção periódica da lista de modelos.

### 5.5 Falha graciosa na IA
Motivação:
- não bloquear operação escolar quando IA falha.

Implementação:
- quando todos os modelos falham, retorna texto original e sinaliza erro não fatal.

## 6. Modelo de dados (alto nível)
### 6.1 Tabelas centrais
- profiles: identidade, papel e atributos de acesso
- classes: turmas
- students: alunos e vínculo com tutor
- occurrences: núcleo do domínio
- actions: histórico de tratativas

### 6.2 Relações relevantes
- occurrences.student_id -> students.id
- occurrences.author_id -> profiles.id
- occurrences.tutor_id -> profiles.id
- actions.occurrence_id -> occurrences.id
- actions.author_id -> profiles.id

### 6.3 Estados de ocorrência
- PENDING_TUTOR
- ESCALATED_VP
- CONCLUDED

## 7. Organização de código
### 7.1 Estrutura resumida
- app/: telas e navegação
- src/components/: UI e componentes de domínio
- src/hooks/: casos de uso client-side
- src/lib/: infraestrutura
- src/services/: integrações externas
- src/utils/: utilitários (ex.: PDF)
- supabase/functions/: backend serverless
- supabase/migrations/: evolução de schema

### 7.2 Convenções
- TypeScript em toda a base
- Labels em português (domínio escolar local)
- Hooks por contexto de domínio (occurrences, students)
- Evitar service role no cliente

## 8. Escalabilidade e evolução
### 8.1 Escalabilidade atual
- app escalável para múltiplas escolas via separação por dados
- função de IA preparada para fallback multi-modelo

### 8.2 Evoluções recomendadas
- feature flags para ativar/desativar modelos de IA
- métricas de latência por modelo para ajuste de tiers
- trilha de auditoria mais granular para alterações críticas

## 9. Riscos e débitos técnicos
- supabase/config.toml ainda referencia process-audio apesar de removido
- process-text com verify_jwt=false em config, embora valide JWT manualmente
- necessidade de revisão periódica das RLS policies

## 10. Diretrizes para novos recursos
- qualquer operação administrativa deve ir para Edge Function autenticada
- mudanças de schema sempre via nova migration
- mutações devem invalidar query keys afetadas
- endpoints externos devem ter timeout, retry controlado e logs úteis
