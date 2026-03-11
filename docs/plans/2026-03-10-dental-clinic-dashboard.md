# Dental Clinic SaaS Analytics Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack single-clinic dental analytics dashboard with Financial, Operational, and Patient metrics using Next.js 14, PostgreSQL, and Prisma.

**Architecture:** Next.js 14 App Router with server components for data fetching, API Route Handlers for aggregated metric endpoints, and Prisma ORM talking to PostgreSQL. All routes protected via NextAuth.js JWT sessions.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Prisma, PostgreSQL, NextAuth.js, Vitest, Playwright

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local`

**Step 1: Bootstrap the project**

```bash
cd /Users/yichizhang/code/saas-analytics-dashboard
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

**Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client next-auth@beta \
  recharts @radix-ui/react-icons lucide-react \
  clsx tailwind-merge class-variance-authority
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```
Select: Default style, Slate color, CSS variables: yes.

**Step 4: Add shadcn components used in the dashboard**

```bash
npx shadcn@latest add card table badge button input label \
  select tabs dropdown-menu avatar separator skeleton
```

**Step 5: Install dev/test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom \
  @playwright/test
```

**Step 6: Create `.env.local`**

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dental_dashboard"
NEXTAUTH_SECRET="replace-with-a-random-32-char-string"
NEXTAUTH_URL="http://localhost:3000"
```

**Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 14 project with shadcn/ui and Prisma"
```

---

### Task 2: Prisma Schema + PostgreSQL Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`

**Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

**Step 2: Write the schema**

Replace contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Clinic {
  id      String  @id @default(cuid())
  name    String
  address String
  phone   String
  logo    String?
}

model Staff {
  id           String        @id @default(cuid())
  name         String
  role         String
  email        String        @unique
  appointments Appointment[]
}

model Patient {
  id           String        @id @default(cuid())
  name         String
  dob          DateTime
  phone        String
  email        String        @unique
  source       String
  createdAt    DateTime      @default(now())
  appointments Appointment[]
  invoices     Invoice[]
}

model Appointment {
  id         String      @id @default(cuid())
  patientId  String
  dentistId  String
  date       DateTime
  duration   Int
  status     String
  type       String
  patient    Patient     @relation(fields: [patientId], references: [id])
  dentist    Staff       @relation(fields: [dentistId], references: [id])
  treatments Treatment[]
  invoices   Invoice[]
}

model Treatment {
  id            String      @id @default(cuid())
  appointmentId String
  code          String
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
  status        String
  patient       Patient     @relation(fields: [patientId], references: [id])
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  payments      Payment[]
}

model Payment {
  id        String   @id @default(cuid())
  invoiceId String
  amount    Float
  method    String
  paidAt    DateTime @default(now())
  invoice   Invoice  @relation(fields: [invoiceId], references: [id])
}

