# Dental Clinic SaaS Analytics Dashboard — Design Doc

**Date:** 2026-03-10
**Status:** Approved

---

## Overview

A single-clinic SaaS analytics dashboard for dental clinic owners/administrators. Provides business intelligence across three metric categories: Financial, Operational, and Patient. Built as a full-stack application with real data persistence.

---

## Architecture

```
Next.js 14 (App Router)
├── Frontend: React + Tailwind CSS + shadcn/ui + Recharts
├── Backend: Next.js API Routes (Route Handlers)
├── ORM: Prisma
├── Database: PostgreSQL
└── Auth: NextAuth.js (email/password, single admin user)
```

**Deployment target:** Single-clinic, single-tenant.

**Pages:**
- `/login` — auth gate
- `/` — overview dashboard (KPI cards + summary charts)
- `/financial` — revenue, billing, outstanding payments
- `/operations` — appointments, no-shows, chair utilization
- `/patients` — new vs returning, retention, acquisition
- `/settings` — clinic info, staff management

---

## Data Model

```prisma
model Clinic {
  id      String @id @default(cuid())
  name    String
  address String
  phone   String
  logo    String?
}

model Staff {
  id           String        @id @default(cuid())
  name         String
  role         String        // dentist, hygienist, admin
  email        String        @unique
  appointments Appointment[]
}

model Patient {
  id          String        @id @default(cuid())
  name        String
  dob         DateTime
  phone       String
  email       String        @unique
  source      String        // referral, walk-in, online, etc.
  createdAt   DateTime      @default(now())
  appointments Appointment[]
  invoices    Invoice[]
}

model Appointment {
  id        String   @id @default(cuid())
  patientId String
  dentistId String
  date      DateTime
  duration  Int      // minutes
  status    String   // SCHEDULED, COMPLETED, NO_SHOW, CANCELLED
  type      String   // checkup, cleaning, filling, etc.
  patient   Patient  @relation(fields: [patientId], references: [id])
  dentist   Staff    @relation(fields: [dentistId], references: [id])
  treatments Treatment[]
  invoices  Invoice[]
}

model Treatment {
  id            String      @id @default(cuid())
  appointmentId String
  code          String      // ADA procedure code
  description   String
  cost          Float
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
}

model Invoice {
  id            String      @id @default(cuid())
  patientId     String
  appointmentId String
  total         Float
  paid          Float       @default(0)
  dueDate       DateTime
  status        String      // PENDING, PARTIAL, PAID, OVERDUE
  patient       Patient     @relation(fields: [patientId], references: [id])
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  payments      Payment[]
}

model Payment {
  id        String   @id @default(cuid())
  invoiceId String
  amount    Float
  method    String   // CASH, CARD, INSURANCE, CHECK
  paidAt    DateTime @default(now())
  invoice   Invoice  @relation(fields: [invoiceId], references: [id])
}
```

**Derived metrics:**
- Revenue = sum of `Payment.amount` grouped by period
- No-show rate = `Appointment[status=NO_SHOW]` / total appointments
- New patients = `Patient.createdAt` within period
- Retention = patients with 2+ appointments in rolling 90d
- Outstanding = sum of `Invoice.total - Invoice.paid` where status != PAID
- Chair utilization = booked minutes / available minutes per day

---

## Dashboard UI

### Overview Page
- KPI cards row with week / 30d / 90d period toggle:
  - Total Revenue
  - Appointments (Booked / Completed / No-show)
  - New Patients
  - Outstanding Invoices ($)
- Sparkline trend charts under each KPI card

### Financial Page
- Revenue bar chart (weekly bars, rolling 30/90d selector)
- Payment method breakdown (pie chart: Cash, Card, Insurance, Check)
- Outstanding invoices table (sortable, filterable by status: Pending, Partial, Overdue)

### Operations Page
- Appointment volume line chart by week
- No-show rate trend line
- Chair utilization % by day of week (heatmap)
- Busiest hours bar chart

### Patients Page
- New vs returning donut chart
- Patient acquisition source breakdown (bar chart)
- Retention rate trend (rolling 90d)
- Recent new patients list (table)

### Settings Page
- Clinic info editor
- Staff list (add/edit/remove)

### Design Language
- Dark sidebar navigation, white content area
- shadcn/ui components throughout
- Recharts for all data visualizations
- Mobile-responsive layout
- Professional, clean aesthetic suitable for healthcare admin

---

## Seed Data

Database seeded with realistic mock data:
- 1 clinic, 3 staff members
- ~200 patients over 12 months
- ~800 appointments with varied statuses
- Corresponding invoices and payments
- Mix of patient acquisition sources

---

## Auth

- NextAuth.js with Credentials provider
- Single admin account (email + password)
- All routes protected — redirect to `/login` if unauthenticated
- Session stored in JWT
