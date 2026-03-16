# Segurança da Aplicação

## 1. Objetivos de segurança
- Proteger dados de alunos e ocorrências
- Garantir segregação por papel (professor, vice-diretor, admin)
- Evitar exposição de credenciais privilegiadas no cliente
- Manter trilha de ações para accountability

## 2. Modelo de ameaça resumido
### 2.1 Ativos críticos
- dados pessoais (alunos, responsáveis, equipe)
- relatos e tratativas
- credenciais (service role, OPENROUTER, Evolution API)

### 2.2 Atores e riscos
- usuário autenticado tentando elevar privilégio
- uso indevido de endpoints administrativos
- vazamento de segredos em repositório/build
- abuso de endpoints externos (WhatsApp/IA)

## 3. Controles implementados
### 3.1 Autenticação
- Supabase Auth com sessão persistida
- JWT no Authorization para chamadas de funções protegidas

### 3.2 Autorização
- RLS no Postgres por papel e escopo de dados
- validação de papel em Edge Functions administrativas

### 3.3 Segregação de privilégios
- cliente usa anon key
- operações privilegiadas via createAdminClient em funções server-side

### 3.4 Validação de entrada
- validações de payload em funções críticas (ex.: admin-create-user)
- normalização de dados sensíveis (email, telefone)

### 3.5 Resiliência
- timeout e fallback na formalização de IA
- bloqueios de operação com mensagens claras para o usuário

## 4. Segurança por camada
### 4.1 Cliente
- sem service role no app
- controles visuais de role (tabs e ações)
- proteção de fluxo de autenticação e troca de senha inicial

### 4.2 Edge Functions
- padrão de verifyAuth para funções autenticadas
- regras de role para funções administrativas
- CORS centralizado em _shared/cors.ts

### 4.3 Banco de dados
- tabelas com RLS
- policies alinhadas com modelo de papéis
- migrations versionadas

## 5. Segredos e configuração
## 5.1 Segredos esperados no backend
- SUPABASE_SERVICE_ROLE_KEY
- OPENROUTER_API_KEY
- EVOLUTION_API_URL
- EVOLUTION_API_KEY
- EVOLUTION_INSTANCE_NAME

## 5.2 Boas práticas
- nunca versionar segredos reais
- rotacionar chaves periodicamente
- separar ambientes (dev/staging/prod)

## 6. Situação atual e recomendações
### 6.1 Recomendações imediatas
- remover referência a process-audio de supabase/config.toml
- avaliar configurar verify_jwt=true para process-text, mantendo defesa em profundidade
- rodar auditoria periódica de policies e grants

### 6.2 Recomendações de médio prazo
- rate limit por IP/usuário em funções expostas
- observabilidade centralizada com alertas de erro e abuso
- checklist de segurança no pipeline de release

## 7. Checklist de release seguro
- migrations aplicadas e revisadas
- secrets do ambiente validados
- smoke tests passando
- revisão de permissões/admin endpoints
- validação manual de fluxos críticos (criação, tratativa, exportação, notificação)

## 8. Resposta a incidentes (runbook curto)
1. Identificar endpoint/tabela impactada
2. Restringir acesso temporariamente (policy/feature flag)
3. Rotacionar chaves comprometidas
4. Analisar logs de funções e banco
5. Corrigir, validar, e registrar post-mortem