model AdminUser {
  id       String @id @default(cuid())
  email    String @unique
  password String
}
```

**Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```
Expected: Migration created and applied, Prisma Client generated.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema with all dental clinic models"
```

---

### Task 3: Seed Database with Realistic Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add seed script)

**Step 1: Install seed helpers**

```bash
npm install -D @faker-js/faker bcryptjs
npm install -D @types/bcryptjs
```

**Step 2: Write the seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const APPOINTMENT_STATUSES = ["COMPLETED", "COMPLETED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;
const APPOINTMENT_TYPES = ["checkup", "cleaning", "filling", "extraction", "whitening", "crown", "root-canal"];
const SOURCES = ["referral", "walk-in", "google", "instagram", "facebook", "insurance-network"];
const PAYMENT_METHODS = ["CARD", "CARD", "CASH", "INSURANCE", "CHECK"] as const;
const PROCEDURE_CODES = [
  { code: "D0120", description: "Periodic oral evaluation", cost: 75 },
  { code: "D1110", description: "Prophylaxis - adult", cost: 120 },
  { code: "D2140", description: "Amalgam restoration - 1 surface", cost: 180 },
  { code: "D7140", description: "Extraction - erupted tooth", cost: 220 },
  { code: "D9972", description: "External bleaching", cost: 450 },
  { code: "D2740", description: "Crown - porcelain/ceramic", cost: 1400 },
  { code: "D3330", description: "Root canal - molar", cost: 1100 },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.adminUser.deleteMany();

  // Clinic
  await prisma.clinic.create({
    data: {
      name: "Bright Smile Dental",
      address: "123 Main Street, Suite 200, San Francisco, CA 94105",
      phone: "(415) 555-0100",
    },
  });

  // Admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.create({
    data: { email: "admin@brightsmile.com", password: hashedPassword },
  });

  // Staff
  const staff = await Promise.all([
    prisma.staff.create({ data: { name: "Dr. Sarah Chen", role: "dentist", email: "schen@brightsmile.com" } }),
    prisma.staff.create({ data: { name: "Dr. Michael Torres", role: "dentist", email: "mtorres@brightsmile.com" } }),
    prisma.staff.create({ data: { name: "Emma Wilson", role: "hygienist", email: "ewilson@brightsmile.com" } }),
  ]);

  // Patients (200 over 12 months)
  const patients = await Promise.all(
    Array.from({ length: 200 }, (_, i) =>
      prisma.patient.create({
        data: {
          name: faker.person.fullName(),
          dob: faker.date.birthdate({ min: 18, max: 80, mode: "age" }),
          phone: faker.phone.number(),
          email: faker.internet.email({ provider: `patient${i}.com` }),
          source: randomFrom(SOURCES),
          createdAt: daysAgo(Math.floor(Math.random() * 365)),
        },
      })
    )
  );

  // Appointments + Treatments + Invoices + Payments
  for (const patient of patients) {
    const apptCount = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < apptCount; i++) {
      const apptDate = daysAgo(Math.floor(Math.random() * 365));
      const status = randomFrom(APPOINTMENT_STATUSES);
      const dentist = randomFrom(staff.filter((s) => s.role !== "hygienist"));
      const procedure = randomFrom(PROCEDURE_CODES);

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          dentistId: dentist.id,
          date: apptDate,
          duration: randomFrom([30, 45, 60, 90]),
          status,
          type: randomFrom(APPOINTMENT_TYPES),
        },
      });

      await prisma.treatment.create({
        data: {
          appointmentId: appointment.id,
          code: procedure.code,
          description: procedure.description,
          cost: procedure.cost,
        },
      });

      if (status === "COMPLETED") {
        const total = procedure.cost;
        const isPaid = Math.random() > 0.2;
        const isPartial = !isPaid && Math.random() > 0.5;
        const paid = isPaid ? total : isPartial ? total * 0.5 : 0;
        const invoiceStatus = isPaid ? "PAID" : isPartial ? "PARTIAL" : "OVERDUE";

        const invoice = await prisma.invoice.create({
          data: {
            patientId: patient.id,
            appointmentId: appointment.id,
            total,
            paid,
            dueDate: new Date(apptDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            status: invoiceStatus,
          },
        });

        if (paid > 0) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: paid,
              method: randomFrom(PAYMENT_METHODS),
              paidAt: new Date(apptDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

**Step 3: Add seed script to `package.json`**

Add to the `"scripts"` section:
```json
"prisma": {
  "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
}
```
Also add `ts-node`:
```bash
npm install -D ts-node
```

**Step 4: Run seed**

```bash
npx prisma db seed
```
Expected: "✅ Seed complete"

**Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add realistic seed data for 200 patients and 12 months of appointments"
```

---

### Task 4: NextAuth.js Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/middleware.ts`

**Step 1: Write auth config**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
```

**Step 2: Create Prisma singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 3: Create route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Step 4: Create middleware**

Create `src/middleware.ts`:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 5: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Bright Smile Dental</CardTitle>
          <p className="text-sm text-slate-500">Sign in to your dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 6: Test login manually**

```bash
npm run dev
```
Visit http://localhost:3000 — should redirect to /login.
Sign in with `admin@brightsmile.com` / `admin123` — should redirect to /.

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: add NextAuth.js credentials auth with login page and middleware"
```

---

