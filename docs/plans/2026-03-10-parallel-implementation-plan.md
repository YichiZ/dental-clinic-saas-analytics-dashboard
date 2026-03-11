# Implementation Plan: Dental Clinic SaaS Analytics Dashboard

## Context

The project directory is empty (only `CLAUDE.md` and `docs/plans/` exist). We need to build the full-stack dental analytics dashboard from scratch. The goal is to implement all 13 tasks from the plan as efficiently as possible, with maximum parallelism while respecting hard dependency ordering.

The key insight is that the 13 tasks reduce to **7 waves** of work. Only 2 waves have genuine parallelism, but those save ~35 minutes of wall-clock time.

---

## Dependency Graph

```
T1 (scaffold)
├── T2 (schema) → T3 (seed)
└── T4 (auth)
         └── T5 (layout)
                    └── T6 (API routes)
                               └── T7 (overview + shared components)
                                          ├── T8 (financial)
                                          ├── T9 (operations)
                                          ├── T10 (patients)
                                          ├── T11 (settings)
                                          └── T12 (vitest tests)
                                                     └── T13 (e2e tests)
```

**Key constraints:**
- T5 must follow T4 (both touch `src/app/layout.tsx`; sidebar imports `signOut` from auth)
- T6 must follow T2 (needs Prisma schema) and T4 (needs auth session check)
- T7 must precede T8–T11 (creates `period-selector.tsx` and `kpi-card.tsx` shared by all pages)
- T6 (`metrics.ts`) must be written by one agent — it's a shared lib that all 4 routes import

---

## Wave-by-Wave Execution Plan

### Wave 1 — Foundation (1 agent, sequential)

