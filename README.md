<h1 align="center">
  <br>
  🏫 EscolaFlow
  <br>
</h1>

<p align="center">
  <strong>Plataforma de gestão de ocorrências escolares com transcrição de áudio por IA</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-2.x-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

---

## ✨ O que é o EscolaFlow?

O **EscolaFlow** é um app mobile (iOS, Android e Web) que digitaliza e agiliza o registro de ocorrências escolares. O professor **grava um áudio** descrevendo o ocorrido, e a IA transcreve e **reescreve o relato de forma formal e profissional** automaticamente — pronto para o registro oficial.

---

## 🚀 Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🎙️ **Gravação de Áudio** | Grave ocorrências via microfone com feedback visual em tempo real |
| 🤖 **Transcrição + Reescrita por IA** | Gemini 2.0 Flash transcreve e reescreve o relato em linguagem formal |
| ✏️ **Revisão Editável** | Professor revisa e edita o texto antes de confirmar |
| 📱 **Notificação WhatsApp** | Responsável recebe notificação no WhatsApp automaticamente |
| 📊 **Painel de Ocorrências** | Histórico completo com filtros por status e aluno |
| 👥 **Controle de Acesso por Papel** | Permissões diferentes para Professor, Vice-Diretor e Admin |
| 📋 **Importação CSV** | Cadastro em massa de turmas e alunos via planilha |
| 🔒 **Segurança RLS** | Row Level Security no PostgreSQL — cada usuário vê só o que pode |

---

## 🔄 Fluxo de uma Ocorrência

```
Professor grava áudio
        │
        ▼
Gemini transcreve + reescreve
        │
        ▼
Professor revisa e confirma
        │
        ▼
Ocorrência salva → WhatsApp enviado ao responsável
        │
        ▼
Orientador/Tutor trata (resolve ou escala)
        │
        ▼
Vice-Direção atua (se escalado)
        │
        ▼
✅ Concluída
```

---

## 🎭 Papéis de Usuário

| Papel | Permissões |
|---|---|
| **Professor** | Registra ocorrências, visualiza as suas próprias |
| **Vice-Diretor** | Visualiza e trata ocorrências escaladas |
| **Admin** | Acesso total — gerencia usuários, turmas e alunos |

---

## 🗂️ Arquitetura

```
EscolaFlow/
├── app/
│   ├── (auth)/          # Tela de login
│   └── (app)/
│       ├── index.tsx        # Dashboard
│       ├── occurrences/     # Lista, detalhes e criação de ocorrências
│       └── admin/           # Gestão de usuários, turmas e alunos
├── src/
│   ├── components/      # AudioRecorder, AIReviewModal, OccurrenceCard...
│   ├── hooks/           # useOccurrences, useStudents, useAuth, useProfile
│   ├── lib/             # Supabase client, constantes, tema de cores
│   ├── services/        # WhatsApp (Evolution API)
│   └── types/           # Tipos TypeScript do banco de dados
└── supabase/
    ├── functions/
    │   ├── process-audio/     # Transcrição + reescrita via Gemini
    │   ├── send-whatsapp/     # Notificação via Evolution API
    │   ├── import-csv/        # Importação de alunos em massa
    │   └── admin-create-user/ # Criação de usuários pelo admin
    └── migrations/
        └── 001_initial_schema.sql
```

---

## 🧠 Como funciona a IA

A Edge Function `process-audio` recebe o arquivo de áudio e realiza **duas chamadas ao Gemini 2.0 Flash**:

1. **Transcrição** — converte o áudio em texto bruto (em português brasileiro)
2. **Reescrita formal** — transforma o relato informal em linguagem adequada para registro escolar oficial

O áudio é enviado como `inline_data` (base64) diretamente para a API multimodal do Gemini — sem custo de storage.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React Native + Expo Router (file-based routing) |
| **Estado/Cache** | TanStack Query v5 |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **IA** | Google Gemini 2.0 Flash |
| **Áudio** | expo-av |
| **WhatsApp** | Evolution API |
| **Linguagem** | TypeScript |

---

## ⚙️ Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/paulocavallari/EscolaFlow.git
cd EscolaFlow
npm install
```

### 2. Configure as variáveis de ambiente

Copie o `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

### 3. Configure os secrets das Edge Functions

No [Dashboard do Supabase](https://supabase.com/dashboard) → **Edge Functions** → **Manage secrets**:

```
GEMINI_API_KEY=sua_chave_gemini
EVOLUTION_API_URL=http://seu-servidor:8080
EVOLUTION_API_KEY=sua_chave_evolution
EVOLUTION_INSTANCE_NAME=nome_da_instancia
```

### 4. Execute a migration do banco

```bash
supabase db push --project-ref seu-project-ref
```

### 5. Faça deploy das Edge Functions

```bash
supabase functions deploy --project-ref seu-project-ref
```

### 6. Rode o app

```bash
npm start          # Expo Go / web
npm run ios        # Simulador iOS
npm run android    # Emulador Android
npm run web        # Navegador
```

---

## 📦 Scripts úteis

| Script | Descrição |
|---|---|
| `npm start` | Inicia o Expo Dev Server |
| `npm run ios` | Abre no simulador iOS |
| `npm run android` | Abre no emulador Android |
| `npm run web` | Abre no navegador |
| `bash scripts/deploy-process-audio.sh` | Faz deploy da função de transcrição |
| `npx ts-node scripts/create_admin.ts` | Cria usuário admin via script |

---

## 🗄️ Schema do Banco de Dados

```
profiles       → Usuários com papel (professor, vice_director, admin)
classes        → Turmas escolares
students       → Alunos vinculados a turma e tutor
occurrences    → Ocorrências com texto original e versão formal
actions        → Tratativas registradas em cada ocorrência
```

Todas as tabelas têm **Row Level Security (RLS)** — cada usuário acessa apenas os dados que seu papel permite.

---

## 📄 Licença

Projeto privado — todos os direitos reservados.
