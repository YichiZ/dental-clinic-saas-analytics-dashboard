import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parsePeriod, getRevenueSummary, getOutstandingBalance } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = parsePeriod(searchParams.get('period') ?? undefined)

  const [revenue, outstanding, overdueInvoices] = await Promise.all([
    getRevenueSummary(period),
    getOutstandingBalance(),
    prisma.invoice.findMany({
      where: { status: { in: ['pending', 'partial', 'overdue'] } },
      include: {
        appointment: {
          include: { patient: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
  ])

  return NextResponse.json({
    period,
    totalRevenue: revenue.totalRevenue,
    byMethod: revenue.byMethod,
    weeklyRevenue: revenue.weeklyRevenue,
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
