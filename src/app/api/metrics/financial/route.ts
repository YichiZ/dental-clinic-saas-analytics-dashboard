import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Period, periodStart, getRevenueSummary, getOutstandingBalance } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '30d') as Period
  const start = periodStart(period)

  const [revenue, outstanding] = await Promise.all([
    getRevenueSummary(period),
    getOutstandingBalance(),
  ])

  // Weekly revenue buckets
  const payments = revenue.payments
  const weeklyRevenue = buildWeeklyBuckets(payments, start)

  // Outstanding invoices detail
  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['pending', 'partial', 'overdue'] } },
    include: {
      appointment: {
        include: { patient: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  })

  return NextResponse.json({
    period,
    totalRevenue: revenue.totalRevenue,
    byMethod: revenue.byMethod,
    weeklyRevenue,
    outstanding: outstanding.outstanding,
    overdueInvoices: overdueInvoices.map((inv) => ({
      id: inv.id,
      patientName: `${inv.appointment.patient.firstName} ${inv.appointment.patient.lastName}`,
      total: inv.totalAmount,
      paid: inv.paidAmount,
      balance: inv.totalAmount - inv.paidAmount,
      status: inv.status,
      dueDate: inv.dueDate,
    })),
  })
}

function buildWeeklyBuckets(
  payments: { amount: number; paidAt: Date }[],
  start: Date
) {
  const buckets: Record<string, number> = {}
  const now = new Date()

  // Create weekly buckets
  const current = new Date(start)
  while (current <= now) {
    const key = current.toISOString().split('T')[0]
    buckets[key] = 0
    current.setDate(current.getDate() + 7)
  }

  // Fill buckets
  for (const payment of payments) {
    const weekStart = new Date(payment.paidAt)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const key = weekStart.toISOString().split('T')[0]
    buckets[key] = (buckets[key] ?? 0) + payment.amount
  }

  return Object.entries(buckets).map(([week, revenue]) => ({ week, revenue }))
}