### Task 5: Dashboard Layout + Sidebar Navigation

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/sidebar.tsx`

**Step 1: Write root layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bright Smile Dental — Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

**Step 2: Create sidebar component**

Create `src/components/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  DollarSign,
  Calendar,
  Users,
  Settings,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/financial", label: "Financial", icon: DollarSign },
  { href: "/operations", label: "Operations", icon: Calendar },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <Stethoscope className="h-6 w-6 text-blue-400" />
        <span className="font-semibold text-lg">Bright Smile</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
```

**Step 3: Create dashboard group layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

**Step 4: Move pages into dashboard route group**

All dashboard pages (`page.tsx` for `/`, `/financial`, `/operations`, `/patients`, `/settings`) live under `src/app/(dashboard)/`.

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add dashboard layout with dark sidebar navigation"
```

---

### Task 6: Metric API Routes

**Files:**
- Create: `src/app/api/metrics/overview/route.ts`
- Create: `src/app/api/metrics/financial/route.ts`
- Create: `src/app/api/metrics/operations/route.ts`
- Create: `src/app/api/metrics/patients/route.ts`
- Create: `src/lib/metrics.ts`

**Step 1: Write metrics helper library**

Create `src/lib/metrics.ts`:

```typescript
import { prisma } from "@/lib/prisma";

export type Period = "7d" | "30d" | "90d";

export function periodStart(period: Period): Date {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export async function getRevenue(period: Period) {
  const start = periodStart(period);
  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: start } },
    select: { amount: true, paidAt: true },
  });
  return payments;
}

export async function getAppointmentStats(period: Period) {
  const start = periodStart(period);
  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: start } },
    select: { status: true, date: true },
  });
  return appointments;
}

export async function getPatientStats(period: Period) {
  const start = periodStart(period);
  const [newPatients, allPatients] = await Promise.all([
    prisma.patient.count({ where: { createdAt: { gte: start } } }),
    prisma.patient.count(),
  ]);
  return { newPatients, allPatients };
}

export async function getOutstandingBalance() {
  const result = await prisma.invoice.aggregate({
    where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    _sum: { total: true, paid: true },
  });
  const total = result._sum.total ?? 0;
  const paid = result._sum.paid ?? 0;
  return total - paid;
}
```

**Step 2: Write overview API route**

Create `src/app/api/metrics/overview/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRevenue, getAppointmentStats, getPatientStats, getOutstandingBalance, Period } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = (req.nextUrl.searchParams.get("period") ?? "30d") as Period;

  const [payments, appointments, patientStats, outstanding] = await Promise.all([
    getRevenue(period),
    getAppointmentStats(period),
    getPatientStats(period),
    getOutstandingBalance(),
  ]);

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const booked = appointments.length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShow = appointments.filter((a) => a.status === "NO_SHOW").length;

  return NextResponse.json({
    revenue,
    booked,
    completed,
    noShow,
    newPatients: patientStats.newPatients,
    outstanding,
  });
}
```

**Step 3: Write financial API route**

Create `src/app/api/metrics/financial/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Period, periodStart } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = (req.nextUrl.searchParams.get("period") ?? "30d") as Period;
  const start = periodStart(period);

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: start } },
      select: { amount: true, method: true, paidAt: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      include: { patient: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Group revenue by week
  const revenueByWeek: Record<string, number> = {};
  for (const p of payments) {
    const weekStart = new Date(p.paidAt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split("T")[0];
    revenueByWeek[key] = (revenueByWeek[key] ?? 0) + p.amount;
  }

  const revenueChart = Object.entries(revenueByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, revenue]) => ({ week, revenue }));

  // Payment method breakdown
  const methodTotals: Record<string, number> = {};
  for (const p of payments) {
    methodTotals[p.method] = (methodTotals[p.method] ?? 0) + p.amount;
  }
  const methodChart = Object.entries(methodTotals).map(([method, total]) => ({ method, total }));

  return NextResponse.json({ revenueChart, methodChart, invoices });
}
```

**Step 4: Write operations API route**

