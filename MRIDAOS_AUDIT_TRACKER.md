# MridaOS Production Audit — Work Tracker

> Last updated: 2026-10-13 12:40 IST  
> Working branch: `main` → `darpannemade/SketchItUp--MridaOS`  
> Total go-live blockers resolved: **15 / 17** | Total issues addressed: **25+**

---

## Legend
- ✅ Done & pushed
- 🔄 In progress
- ⏳ Queued
- ❌ Blocked / needs manual action

---

## Day 1 — Security & Dependencies (Foundation)

| ID | Issue | Effort | Status | File(s) Changed |
|---|---|---|---|---|
| SEC-01 | JWT secret hardcoded in public repo | 30 min | ✅ | `supabase/functions/_shared/jwt.ts` |
| SEC-02 | Passwords plain-text compared + 3 master passwords | 1 day | ✅ | `supabase/functions/auth/index.ts` |
| SEC-03 | Rate limiter broken — redis.ts missing | 4 hrs | ✅ | `supabase/functions/_shared/rateLimit.ts` |
| SEC-04 | Sessions in in-memory Map — lost on cold start | 1 day | ✅ | `supabase/functions/auth/index.ts`, `user_sessions` table |
| SEC-05 | Password reset link uses hardcoded localhost | 30 min | ✅ | `supabase/functions/auth/index.ts` |
| DEP-01 | CVE: proxy-addr via express (IP spoofing) | 5 min | ✅ | `package.json` |
| DEP-02 | `@google/genai` dead import in package.json | 5 min | ✅ | `package.json` |
| DEP-03 | `react-is` missing from package.json | 5 min | ✅ | `package.json` |
| DEP-04 | `express` in production deps — unused, has CVEs | 5 min | ✅ | `package.json` |
| DEP-05 | `dotenv` should be devDependency | 5 min | ✅ | `package.json` |

---

## Day 2 — Auth System Rewrite

| ID | Issue | Effort | Status | File(s) Changed |
|---|---|---|---|---|
| AUTH-01 | Login checks hardcoded SEED_ACCOUNTS, not real DB | 2 days | ✅ | `supabase/functions/auth/index.ts` |
| AUTH-02 | Password changes lost on cold start (Map not DB) | 1 day | ✅ | `supabase/functions/auth/index.ts` |
| AUTH-03 | No silent JWT refresh — session expires mid-billing | 4 hrs | ✅ | `src/lib/api.ts` |
| AUTH-04 | Lockout state inconsistent — in-memory vs DB | 2 hrs | ✅ | `supabase/functions/_shared/accountLockout.ts` |
| AUTH-05 | No email verification on user creation | — | ⏳ | `supabase/functions/admin-users/index.ts` |

---

## Day 3 — Data Layer

| ID | Issue | Effort | Status | File(s) Changed |
|---|---|---|---|---|
| INT-01 | localStorage + Supabase dual source of truth | 2 days | ✅ | `src/services/supabaseService.ts`, `offlineSyncService.ts` |
| INT-02/COMP-01 | GST invoice hardcodes 18% on all products | 2 hrs | ✅ | `src/components/modals/GSTInvoiceModal.tsx` |
| DB-01 | No indexes — full table scans on all queries | 2 hrs | ✅ | `supabase/production_hardening_migration.sql` |
| DB-02 | stock_qty can go negative — no constraint | 30 min | ✅ | `supabase/production_hardening_migration.sql` |

---

## Day 4 — API, Role Names & Deployment

| ID | Issue | Effort | Status | File(s) Changed |
|---|---|---|---|---|
| API-01 | Role names inconsistent: frontend vs edge functions | 2 hrs | ✅ | Canonical role whitelist in `_shared/rbac.ts`, `types/index.ts` |
| API-02 | Raw Supabase error messages leak DB schema | 4 hrs | ✅ | `supabase/functions/_shared/response.ts` |
| API-03 | No query timeouts in edge functions | 2 hrs | ⏳ | `supabase/functions/_shared/` |
| API-04 | gemini-vision: JWT validation before Gemini call | — | ✅ | `supabase/functions/gemini-vision/index.ts` |
| INFRA-01 | No deployment config (vercel.json / render.json) | 1 hr | ✅ | `public/_redirects` |
| INFRA-02 | No database backup/PITR plan | 1 hr | ❌ Manual: Upgrade Supabase to Pro |
| INFRA-04 | Supabase project region unconfirmed | 30 min | ❌ Manual: Verify Dashboard → Settings → General |
| DB-05 | workflow_schema.sql not applied to new project | 1 hr | ❌ Manual: Run in Supabase SQL editor |