**Agent A: Task 1 — Scaffold**
- `npx create-next-app@latest .` with TypeScript, Tailwind, App Router, `src/` dir, `@/*` alias, no-git
- Install deps: `prisma @prisma/client next-auth recharts lucide-react clsx tailwind-merge class-variance-authority`
- Install shadcn: `npx shadcn@latest init` (Default style, Slate color, CSS variables)
- Add shadcn components: `card table badge button input label select tabs dropdown-menu avatar separator skeleton`
- Install dev deps: `vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test`
- Create `.env.local` with `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Commit: `chore: scaffold Next.js 14 project with all dependencies`

---

### Wave 2 — Database + Auth (2 agents in parallel, zero file conflicts)

**Agent A: Task 2 → Task 3 (sequential within this agent)**

Files owned exclusively: `prisma/`, `package.json` (seed script only)

Task 2:
- `npx prisma init --datasource-provider postgresql`
- Write full `prisma/schema.prisma` (all 8 models from design doc)
- `npx prisma migrate dev --name init`
- Commit: `feat: add Prisma schema with all dental clinic models`

Task 3 (immediately after Task 2):
- Install: `@faker-js/faker bcryptjs @types/bcryptjs ts-node`
- Write `prisma/seed.ts` — 200 patients, ~800 appointments, invoices, payments, seeded `AdminUser` with `admin@brightsmile.com / admin123`
- Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `package.json`
- `npx prisma db seed`
- Commit: `feat: add realistic seed data with 200 patients and 12 months of appointments`

**Agent B: Task 4 — Auth** (parallel with Agent A)

Files owned exclusively: `src/lib/auth.ts`, `src/lib/prisma.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/login/page.tsx`, `src/middleware.ts`

- Create `src/lib/prisma.ts` — PrismaClient singleton
- Create `src/lib/auth.ts` — NextAuth Credentials provider + bcrypt verification
- Create `src/app/api/auth/[...nextauth]/route.ts`
- Create `src/middleware.ts` — auth guard redirecting to `/login`
- Create `src/app/login/page.tsx` — client component form
- Commit: `feat: add NextAuth.js credentials auth with login page and route protection`

---

### Wave 3 — Dashboard Shell (1 agent)

**Agent A: Task 5 — Layout + Sidebar**

Files: `src/app/layout.tsx` (modified), `src/app/(dashboard)/layout.tsx`, `src/components/sidebar.tsx`
Also create empty stub pages: `src/app/(dashboard)/{financial,operations,patients,settings}/page.tsx` (prevents 404s)

- Add `SessionProvider` wrapper to `src/app/layout.tsx`
- Create `src/components/sidebar.tsx` — dark sidebar with nav links + signOut
- Create `src/app/(dashboard)/layout.tsx` — flex layout with Sidebar + `{children}`
- Commit: `feat: add dashboard layout with dark sidebar navigation`

---

### Wave 4 — API Layer (1 agent)

**Agent A: Task 6 — Metric API Routes**

Files: `src/lib/metrics.ts`, 4× `src/app/api/metrics/*/route.ts`

- Write `src/lib/metrics.ts` with: `Period` type, `periodStart()`, `getRevenue()`, `getAppointmentStats()`, `getPatientStats()`, `getOutstandingBalance()`
- Write all 4 route handlers (overview, financial, operations, patients) — each validates `auth()` session, reads `?period=7d|30d|90d`, calls metrics helpers
- Commit: `feat: add metric API routes for all four dashboard sections`

---

### Wave 5 — Shared UI Components (1 agent)

**Agent A: Task 7 — Overview Page + Shared Components**

Must run before Wave 6 because T8–T11 all import `kpi-card.tsx` and `period-selector.tsx`.

Files: `src/components/kpi-card.tsx`, `src/components/period-selector.tsx`, `src/app/(dashboard)/page.tsx`

- Create `src/components/kpi-card.tsx` — reusable card with title, value, icon, trend badge
- Create `src/components/period-selector.tsx` — 7d/30d/90d toggle using `useSearchParams` + `router.push`
- Create `src/app/(dashboard)/page.tsx` — overview: 4 KPI cards in responsive grid, fetches `/api/metrics/overview`
- Commit: `feat: add overview dashboard with KPI cards and period selector`

---

### Wave 6 — Feature Pages (3 agents in parallel, zero file conflicts)

Each agent owns a completely disjoint set of files.

**Agent A: Task 8 — Financial Page**

Files owned: `src/app/(dashboard)/financial/page.tsx`, `src/components/charts/revenue-chart.tsx`, `src/components/charts/payment-method-chart.tsx`

- `revenue-chart.tsx` — Recharts BarChart (weekly bars, 30/90d selector)
- `payment-method-chart.tsx` — PieChart (Cash, Card, Insurance, Check)
- `financial/page.tsx` — server component: revenue chart + payment method chart + outstanding invoices table (sortable by status: Pending, Partial, Overdue)
- Commit: `feat: add financial page with revenue chart, payment breakdown, and invoice table`

**Agent B: Task 9 — Operations Page**

Files owned: `src/app/(dashboard)/operations/page.tsx`, `src/components/charts/appointment-volume-chart.tsx`, `src/components/charts/utilization-chart.tsx`, `src/components/charts/busiest-hours-chart.tsx`

- `appointment-volume-chart.tsx` — LineChart (total vs no-show trend)
- `utilization-chart.tsx` — BarChart (chair utilization % by day of week)
- `busiest-hours-chart.tsx` — BarChart (hourly appointment distribution)
- `operations/page.tsx` — server component: all 3 charts from `/api/metrics/operations`
- Commit: `feat: add operations page with appointment volume, utilization, and busiest hours`

**Agent C: Task 10 + Task 11 — Patients + Settings**

Files owned: `src/app/(dashboard)/patients/page.tsx`, `src/components/charts/patient-acquisition-chart.tsx`, `src/components/charts/retention-chart.tsx`, `src/app/(dashboard)/settings/page.tsx`, `src/app/api/settings/route.ts`

Task 10:
- `patient-acquisition-chart.tsx` — BarChart (referral, walk-in, online, etc.)
- `retention-chart.tsx` — donut chart (new vs returning)
- `patients/page.tsx` — server component: acquisition chart + retention + recent new patients table
- Commit: `feat: add patients page with acquisition source and retention charts`

Task 11:
- `src/app/api/settings/route.ts` — GET/PATCH clinic info, GET/POST/DELETE staff
- `settings/page.tsx` — client component: clinic info form + staff list with add/remove
- Commit: `feat: add settings page with clinic info editor and staff management`

---

### Wave 7 — Tests (2 agents in parallel)

**Agent A: Task 12 — Vitest Unit Tests**

Files: `vitest.config.ts`, `src/test/setup.ts`, `src/lib/__tests__/metrics.test.ts`, `src/components/__tests__/kpi-card.test.tsx`, `src/components/__tests__/period-selector.test.tsx`

- Configure vitest with jsdom environment + testing-library setup
- Mock PrismaClient for metrics helper tests
- Test `periodStart()` for all 3 period values
- Test `kpi-card.tsx` renders title, value, trend
- Test `period-selector.tsx` renders 3 buttons, active state
- Run `npm test` — verify pass + coverage ≥ 80%
- Commit: `test: add Vitest unit tests for metrics helpers and shared components`

**Agent B: Task 13 — Playwright E2E Tests** (parallel with Agent A)

Files: `playwright.config.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/overview.spec.ts`, `tests/e2e/financial.spec.ts`, `tests/e2e/operations.spec.ts`, `tests/e2e/patients.spec.ts`, `tests/e2e/settings.spec.ts`

- Configure playwright with `baseURL: http://localhost:3000`, webServer pointing to `npm run dev`
- Write test specs for: login flow, each dashboard page renders KPIs/charts, period selector changes data, settings page saves
- Run `npx playwright test` after dev server confirmed healthy
- Commit: `test: add Playwright E2E tests for all dashboard pages and auth flows`

---

## Timeline Summary

| Wave | Tasks | Agents | Est. Time |
|------|-------|--------|-----------|
| 1 | T1 | 1 | ~8 min |
| 2 | T2+T3, T4 | 2 parallel | ~10 min |
| 3 | T5 | 1 | ~5 min |
| 4 | T6 | 1 | ~5 min |
| 5 | T7 | 1 | ~5 min |
| 6 | T8, T9, T10+T11 | 3 parallel | ~8 min |
| 7 | T12, T13 | 2 parallel | ~8 min |
| **Total** | | | **~49 min** |

Sequential equivalent: ~85 min. **Parallel savings: ~36 min (42% faster).**

---

## Critical Files

| File | Purpose |
|------|---------|
| `docs/plans/2026-03-10-dental-clinic-dashboard.md` | Full task specs — primary reference for all agents |
| `docs/plans/2026-03-10-dental-clinic-dashboard-design.md` | Data model + UI layout specs |
| `CLAUDE.md` | Project conventions (immutability, Server/Client component rules) |
| `~/.claude/rules/common/coding-style.md` | Immutability + file size constraints |
| `~/.claude/rules/common/testing.md` | 80% coverage requirement |

---

## Verification

After all waves complete:

1. `npm run dev` → app loads at `http://localhost:3000`
2. Redirect to `/login` → log in with `admin@brightsmile.com / admin123`
3. Overview page shows 4 KPI cards with real data and period selector works
4. Financial, Operations, Patients pages each show relevant charts
5. Settings page shows clinic info and staff list
6. `npm test` → all Vitest tests pass, coverage ≥ 80%
7. `npx playwright test` → all E2E tests pass
8. `npx prisma studio` → verify seeded data is present