Create `src/app/api/metrics/operations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Period, periodStart } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = (req.nextUrl.searchParams.get("period") ?? "30d") as Period;
  const start = periodStart(period);

  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: start } },
    select: { date: true, status: true, duration: true },
  });

  // Volume by week
  const weeklyVolume: Record<string, { total: number; noShow: number }> = {};
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, { booked: number; available: number }> = {};

  for (const a of appointments) {
    const d = new Date(a.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];

    weeklyVolume[key] = weeklyVolume[key] ?? { total: 0, noShow: 0 };
    weeklyVolume[key].total++;
    if (a.status === "NO_SHOW") weeklyVolume[key].noShow++;

    const hour = d.getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;

    const day = d.getDay();
    dayCounts[day] = dayCounts[day] ?? { booked: 0, available: 480 };
    dayCounts[day].booked += a.duration;
  }

  const volumeChart = Object.entries(weeklyVolume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { total, noShow }]) => ({
      week,
      total,
      noShow,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
    }));

  const hoursChart = Array.from({ length: 10 }, (_, i) => i + 8).map((h) => ({
    hour: `${h}:00`,
    count: hourCounts[h] ?? 0,
  }));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const utilizationChart = dayNames.map((day, i) => ({
    day,
    utilization: dayCounts[i]
      ? Math.min(100, Math.round((dayCounts[i].booked / dayCounts[i].available) * 100))
      : 0,
  }));

  return NextResponse.json({ volumeChart, hoursChart, utilizationChart });
}
```

**Step 5: Write patients API route**

Create `src/app/api/metrics/patients/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Period, periodStart } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = (req.nextUrl.searchParams.get("period") ?? "30d") as Period;
  const start = periodStart(period);

  const [allPatients, newPatients, retention] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, source: true, createdAt: true },
    }),
    prisma.patient.findMany({
      include: {
        appointments: {
          where: { date: { gte: periodStart("90d") }, status: "COMPLETED" },
          select: { id: true },
        },
      },
    }),
  ]);

  const newCount = await prisma.patient.count({ where: { createdAt: { gte: start } } });
  const returningCount = retention.filter((p) => p.appointments.length >= 2).length;

  // Acquisition sources
  const sourceCounts: Record<string, number> = {};
  for (const p of await prisma.patient.findMany({ where: { createdAt: { gte: start } }, select: { source: true } })) {
    sourceCounts[p.source] = (sourceCounts[p.source] ?? 0) + 1;
  }
  const sourceChart = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));

  return NextResponse.json({
    totalPatients: allPatients,
    newCount,
    returningCount,
    retentionRate: allPatients > 0 ? Math.round((returningCount / allPatients) * 100) : 0,
    sourceChart,
    recentNewPatients: newPatients,
  });
}
```

**Step 6: Test API routes manually**

```bash
# Start server
npm run dev

# After logging in, test in browser:
# http://localhost:3000/api/metrics/overview?period=30d
# http://localhost:3000/api/metrics/financial?period=30d
# http://localhost:3000/api/metrics/operations?period=30d
# http://localhost:3000/api/metrics/patients?period=30d
```
Expected: JSON responses with metric data.

**Step 7: Commit**

```bash
git add src/app/api/ src/lib/
git commit -m "feat: add metric API routes for overview, financial, operations, and patients"
```

---

### Task 7: Overview Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/components/kpi-card.tsx`
- Create: `src/components/period-selector.tsx`

**Step 1: Create reusable KPI card component**

