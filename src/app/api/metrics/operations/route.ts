import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parsePeriod, getAppointmentStats } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = parsePeriod(searchParams.get('period') ?? undefined)

  const stats = await getAppointmentStats(period)

  return NextResponse.json({
    period,
    total: stats.total,
    completed: stats.completed,
    noShows: stats.noShows,
    cancelled: stats.cancelled,
    noShowRate: Math.round(stats.noShowRate * 10) / 10,
    dailyVolume: stats.dailyVolume,
    busiestHours: stats.busiestHours,
    utilizationByDay: stats.utilizationByDay,
  })
}
