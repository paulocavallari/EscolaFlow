# EscolaFlow — Workspace Instructions

Plataforma mobile de gestão de ocorrências escolares com transcrição de áudio por IA.
**React Native + Expo Router · Supabase · Gemini AI · TypeScript · Evolution API (WhatsApp)**

---

## Quick Start

```bash
npm install
npm start          # Expo Dev Server (scan QR with Expo Go)
npm run web        # Browser (http://localhost:8081)
npm run android    # Android emulator
npm run ios        # iOS simulator
```

Create the first admin user (requires `.env` filled):

```bash
npx ts-node scripts/create_admin.ts
```

Deploy an Edge Function:

```bash
supabase functions deploy process-audio --project-ref <ref>
# or
bash scripts/deploy-process-audio.sh
```

Push DB migrations:

```bash
supabase db push --project-ref <ref>
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | Supabase project URL (bundled in client) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` | Supabase anon JWT (bundled in client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets | **Never expose to client** |
| `GEMINI_API_KEY` | Supabase Edge Function secrets | Google Gemini |
| `EVOLUTION_API_URL` | Supabase Edge Function secrets | WhatsApp server URL |
| `EVOLUTION_API_KEY` | Supabase Edge Function secrets | WhatsApp API key |
| `EVOLUTION_INSTANCE_NAME` | Supabase Edge Function secrets | Default: `zap` |

> **Important:** `EXPO_PUBLIC_*` variables are statically bundled into the client JS by Expo Metro. They are visible to anyone who downloads the app. Use them only for non-secret values (URL, anon key). The anon key is designed to be public — all access control is enforced by RLS.

---

## Architecture

### File Structure

```
app/
  _layout.tsx              # Root layout — wraps AuthProvider + QueryClientProvider
  (auth)/
    login.tsx              # Login screen
    change-password.tsx    # Forced on first login (force_password_change flag)
  (app)/
    _layout.tsx            # Tab navigator with role-based tab visibility
    index.tsx              # Dashboard (occurrence stats)
    occurrences/           # List, detail, create
    admin/                 # users.tsx, classes.tsx — admin only
src/
  types/database.ts        # All TS types + enums (UserRole, OccurrenceStatus, ActionType)
  lib/
    supabase.ts            # Supabase client (anon key only for client)
    constants.ts           # STATUS_LABELS, ROLE_LABELS, COLOR mappings
    queryClient.ts         # TanStack Query client config
  hooks/
    useAuth.ts             # AuthContext + useAuthProvider (single source of truth)
    useProfile.ts          # Current user's profile + role helpers
    useOccurrences.ts      # CRUD hooks via TanStack Query
    useStudents.ts         # Students + profiles CRUD hooks
  components/
    AudioRecorder.tsx      # Speech recognition → base64 audio → process-audio Edge Function
    AIReviewModal.tsx      # Shows original + formal text for review before saving
    OccurrenceCard.tsx     # Card for list view
    RoleGuard.tsx          # Renders children only for allowed roles
supabase/
  functions/               # Deno Edge Functions (TypeScript)
    process-audio/         # Audio → Gemini → {original, formal} JSON
    send-whatsapp/         # DB webhook handler → Evolution API
    send-whatsapp-manual/  # HTTP proxy for direct WhatsApp sends from client
    admin-create-user/     # Creates Supabase Auth user (called from admin UI)
    import-csv/            # Bulk student import, verifies admin role
    delete-occurrence/     # Deletes with service_role, verifies admin/VP role
  migrations/              # Numbered SQL migrations — apply in order
```

### Routing (Expo Router file-based)

- `(auth)` group: unauthenticated screens (no tab bar)
- `(app)` group: authenticated screens — redirects to login if no session
- `force_password_change` profile flag → redirects to `/change-password`
- Role-gated tabs: admin tabs hidden unless `profile.role === 'admin'`

### Data Layer

- **TanStack Query v5** for all server state; cache keys defined in `OCCURRENCE_KEYS` / query-key objects per hook
- Supabase JS client (`src/lib/supabase.ts`) initialized with anon key + AsyncStorage session persistence
- **Never** create a service-role Supabase client in client-side code; use Edge Functions instead
- All data access is filtered by **Supabase RLS policies** — the anon client automatically enforces them

### State Machine (Occurrence Status)

```
PENDING_TUTOR → ESCALATED_VP → CONCLUDED
      └─────────────────────→ CONCLUDED
```

| Role | Allowed transitions |
|---|---|
| Tutor (professor) | PENDING_TUTOR → ESCALATED_VP or CONCLUDED |
| Vice-Director | ESCALATED_VP → CONCLUDED |
| Admin | Any |

---

## Database Schema (Key Tables)

| Table | Key Columns |
|---|---|
| `profiles` | `id`, `auth_id` (FK → `auth.users`), `role`, `force_password_change`, `whatsapp_number` |
| `classes` | `id`, `name`, `year` |
| `students` | `id`, `name`, `matricula`, `class_id`, `tutor_id` (FK → profiles), `guardian_phone` |
| `occurrences` | `id`, `student_id`, `author_id`, `tutor_id`, `status`, `description_original`, `description_formal` |
| `actions` | `id`, `occurrence_id`, `author_id`, `action_type`, `description` |

- `profiles.id` ≠ `profiles.auth_id`. Always join on `profiles.auth_id = auth.uid()` in RLS policies.
- `students.tutor_id` points to `profiles.id` (not `auth_id`).
- Migrations live in `supabase/migrations/` — never edit existing migrations, always add new ones.

---

## Edge Functions (Deno)

All functions are in `supabase/functions/<name>/index.ts`. They use Deno + `std@0.177.0`.

**Auth pattern for protected functions:**

```ts
const authHeader = req.headers.get('Authorization');
const supabaseUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
const { data: { user } } = await supabaseUser.auth.getUser(); // validates JWT
// Then use supabaseAdmin (service_role) only for DB queries after auth is confirmed
```

**Functions without caller auth (called by DB webhook/internal):**
- `send-whatsapp` — triggered by Supabase DB webhook, not by client directly

**Functions that must check caller auth:**
- `process-audio`, `import-csv`, `delete-occurrence` ✅ checked
- `admin-create-user` ⚠️ currently has **no auth/role check** — treat with caution
- `send-whatsapp-manual` ⚠️ currently has **no auth check** — anyone can call it

---

## Coding Conventions

- **Language:** TypeScript throughout. Enums live in `src/types/database.ts` — import from there, never redefine.
- **UI labels:** All user-facing strings are in **Brazilian Portuguese**. Labels map through `STATUS_LABELS` / `ROLE_LABELS` constants.
- **Styling:** StyleSheet.create at bottom of each component file. Color tokens from `COLORS` in `src/lib/constants.ts`.
- **Hooks pattern:** Data-fetching hooks use TanStack Query (`useQuery` / `useMutation`). Invalidate related query keys after mutations.
- **Role checks in UI:** Use `RoleGuard` component or `isAdmin` / `isViceDirector` from `useAuth()`.
- **No direct service-role usage in client:** Admin operations in `app/(app)/admin/users.tsx` currently use a hardcoded service-role key — any new admin features should use Edge Functions instead.

---

## ⚠️ Known Security Issues (Fix Before Production)

1. **Hardcoded service-role JWT** in `app/(app)/admin/users.tsx` (line 28) and multiple `test_*.js` files — move admin user operations to an authenticated Edge Function.
2. **`admin-create-user` Edge Function** has no authentication check — any unauthenticated request can create users. Add JWT verification + admin role check.
3. **`send-whatsapp-manual` Edge Function** has no authentication — add JWT verification to prevent abuse.
4. **`EXPO_PUBLIC_EVOLUTION_API_KEY` in `.env.production`** — Evolution API key is bundled into the client build. Move to a server-side secret and route through an Edge Function.
5. **CORS `Access-Control-Allow-Origin: *`** on all Edge Functions — restrict to your app's domain in production.
6. **`.env.production` committed to repo** — move to Vercel/CI environment variables and add to `.gitignore`.

---

## Pitfalls & Gotchas

- `EXPO_PUBLIC_*` env vars are inlined at **build time** by Metro — changing them requires a rebuild, not just restart.
- Supabase RLS profiles join uses `profiles.auth_id = auth.uid()`, not `profiles.id`.
- `students.matricula` has a unique constraint — bulk imports will fail on duplicates unless `ON CONFLICT DO NOTHING` is used.
- `force_password_change` flag on profile causes immediate redirect from `(app)/_layout.tsx` — set it to `false` after password change.
- Audio is sent as base64 inline data to Gemini (no storage bucket needed), but large recordings may hit Edge Function memory limits.
- WhatsApp phone numbers must include Brazil country code (`55`) — `sendEvolutionMessage` adds `55` prefix automatically if missing.
