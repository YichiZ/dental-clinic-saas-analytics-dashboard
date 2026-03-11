# Dental Clinic SaaS Analytics Dashboard

## Project Overview

Full-stack analytics dashboard for dental clinic owners/administrators. Tracks Financial, Operational, and Patient metrics with weekly trends and rolling 30/90-day views.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (email/password, JWT sessions)
- **Testing:** Vitest (unit), Playwright (E2E)

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/         # Protected dashboard route group
│   │   ├── layout.tsx       # Sidebar + main layout
│   │   ├── page.tsx         # Overview (KPI cards)
│   │   ├── financial/       # Revenue, payments, invoices
│   │   ├── operations/      # Appointments, no-shows, utilization
│   │   ├── patients/        # Acquisition, retention
│   │   └── settings/        # Clinic info, staff
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth route handler
│   │   └── metrics/
│   │       ├── overview/    # KPI aggregates
│   │       ├── financial/   # Revenue + invoices
│   │       ├── operations/  # Appointment stats
│   │       └── patients/    # Patient metrics
│   ├── login/               # Auth page (public)
│   └── layout.tsx           # Root layout with SessionProvider
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── charts/              # Recharts wrappers
│   ├── sidebar.tsx          # Dark sidebar nav
│   ├── kpi-card.tsx         # Metric summary card
│   └── period-selector.tsx  # 7d / 30d / 90d toggle
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── prisma.ts            # Prisma singleton
│   └── metrics.ts           # Shared metric helpers
├── middleware.ts             # Auth protection for all routes
└── test/
    └── setup.ts             # Vitest + testing-library setup
prisma/
├── schema.prisma            # Data model
└── seed.ts                  # 200 patients, 12 months of data
docs/
└── plans/                   # Design docs and implementation plans
```

## Key Commands

```bash
npm run dev           # Start dev server (http://localhost:3000)
npm test              # Run unit tests (Vitest)
npx playwright test   # Run E2E tests
npx prisma migrate dev   # Apply schema migrations
npx prisma db seed    # Seed with realistic data
npx prisma studio     # Browse database in browser
```

## Default Login

```
Email:    admin@brightsmile.com
Password: admin123
```

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dental_dashboard"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
LINEAR_API_KEY="..."
```

## Data Model Summary

| Model       | Purpose                                      |
|-------------|----------------------------------------------|
| Clinic      | Single clinic info (name, address, phone)    |
| Staff       | Dentists and hygienists                      |
| Patient     | Patient records with acquisition source      |
| Appointment | Scheduled visits with status and type        |
| Treatment   | ADA-coded procedures linked to appointments  |
| Invoice     | Billing records per appointment              |
| Payment     | Payments against invoices                    |
| AdminUser   | Dashboard login credentials                  |

## Metric Periods

All metric API routes accept `?period=7d|30d|90d`. Default: `30d`.

## Code Conventions

- Immutable data patterns — never mutate objects in place
- Server Components for data fetching, Client Components only where interactivity needed
- API routes validate auth session before any query
- All chart components are client-side wrappers around Recharts
- shadcn/ui for all UI primitives — do not roll custom components when shadcn covers it

## MCP Integrations

- **Linear:** Project management — tasks synced via `@linear/mcp-server`
