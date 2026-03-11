import { Suspense } from 'react'
import { Calendar, TrendingDown, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { AppointmentVolumeChart } from '@/components/charts/appointment-volume-chart'
import { UtilizationChart } from '@/components/charts/utilization-chart'
import { BusiestHoursChart } from '@/components/charts/busiest-hours-chart'
import { parsePeriod, getAppointmentStats } from '@/lib/metrics'

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const period = parsePeriod(params.period)

  const stats = await getAppointmentStats(period)
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
        <CardContent><AppointmentVolumeChart data={stats.dailyVolume} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Utilization by Day of Week</CardTitle></CardHeader>
          <CardContent><UtilizationChart data={stats.utilizationByDay} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Busiest Hours</CardTitle></CardHeader>
          <CardContent><BusiestHoursChart data={stats.busiestHours} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