Create `src/components/kpi-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className={cn(
            "text-xs mt-1",
            trend === "up" ? "text-green-500" :
            trend === "down" ? "text-red-500" :
            "text-slate-500"
          )}>{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create period selector component**

Create `src/components/period-selector.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("period") ?? "30d";

  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
      {PERIODS.map(({ value, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          onClick={() => router.push(`?period=${value}`)}
          className={cn(
            "text-xs",
            current === value ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
          )}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
```

**Step 3: Create overview page**

Create `src/app/(dashboard)/page.tsx`:

```tsx
import { Suspense } from "react";
import { DollarSign, Calendar, Users, AlertCircle } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PeriodSelector } from "@/components/period-selector";
import { Skeleton } from "@/components/ui/skeleton";

async function OverviewMetrics({ period }: { period: string }) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/metrics/overview?period=${period}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Revenue"
        value={`$${data.revenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
        icon={DollarSign}
        subtitle={`${data.completed} completed appointments`}
      />
      <KpiCard
        title="Appointments"
        value={String(data.booked)}
        icon={Calendar}
        subtitle={`${data.noShow} no-shows`}
        trend={data.noShow > data.booked * 0.15 ? "down" : "neutral"}
      />
      <KpiCard
        title="New Patients"
        value={String(data.newPatients)}
        icon={Users}
        trend="up"
      />
      <KpiCard
        title="Outstanding"
        value={`$${data.outstanding.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
        icon={AlertCircle}
        trend={data.outstanding > 5000 ? "down" : "neutral"}
      />
    </div>
  );
}

export default function OverviewPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period ?? "30d";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500">Bright Smile Dental — key metrics at a glance</p>
        </div>
        <Suspense>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      }>
        <OverviewMetrics period={period} />
      </Suspense>
    </div>
  );
}
```

**Step 4: Verify in browser**

```bash
npm run dev
```
Visit http://localhost:3000 — should show 4 KPI cards with real data.

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add overview dashboard with KPI cards and period selector"
```

---

### Task 8: Financial Page

**Files:**
- Create: `src/app/(dashboard)/financial/page.tsx`
- Create: `src/components/charts/revenue-chart.tsx`
- Create: `src/components/charts/payment-method-chart.tsx`
- Create: `src/components/invoices-table.tsx`

**Step 1: Create revenue bar chart**

Create `src/components/charts/revenue-chart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { week: string; revenue: number }[];
}

export function RevenueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Create payment method pie chart**

Create `src/components/charts/payment-method-chart.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"];

interface Props {
  data: { method: string; total: number }[];
}

export function PaymentMethodChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={90} label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Step 3: Create financial page**

Create `src/app/(dashboard)/financial/page.tsx`:

```tsx
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "@/components/period-selector";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PaymentMethodChart } from "@/components/charts/payment-method-chart";
import { Skeleton } from "@/components/ui/skeleton";

async function FinancialData({ period }: { period: string }) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/metrics/financial?period=${period}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  const statusColor: Record<string, "default" | "secondary" | "destructive"> = {
    PENDING: "secondary",
    PARTIAL: "default",
    OVERDUE: "destructive",
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly Revenue</CardTitle></CardHeader>
          <CardContent><RevenueChart data={data.revenueChart} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent><PaymentMethodChart data={data.methodChart} /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Outstanding Invoices</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 font-medium">Patient</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Balance</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-3">{inv.patient.name}</td>
                    <td className="py-3">${inv.total.toLocaleString()}</td>
                    <td className="py-3">${inv.paid.toLocaleString()}</td>
                    <td className="py-3 font-medium">${(inv.total - inv.paid).toLocaleString()}</td>
                    <td className="py-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="py-3">
                      <Badge variant={statusColor[inv.status] ?? "default"}>{inv.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function FinancialPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams.period ?? "30d";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial</h1>
          <p className="text-sm text-slate-500">Revenue, payments, and outstanding balances</p>
        </div>
        <Suspense><PeriodSelector /></Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <FinancialData period={period} />
      </Suspense>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add financial page with revenue chart, payment methods, and invoices table"
```

---

### Task 9: Operations Page

**Files:**
- Create: `src/app/(dashboard)/operations/page.tsx`
- Create: `src/components/charts/appointment-volume-chart.tsx`
- Create: `src/components/charts/utilization-chart.tsx`
- Create: `src/components/charts/busiest-hours-chart.tsx`

**Step 1: Create appointment volume chart**

Create `src/components/charts/appointment-volume-chart.tsx`:

```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: { week: string; total: number; noShow: number; noShowRate: number }[];
}

export function AppointmentVolumeChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="noShow" stroke="#ef4444" name="No-Show" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Create utilization chart**

Create `src/components/charts/utilization-chart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  data: { day: string; utilization: number }[];
}

export function UtilizationChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.utilization > 80 ? "#10b981" : entry.utilization > 50 ? "#3b82f6" : "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 3: Create busiest hours chart**

