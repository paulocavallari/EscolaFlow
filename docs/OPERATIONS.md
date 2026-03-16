# Operação, Deploy e Suporte

## 1. Pré-requisitos
- Node.js 20+
- npm 10+
- Expo CLI (via npx expo)
- Supabase CLI
- EAS CLI (build Android/iOS)

## 2. Setup local
1. Instalar dependências:
   - npm install
2. Configurar .env com:
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY
3. Executar app:
   - npm start
   - npm run android
   - npm run ios
   - npm run web

## 3. Setup backend (Supabase)
1. Login no Supabase CLI
2. Aplicar schema:
   - supabase db push --project-ref <project_ref>
3. Publicar funções necessárias:
   - supabase functions deploy process-text --project-ref <project_ref>
   - supabase functions deploy send-whatsapp --project-ref <project_ref>
   - supabase functions deploy send-whatsapp-manual --project-ref <project_ref>
   - supabase functions deploy import-csv --project-ref <project_ref>
   - supabase functions deploy delete-occurrence --project-ref <project_ref>
   - supabase functions deploy admin-create-user --project-ref <project_ref>
   - supabase functions deploy admin-update-user --project-ref <project_ref>
   - supabase functions deploy admin-delete-user --project-ref <project_ref>
   - supabase functions deploy categorize-occurrence --project-ref <project_ref>

## 4. Build e distribuição
### 4.1 Android APK (interna)
- eas build --platform android --profile preview

### 4.2 Android AAB (produção)
- eas build --platform android --profile production

### 4.3 Configuração EAS
- perfis em eas.json
- projectId em app.json > expo.extra.eas.projectId

## 5. Smoke tests
Script principal:
- npm run smoke:all

Cobertura do smoke:
- TypeScript compile
- web export
- login admin/professor
- chamadas autenticadas de funções
- validação RBAC para endpoints administrativos
- fluxo admin create/update/delete usuário
- import-csv e delete-occurrence

Variáveis exigidas:
- SMOKE_ADMIN_EMAIL
- SMOKE_ADMIN_PASSWORD
- SMOKE_PROF_EMAIL
- SMOKE_PROF_PASSWORD

## 6. Observabilidade
### 6.1 Fontes de diagnóstico
- logs das Edge Functions no dashboard do Supabase
- status de builds no dashboard da Expo
- console logs em ambiente de desenvolvimento

### 6.2 Sinais a monitorar
- aumento de 401/403 nas funções
- erro de rate-limit em provedores de IA
- latência elevada do process-text
- falhas de envio WhatsApp

## 7. Runbooks operacionais
### 7.1 IA indisponível
- verificar OPENROUTER_API_KEY
- checar quotas/rate-limit de modelos free
- confirmar fallback ativo para texto original

### 7.2 Falha em função administrativa
- validar JWT e role do usuário
- revisar logs da função
- confirmar policies/permissões no banco

### 7.3 Falha em exportação PDF
- validar permissões de compartilhamento no dispositivo
- testar em web com print dialog

## 8. Versionamento e governança
- commits semânticos recomendados (feat/fix/chore/docs)
- migrations imutáveis (sempre criar novo arquivo)
- release notes por versão com mudanças funcionais e de segurança

## 9. Backlog operacional recomendado
- pipeline CI com lint/test/smoke automatizado
- script único para deploy de todas as funções
- política de backup e retenção explícita
- painel de métricas de Edge Functions
