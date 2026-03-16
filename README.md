# EscolaFlow (Ocorrências VC)

Plataforma mobile para gestão de ocorrências escolares com formalização assistida por IA, trilha de tratativas e comunicação com responsáveis.

## Visão de produto
O EscolaFlow transforma um processo escolar crítico, normalmente manual e inconsistente, em um fluxo digital auditável:
- registro rápido por professor,
- texto formal padronizado para uso institucional,
- tratativa por tutor/vice-direção,
- histórico completo com exportação de relatório.

Resultado esperado:
- redução do tempo de registro,
- maior qualidade documental,
- melhor governança pedagógica e administrativa.

## Principais diferenciais
- Formalização de relatos com IA via OpenRouter (multi-model racing)
- Degradação graciosa quando IA está indisponível (não bloqueia operação)
- Controle de acesso por papel com RLS no Supabase
- Fluxo de tratativa em múltiplas etapas (Tutor -> Vice-Direção)
- Reclassificação de categoria durante tratativa (incluindo substituição de OUTRO)
- Exportação de relatório em PDF pronto para arquivo institucional
- Importação CSV para operações administrativas

## Stack técnica
- React Native 0.81 + Expo 54 + Expo Router
- TypeScript
- TanStack Query v5
- Supabase (PostgreSQL, Auth, Edge Functions)
- OpenRouter (formalização de texto)
- Evolution API (WhatsApp)
- EAS Build (APK/AAB)

## Arquitetura resumida
- Frontend: app/ e src/
- Backend serverless: supabase/functions/
- Banco e políticas: supabase/migrations/
- Scripts operacionais: scripts/

Fluxo principal:
1. Professor registra relato (voz ou texto)
2. IA formaliza conteúdo
3. Professor revisa e confirma
4. Tutor trata ou escala
5. Vice-direção conclui e comunica

## Segurança (resumo)
- Cliente usa anon key e depende de RLS
- Operações privilegiadas passam por Edge Functions autenticadas
- Verificação de papel em endpoints administrativos
- Validação de payload e normalização de campos sensíveis
- Segredos mantidos no ambiente server-side

Para detalhes completos: docs/SECURITY.md

## Documentação completa
- Arquitetura: docs/ARCHITECTURE.md
- Segurança: docs/SECURITY.md
- Operação e deploy: docs/OPERATIONS.md

## Começando rápido
## 1) Instalação
- npm install

## 2) Variáveis de ambiente (cliente)
Crie/edite .env com:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

## 3) Executar app
- npm start
- npm run android
- npm run ios
- npm run web

## 4) Smoke test
Antes de release, rode:
- npm run smoke:all

Defina também:
- SMOKE_ADMIN_EMAIL
- SMOKE_ADMIN_PASSWORD
- SMOKE_PROF_EMAIL
- SMOKE_PROF_PASSWORD

## Backend (Supabase)
## Aplicar migrations
- supabase db push --project-ref <project_ref>

## Deploy de funções
- supabase functions deploy process-text --project-ref <project_ref>
- supabase functions deploy send-whatsapp --project-ref <project_ref>
- supabase functions deploy send-whatsapp-manual --project-ref <project_ref>
- supabase functions deploy import-csv --project-ref <project_ref>
- supabase functions deploy delete-occurrence --project-ref <project_ref>
- supabase functions deploy admin-create-user --project-ref <project_ref>
- supabase functions deploy admin-update-user --project-ref <project_ref>
- supabase functions deploy admin-delete-user --project-ref <project_ref>
- supabase functions deploy categorize-occurrence --project-ref <project_ref>

## Build Android
Perfis em eas.json:
- preview: APK interno
- production: AAB para distribuição oficial

Comandos:
- eas build --platform android --profile preview
- eas build --platform android --profile production

## Estrutura do repositório
- app/ : rotas e telas
- src/components/ : UI e blocos funcionais
- src/hooks/ : casos de uso e integração com dados
- src/lib/ : infraestrutura cliente (theme, supabase, query client)
- src/services/ : integrações externas
- src/utils/ : utilitários (ex.: PDF)
- supabase/functions/ : backend serverless
- supabase/migrations/ : evolução do schema
- scripts/ : automações de suporte

## Qualidade e governança
- TypeScript em toda a base
- Migrations versionadas
- Smoke suite para regressão funcional e RBAC
- Commits semânticos recomendados (feat/fix/docs/chore)

## Roadmap sugerido
- CI com pipeline de validação automática
- Hardening adicional de funções e políticas
- Métricas e alertas para IA/WhatsApp
- Painel de telemetria operacional

## Licença
Projeto privado. Todos os direitos reservados.