Create `src/components/charts/busiest-hours-chart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { hour: string; count: number }[];
}

export function BusiestHoursChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Appointments" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 4: Create operations page**

Create `src/app/(dashboard)/operations/page.tsx`:

```tsx
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "@/components/period-selector";
import { AppointmentVolumeChart } from "@/components/charts/appointment-volume-chart";
import { UtilizationChart } from "@/components/charts/utilization-chart";
import { BusiestHoursChart } from "@/components/charts/busiest-hours-chart";
import { Skeleton } from "@/components/ui/skeleton";

async function OperationsData({ period }: { period: string }) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/metrics/operations?period=${period}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  const avgNoShowRate = data.volumeChart.length
    ? Math.round(data.volumeChart.reduce((s: number, w: any) => s + w.noShowRate, 0) / data.volumeChart.length)
    : 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Appointment Volume by Week</CardTitle></CardHeader>
          <CardContent><AppointmentVolumeChart data={data.volumeChart} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Avg No-Show Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-full pt-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-slate-900">{avgNoShowRate}%</div>
                <p className="text-sm text-slate-500 mt-2">of appointments missed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Chair Utilization by Day</CardTitle></CardHeader>
          <CardContent><UtilizationChart data={data.utilizationChart} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Busiest Hours</CardTitle></CardHeader>
          <CardContent><BusiestHoursChart data={data.hoursChart} /></CardContent>
        </Card>
      </div>
    </>
  );
}

export default function OperationsPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams.period ?? "30d";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations</h1>
          <p className="text-sm text-slate-500">Appointments, no-shows, and chair utilization</p>
        </div>
        <Suspense><PeriodSelector /></Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <OperationsData period={period} />
      </Suspense>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add operations page with appointment volume, no-show rate, and utilization charts"
```

---

### Task 10: Patients Page

**Files:**
- Create: `src/app/(dashboard)/patients/page.tsx`
- Create: `src/components/charts/new-vs-returning-chart.tsx`
- Create: `src/components/charts/acquisition-source-chart.tsx`

**Step 1: Create new vs returning donut chart**

Create `src/components/charts/new-vs-returning-chart.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  newCount: number;
  returningCount: number;
}

