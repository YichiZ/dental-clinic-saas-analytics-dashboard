import { Suspense } from 'react'
import { Calendar, TrendingDown, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { AppointmentVolumeChart } from '@/components/charts/appointment-volume-chart'
import { UtilizationChart } from '@/components/charts/utilization-chart'
import { BusiestHoursChart } from '@/components/charts/busiest-hours-chart'
import { type Period, periodStart, getAppointmentStats } from '@/lib/metrics'

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const period = (params.period ?? '30d') as Period
  const start = periodStart(period)

  const stats = await getAppointmentStats(period)
  const { appointments } = stats

  // Daily volume buckets
  const buckets: Record<string, { total: number; noShows: number }> = {}
  const now = new Date()
  const cur = new Date(start)
  while (cur <= now) {
    buckets[cur.toISOString().split('T')[0]] = { total: 0, noShows: 0 }
    cur.setDate(cur.getDate() + 1)
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
  const dailyVolume = Object.entries(buckets).map(([date, data]) => ({ date, ...data }))

  // Busiest hours
  const hourCounts: Record<number, number> = {}
  for (const appt of appointments) {
    const hour = new Date(appt.scheduledAt).getHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  }
  const busiestHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourCounts[h] ?? 0 })).filter(h => h.count > 0)

  // Utilization by day of week
  const dayUtil: Record<number, { total: number; completed: number }> = {}
  for (const appt of appointments) {
    const day = new Date(appt.scheduledAt).getDay()
    const existing = dayUtil[day] ?? { total: 0, completed: 0 }
    dayUtil[day] = { total: existing.total + 1, completed: existing.completed + (appt.status === 'completed' ? 1 : 0) }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const utilizationByDay = Array.from({ length: 7 }, (_, d) => {
    const data = dayUtil[d] ?? { total: 0, completed: 0 }
    return { day: days[d], utilization: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0, total: data.total }
  })

  const noShowRate = Math.round(stats.noShowRate * 10) / 10

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations</h1>
          <p className="text-sm text-gray-500 mt-1">Appointment and scheduling metrics</p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Total Appointments" value={stats.total.toString()} icon={Calendar} trend="neutral" trendLabel={period} />
        <KpiCard title="Completed" value={stats.completed.toString()} icon={CheckCircle} trend="up" trendLabel="completed" />
        <KpiCard title="No-Shows" value={stats.noShows.toString()} icon={XCircle} trend={stats.noShows > 10 ? 'down' : 'up'} trendLabel="no-shows" />
        <KpiCard title="No-Show Rate" value={`${noShowRate}%`} icon={TrendingDown} trend={noShowRate > 15 ? 'down' : 'up'} trendLabel="of appointments" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Appointment Volume</CardTitle></CardHeader>
        <CardContent><AppointmentVolumeChart data={dailyVolume} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Utilization by Day of Week</CardTitle></CardHeader>
          <CardContent><UtilizationChart data={utilizationByDay} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Busiest Hours</CardTitle></CardHeader>
          <CardContent><BusiestHoursChart data={busiestHours} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
