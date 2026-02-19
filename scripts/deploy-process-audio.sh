#!/bin/bash
# Script para fazer deploy da Edge Function process-audio
# Execute: bash scripts/deploy-process-audio.sh

set -e

PROJECT_REF="pwhjjsxqoogmcairesub"

echo "🔐 Fazendo login no Supabase CLI..."
supabase login

echo ""
echo "🔑 Configurando secret GEMINI_API_KEY..."
supabase secrets set GEMINI_API_KEY=AIzaSyAsMbfjl8IykI_Hz2PPJIvp2sSXey8HzbYy --project-ref "$PROJECT_REF"

echo ""
echo "🚀 Fazendo deploy da Edge Function process-audio..."
supabase functions deploy process-audio --project-ref "$PROJECT_REF"

echo ""
echo "✅ Deploy concluído com sucesso!"