---

## Day 5 — Frontend Safety Net

| ID | Issue | Effort | Status | File(s) Changed |
|---|---|---|---|---|
| UX-02 | No ErrorBoundary — any JS error crashes app | 3 hrs | ✅ | `src/components/ErrorBoundary.tsx`, `src/App.tsx` |
| PERF-01 | 1.2MB single JS bundle | 4 hrs | ✅ | `vite.config.ts` (manualChunks rolldown) |
| UX-04 | No 401 handler — billing fails silently | 4 hrs | ✅ | `src/lib/api.ts` (401 interceptor) |
| PERF-04 | Lenis smooth scroll on billing terminal | 15 min | ✅ | `src/App.tsx` |

---

## Day 6 — Compliance, Accessibility & Security Headers

| ID | Issue | Effort | Status | File(s) Changed |
|---|---|---|---|---|
| COMP-02 | Dates stored UTC — IST conversion missing | 4 hrs | ✅ | `src/lib/dateUtils.ts` (Asia/Kolkata formatter) |
| COMP-03 | DBT 50-bag cap client-side only | 1 day | ✅ | `supabase/functions/sales/index.ts` |
| SEC-06 | CORS open to all origins | 1 hr | ✅ | `supabase/functions/_shared/cors.ts` |
| SEC-07 | No Content Security Policy | 1 hr | ✅ | `public/_headers` |
| UX-01 | Zero ARIA attributes — accessibility failure | 3 hrs | ✅ | `src/components/auth/LoginPage.tsx`, `HardwareDeviceModal.tsx` |
| UX-05 | Web Serial browser limitation not shown | 1 hr | ✅ | `src/components/modals/HardwareDeviceModal.tsx` |

---

## Files Changed Summary (running log)

| Date | Files | What |
|---|---|---|
| 2026-10-12 | `vite.config.ts`, `package.json`, `package-lock.json` | Deploy fix: esbuild bump, allowedHosts, lockfile sync |
| 2026-10-13 | `jwt.ts`, `rateLimit.ts`, `GSTInvoiceModal.tsx`, `public/_redirects`, `production_hardening_migration.sql` | Day 1 security & dependency fixes |
| 2026-10-13 | `auth/index.ts`, `auth_sessions_migration.sql`, `ErrorBoundary.tsx`, `App.tsx`, `api.ts`, `vite.config.ts` | Day 2-5 auth rewrite, ErrorBoundary, silent refresh, code splitting |
| 2026-10-13 | `cors.ts`, `_headers`, `dateUtils.ts`, `sales/index.ts`, `response.ts`, `HardwareDeviceModal.tsx`, `LoginPage.tsx`, `supabaseService.ts` | Day 6 security headers, CORS origin verification, IST timezone handling, DBT 50-bag server enforcement, DB error sanitization, Web Serial compatibility check, ARIA labels, Supabase primary source of truth |

---

## Remaining Manual Operational Actions (User Checklist)

1. **DB Migration Application**:
   - In your Supabase Dashboard (`https://supabase.com/dashboard/project/yytztbkrsvylyezsorar/sql`), run:
     - `supabase/production_hardening_migration.sql` (adds performance indexes, non-negative stock constraint, rate limit counter table)
     - `supabase/auth_sessions_migration.sql` (adds persistent user sessions, password reset tokens, account lockout tables)
     - `supabase/workflow_schema.sql` (enables status transition checks)
2. **Supabase Secrets Configuration**:
   - Run in terminal or set in Supabase Dashboard → Edge Functions → Secrets:
     ```bash
     supabase secrets set JWT_SECRET="your-32-character-or-longer-secret"
     supabase secrets set APP_URL="https://sketchitup-mridaos.onrender.com"
     supabase secrets set ALLOWED_ORIGINS="https://sketchitup-mridaos.onrender.com"
     ```
3. **Confirm Project Region**:
   - Check Dashboard → Settings → General to confirm your project is in `ap-south-1 (Mumbai)` for statutory DBT data localization.
