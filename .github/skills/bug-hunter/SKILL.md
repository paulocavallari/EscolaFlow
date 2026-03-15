---
name: bug-hunter
description: Systematically discovers and fixes bugs in the codebase. Use when the user reports unexpected behavior, a broken feature, a runtime error, test failure, or asks to "find and fix" something that isn't working. Covers reproduction, root-cause analysis, targeted fix, and regression-prevention.
---

# Bug Hunter

Systematic discovery and fix of bugs — from vague symptom to committed patch.

## When to Use

- "this feature is broken"
- "I'm getting an error / crash"
- "find and fix this bug"
- "why isn't X working?"
- "the tests are failing"
- "unexpected behavior in..."
- "something changed and now Y is wrong"

## Workflow

### Phase 1 — Understand the Symptom

1. Identify what the user described:
   - Exact error message or stack trace (if any)
   - What action triggers it
   - Expected vs. actual behavior
   - Affected environment (web / iOS / Android / Edge Function)
2. Locate entry-point files related to the symptom using file search and grep.
3. Ask for clarification **only if** the symptom is completely ambiguous — otherwise proceed with best-guess investigation.

### Phase 2 — Reproduce & Isolate

1. Trace the execution path from the user action to the failure:
   - UI component → hook → Supabase query / Edge Function → DB / external API
2. Identify the **smallest possible scope** where the bug lives.
3. Look for recent changes (new migrations, hook edits, new components) that could have introduced a regression.
4. Check for related known issues documented in `copilot-instructions.md` (⚠️ Known Security Issues / Pitfalls sections).

### Phase 3 — Root Cause Analysis

Systematically check each layer:

| Layer | What to check |
|---|---|
| **UI / Component** | Wrong state, missing `useEffect` deps, stale closure, incorrect prop |
| **Hook / Query** | Wrong query key, missing invalidation after mutation, stale cache, `enabled` condition |
| **Supabase client** | RLS policy blocks the query, wrong column/table name, missing join |
| **Edge Function** | Auth not verified, wrong env var name, JSON parse error, missing `await` |
| **Database / Migration** | Column doesn't exist yet, wrong FK reference, trigger misfiring |
| **Env / Config** | `EXPO_PUBLIC_*` not rebuilt after change, secret not set in Edge Function |
| **Third-party API** | Evolution API / Gemini format change, credential expired |

### Phase 4 — Fix

1. Make the **minimal targeted fix** — do not refactor surrounding code.
2. Prefer editing existing files over creating new ones.
3. Follow project conventions:
   - TypeScript; enums from `src/types/database.ts`
   - UI strings in Brazilian Portuguese
   - Style via `StyleSheet.create` + `COLORS` tokens
   - New DB changes as a new migration file (never edit existing ones)
   - Admin/privileged ops via Edge Functions, not in client code
4. If the fix touches RLS policies, verify both `USING` and `WITH CHECK` clauses.
5. If the fix touches an Edge Function, ensure the auth pattern is preserved:
   ```ts
   const { data: { user }, error } = await supabaseUser.auth.getUser();
   if (error || !user) return 401;
   ```

### Phase 5 — Verify & Prevent Regression

1. Check for compile/lint errors after the fix.
2. Identify any other locations in the codebase that have the same bug pattern (grep for similar code).
3. If a test file exists for the area, review it and note whether it would have caught this bug.
4. Add a brief code comment at the fix site if the root cause is non-obvious.

## Decision Tree

```
Is there an error message?
  ├─ YES → Search for the exact message in codebase + Edge Function logs
  └─ NO  → Trace execution path manually from UI → hook → DB

Does the bug affect data retrieval?
  ├─ YES → Check RLS policy + query key + supabase select statement
  └─ NO  → Check component state, mutation, or Edge Function logic

Is it environment-specific (only web / only mobile)?
  ├─ YES → Check Platform.OS branches and Expo-specific APIs
  └─ NO  → Likely logic bug, not platform issue

Did the bug appear after a recent change?
  ├─ YES → Focus diff on changed files; check for missing migration or invalidation
  └─ NO  → Deep-dive the relevant layer
```

## Output Format

```
## Bug Report

**Symptom:** [what the user observed]
**Root Cause:** [exact file:line and explanation]
**Fix Applied:** [summary of change]
**Files Changed:**
- [path/file.ts](path/file.ts#Lnn) — [what was changed]

**Regression Risk:** [None / Low / Medium — and why]
**Prevention:** [pattern to avoid in future, or suggested test]
```

## Tools Used

- **Grep**: Exact error string search, pattern matching across files
- **Read**: Detailed file inspection (read enough context — at least ±10 lines around suspects)
- **Glob / FileSearch**: Locate migration files, hook files, function files
- **Get Errors**: TypeScript / lint errors after applying fix
- **Terminal**: Run build check or existing test scripts if available
- **Explore agent**: For unfamiliar areas — launch with `thorough` mode

## EscolaFlow-Specific Checklist

Before closing any bug fix in this project, verify:

- [ ] `profiles.auth_id = auth.uid()` used in RLS (not `profiles.id`)
- [ ] No new `service_role` key introduced in client-side code
- [ ] `force_password_change` flag handled in auth flow if profiles are modified
- [ ] `students.matricula` uniqueness respected in any bulk operation
- [ ] WhatsApp numbers are stripped/formatted before sending (Evolution API)
- [ ] `EXPO_PUBLIC_*` env var changes require a full Metro rebuild
- [ ] New migrations added as new files — existing migrations never edited
- [ ] Query cache invalidated after any mutation (`queryClient.invalidateQueries`)

## Integration

- **code-auditor**: Run after fixing to confirm no new issues introduced
- **init**: Consult `copilot-instructions.md` for project-specific pitfalls
