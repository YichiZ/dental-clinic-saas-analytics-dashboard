import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  parsePeriod,
  getRevenueSummary,
  getOutstandingBalance,
  getAppointmentStats,
  getPatientStats,
} from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = parsePeriod(searchParams.get('period') ?? undefined)

  const [revenue, outstanding, appointments, patients] = await Promise.all([
    getRevenueSummary(period),
    getOutstandingBalance(),
    getAppointmentStats(period),
    getPatientStats(period),
  ])

  return NextResponse.json({
    period,
    totalRevenue: revenue.totalRevenue,
    outstandingBalance: outstanding.outstanding,
    totalAppointments: appointments.total,
    noShowRate: appointments.noShowRate,
    newPatients: patients.newPatients,
    totalPatients: patients.totalPatients,
  })
}
