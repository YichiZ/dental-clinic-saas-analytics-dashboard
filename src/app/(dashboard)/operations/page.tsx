import { Suspense } from 'react'
import { Calendar, TrendingDown, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { AppointmentVolumeChart } from '@/components/charts/appointment-volume-chart'
import { UtilizationChart } from '@/components/charts/utilization-chart'
import { BusiestHoursChart } from '@/components/charts/busiest-hours-chart'

interface OperationsData {
  total: number
  completed: number
  noShows: number
  cancelled: number
  noShowRate: number
  dailyVolume: { date: string; total: number; noShows: number }[]
  busiestHours: { hour: number; count: number }[]
  utilizationByDay: { day: string; utilization: number; total: number }[]
}

async function fetchOperations(period: string): Promise<OperationsData> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/metrics/operations?period=${period}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch operations data')
  return res.json()
}

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const period = (params.period ?? '30d') as '7d' | '30d' | '90d'

  let data: OperationsData | null = null
  let error: string | null = null

  try {
    data = await fetchOperations(period)
  } catch {
    error = 'Failed to load operations data'
  }

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

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              title="Total Appointments"
              value={data.total.toString()}
              icon={Calendar}
              trend="neutral"
              trendLabel={period}
            />
            <KpiCard
              title="Completed"
              value={data.completed.toString()}
              icon={CheckCircle}
              trend="up"
              trendLabel="completed"
            />
            <KpiCard
              title="No-Shows"
              value={data.noShows.toString()}
              icon={XCircle}
              trend={data.noShows > 10 ? 'down' : 'up'}
              trendLabel="no-shows"
            />
            <KpiCard
              title="No-Show Rate"
              value={`${data.noShowRate}%`}
              icon={TrendingDown}
              trend={data.noShowRate > 15 ? 'down' : 'up'}
              trendLabel="of appointments"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentVolumeChart data={data.dailyVolume} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Utilization by Day of Week</CardTitle>
              </CardHeader>
              <CardContent>
                <UtilizationChart data={data.utilizationByDay} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Busiest Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <BusiestHoursChart data={data.busiestHours} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
