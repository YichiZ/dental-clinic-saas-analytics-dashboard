import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Period, periodStart, getAppointmentStats } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '30d') as Period
  const start = periodStart(period)

  const stats = await getAppointmentStats(period)
  const { appointments } = stats

  // Daily appointment volume
  const dailyVolume = buildDailyBuckets(appointments, start)

  // Busiest hours
  const hourCounts: Record<number, number> = {}
  for (const appt of appointments) {
    const hour = new Date(appt.scheduledAt).getHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  }
  const busiestHours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: hourCounts[h] ?? 0,
  })).filter((h) => h.count > 0)

  // Utilization by day of week
  const dayUtilization: Record<number, { total: number; completed: number }> = {}
  for (const appt of appointments) {
    const day = new Date(appt.scheduledAt).getDay()
    const existing = dayUtilization[day] ?? { total: 0, completed: 0 }
    dayUtilization[day] = {
      total: existing.total + 1,
      completed: existing.completed + (appt.status === 'completed' ? 1 : 0),
    }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const utilizationByDay = Array.from({ length: 7 }, (_, d) => {
    const data = dayUtilization[d] ?? { total: 0, completed: 0 }
    return {
      day: days[d],
      utilization: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      total: data.total,
    }
  })

  return NextResponse.json({
    period,
    total: stats.total,
    completed: stats.completed,
    noShows: stats.noShows,
    cancelled: stats.cancelled,
    noShowRate: Math.round(stats.noShowRate * 10) / 10,
    dailyVolume,
    busiestHours,
    utilizationByDay,
  })
}

function buildDailyBuckets(
  appointments: { scheduledAt: Date; status: string }[],
  start: Date
) {
  const buckets: Record<string, { total: number; noShows: number }> = {}
  const now = new Date()

  const current = new Date(start)
  while (current <= now) {
    const key = current.toISOString().split('T')[0]
    buckets[key] = { total: 0, noShows: 0 }
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
