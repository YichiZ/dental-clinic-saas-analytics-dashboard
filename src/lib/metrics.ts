import { prisma } from './prisma'

export type Period = '7d' | '30d' | '90d'

export function periodStart(period: Period): Date {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
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

  return { totalRevenue, byMethod, payments }
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

  return { total, completed, noShows, cancelled, noShowRate, appointments }
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
