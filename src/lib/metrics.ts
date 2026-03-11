import { prisma } from './prisma'

export type Period = '7d' | '30d' | '90d'

export function parsePeriod(value: string | undefined): Period {
  if (value === '7d' || value === '30d' || value === '90d') return value
  return '30d'
}

export function periodStart(period: Period): Date {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
}

export function buildWeeklyBuckets(
  payments: { amount: number; paidAt: Date }[],
  start: Date
): { week: string; revenue: number }[] {
  const buckets: Record<string, number> = {}
  const now = new Date()
  const current = new Date(start)
  while (current <= now) {
    buckets[current.toISOString().split('T')[0]] = 0
    current.setDate(current.getDate() + 7)
  }
  for (const payment of payments) {
    const d = new Date(payment.paidAt)
    const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    buckets[key] = (buckets[key] ?? 0) + payment.amount
  }
  return Object.entries(buckets).map(([week, revenue]) => ({ week, revenue }))
}

export function buildDailyBuckets(
  appointments: { scheduledAt: Date; status: string }[],
  start: Date
): { date: string; total: number; noShows: number }[] {
  const buckets: Record<string, { total: number; noShows: number }> = {}
  const now = new Date()
  const current = new Date(start)
  while (current <= now) {
    buckets[current.toISOString().split('T')[0]] = { total: 0, noShows: 0 }
    current.setDate(current.getDate() + 1)
  }
  for (const appt of appointments) {
    const key = new Date(appt.scheduledAt).toISOString().split('T')[0]
    if (buckets[key]) {
      buckets[key] = {
        total: buckets[key].total + 1,
        noShows: buckets[key].noShows + (appt.status === 'no-show' ? 1 : 0),
      }
    }
  }
  return Object.entries(buckets).map(([date, data]) => ({ date, ...data }))
}

export async function getRevenueSummary(period: Period) {
  const start = periodStart(period)

  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: start } },
    select: { amount: true, method: true, paidAt: true },
  })

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

  const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
    return { ...acc, [p.method]: (acc[p.method] ?? 0) + p.amount }
  }, {})

  const weeklyRevenue = buildWeeklyBuckets(payments, start)

  return { totalRevenue, byMethod, weeklyRevenue }
}

export async function getOutstandingBalance() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ['pending', 'partial', 'overdue'] } },
    select: { totalAmount: true, paidAmount: true, status: true },
  })

  const outstanding = invoices.reduce(
    (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
    0
  )
  return { outstanding, invoiceCount: invoices.length }
}

export async function getAppointmentStats(period: Period) {
  const start = periodStart(period)

  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: start } },
    select: { status: true, scheduledAt: true, type: true, staffId: true },
  })

  const total = appointments.length
  const completed = appointments.filter((a) => a.status === 'completed').length
  const noShows = appointments.filter((a) => a.status === 'no-show').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length
  const noShowRate = total > 0 ? (noShows / total) * 100 : 0

  const dailyVolume = buildDailyBuckets(appointments, start)

  const hourCounts: Record<number, number> = {}
  for (const appt of appointments) {
    const hour = new Date(appt.scheduledAt).getHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  }
  const busiestHours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: hourCounts[h] ?? 0,
  })).filter((h) => h.count > 0)

  const dayUtil: Record<number, { total: number; completed: number }> = {}
  for (const appt of appointments) {
    const day = new Date(appt.scheduledAt).getDay()
    const existing = dayUtil[day] ?? { total: 0, completed: 0 }
    dayUtil[day] = {
      total: existing.total + 1,
      completed: existing.completed + (appt.status === 'completed' ? 1 : 0),
    }
  }
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const utilizationByDay = Array.from({ length: 7 }, (_, d) => {
    const data = dayUtil[d] ?? { total: 0, completed: 0 }
    return {
      day: dayNames[d],
      utilization: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      total: data.total,
    }
  })

  return { total, completed, noShows, cancelled, noShowRate, dailyVolume, busiestHours, utilizationByDay }
}

export async function getPatientStats(period: Period) {
  const start = periodStart(period)

  const [newPatients, totalPatients, returningAppointments] = await Promise.all([
    prisma.patient.count({ where: { createdAt: { gte: start } } }),
    prisma.patient.count(),
    prisma.appointment.groupBy({
      by: ['patientId'],
      where: { scheduledAt: { gte: start } },
      _count: { patientId: true },
      having: { patientId: { _count: { gt: 1 } } },
    }),
  ])

  const acquisitionBreakdown = await prisma.patient.groupBy({
    by: ['acquisitionSource'],
    where: { createdAt: { gte: start } },
    _count: { acquisitionSource: true },
  })

  return {
    newPatients,
    totalPatients,
    returningCount: returningAppointments.length,
    acquisitionBreakdown: acquisitionBreakdown.map((a) => ({
      source: a.acquisitionSource,
      count: a._count.acquisitionSource,
    })),
  }
}