export function NewVsReturningChart({ newCount, returningCount }: Props) {
  const data = [
    { name: "New", value: newCount },
    { name: "Returning", value: returningCount },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
          <Cell fill="#3b82f6" />
          <Cell fill="#10b981" />
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Create acquisition source chart**

Create `src/components/charts/acquisition-source-chart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { source: string; count: number }[];
}

export function AcquisitionSourceChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="source" type="category" tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Patients" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 3: Create patients page**

Create `src/app/(dashboard)/patients/page.tsx`:

```tsx
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "@/components/period-selector";
import { NewVsReturningChart } from "@/components/charts/new-vs-returning-chart";
import { AcquisitionSourceChart } from "@/components/charts/acquisition-source-chart";
import { Skeleton } from "@/components/ui/skeleton";

async function PatientsData({ period }: { period: string }) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/metrics/patients?period=${period}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">New vs Returning</CardTitle></CardHeader>
          <CardContent>
            <NewVsReturningChart newCount={data.newCount} returningCount={data.returningCount} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Retention Rate (90d)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-full pt-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-slate-900">{data.retentionRate}%</div>
                <p className="text-sm text-slate-500 mt-2">patients with 2+ visits</p>
                <p className="text-xs text-slate-400 mt-1">{data.totalPatients} total patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Acquisition Sources</CardTitle></CardHeader>
          <CardContent>
            <AcquisitionSourceChart data={data.sourceChart} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent New Patients</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentNewPatients.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3"><Badge variant="secondary">{p.source}</Badge></td>
                  <td className="py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

export default function PatientsPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams.period ?? "30d";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">Acquisition, retention, and new patient trends</p>
        </div>
        <Suspense><PeriodSelector /></Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <PatientsData period={period} />
      </Suspense>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add patients page with new/returning chart, retention rate, and acquisition sources"
```

---

### Task 11: Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Create settings page**

Create `src/app/(dashboard)/settings/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const [clinic, staff] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Clinic information and staff</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Clinic Info</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-slate-500 w-24 inline-block">Name</span>{clinic?.name}</div>
          <div><span className="text-slate-500 w-24 inline-block">Address</span>{clinic?.address}</div>
          <div><span className="text-slate-500 w-24 inline-block">Phone</span>{clinic?.phone}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Staff</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{s.name}</td>
                  <td className="py-3"><Badge variant="secondary">{s.role}</Badge></td>
                  <td className="py-3 text-slate-500">{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/
git commit -m "feat: add settings page with clinic info and staff list"
```

---

### Task 12: Vitest Unit Tests

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/metrics.test.ts`

**Step 1: Write vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

**Step 2: Create test setup**

Create `src/test/setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

**Step 3: Write unit tests for metrics lib**

Create `src/lib/__tests__/metrics.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { periodStart } from "@/lib/metrics";

describe("periodStart", () => {
  it("returns a date 7 days ago for 7d", () => {
    const result = periodStart("7d");
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expect(result.toDateString()).toBe(expected.toDateString());
  });

  it("returns a date 30 days ago for 30d", () => {
    const result = periodStart("30d");
    const expected = new Date();
    expected.setDate(expected.getDate() - 30);
    expect(result.toDateString()).toBe(expected.toDateString());
  });

  it("returns a date 90 days ago for 90d", () => {
    const result = periodStart("90d");
    const expected = new Date();
    expected.setDate(expected.getDate() - 90);
    expect(result.toDateString()).toBe(expected.toDateString());
  });
});
```

**Step 4: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 5: Run tests**

```bash
npm test
```
Expected: 3 tests pass.

**Step 6: Commit**

```bash
git add vitest.config.ts src/test/ src/lib/__tests__/
git commit -m "test: add vitest config and unit tests for metrics helpers"
```

---

### Task 13: Final Polish + README

**Files:**
- Modify: `src/app/(dashboard)/page.tsx` (ensure no-data empty states)
- Create: `README.md`

**Step 1: Add empty state handling to overview page**

In each page, if data arrays are empty, show a friendly empty state message instead of blank charts.

**Step 2: Write README**

Create `README.md`:

```markdown
# Bright Smile Dental — Analytics Dashboard

A full-stack SaaS analytics dashboard for dental clinic owners, tracking Financial, Operational, and Patient metrics.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (email/password)

## Setup

1. Install dependencies: `npm install`
2. Set up `.env.local` (copy `.env.example`)
3. Run migrations: `npx prisma migrate dev`
4. Seed database: `npx prisma db seed`
5. Start dev server: `npm run dev`

## Login

Default credentials (from seed):
- Email: `admin@brightsmile.com`
- Password: `admin123`

## Pages

| Page | Path | Description |
|------|------|-------------|
| Overview | `/` | KPI cards: revenue, appointments, new patients, outstanding |
| Financial | `/financial` | Revenue chart, payment methods, outstanding invoices |
| Operations | `/operations` | Appointment volume, no-show rate, chair utilization |
| Patients | `/patients` | New vs returning, retention rate, acquisition sources |
| Settings | `/settings` | Clinic info, staff list |

## Testing

```bash
npm test          # unit tests
npx playwright test  # e2e tests
```
```

**Step 3: Final commit**

```bash
git add README.md src/
git commit -m "docs: add README with setup instructions and project overview"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Scaffold Next.js + shadcn/ui + dependencies |
| 2 | Prisma schema + PostgreSQL migration |
| 3 | Realistic seed data (200 patients, 12 months) |
| 4 | NextAuth.js auth + login page + middleware |
| 5 | Dashboard layout + dark sidebar navigation |
| 6 | Metric API routes (overview, financial, operations, patients) |
| 7 | Overview page (KPI cards + period selector) |
| 8 | Financial page (revenue chart, pie chart, invoices table) |
| 9 | Operations page (volume, no-show rate, utilization, hours) |
| 10 | Patients page (new/returning, retention, acquisition) |
| 11 | Settings page (clinic info, staff list) |
| 12 | Vitest unit tests |
| 13 | Polish + README |
