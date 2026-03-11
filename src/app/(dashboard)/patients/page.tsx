import { Suspense } from 'react'
import { Users, UserPlus, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { PatientAcquisitionChart } from '@/components/charts/patient-acquisition-chart'
import { RetentionChart } from '@/components/charts/retention-chart'
import { parsePeriod, periodStart, getPatientStats } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'

const SOURCE_COLORS: Record<string, string> = {
  referral: 'bg-blue-100 text-blue-800',
  'walk-in': 'bg-green-100 text-green-800',
  online: 'bg-purple-100 text-purple-800',
  insurance: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-600',
}

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function PatientsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const period = parsePeriod(params.period)
  const start = periodStart(period)

  const [stats, recentPatients] = await Promise.all([
    getPatientStats(period),
    prisma.patient.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, firstName: true, lastName: true, acquisitionSource: true, createdAt: true },
    }),
  ])

  const retentionRate = stats.totalPatients > 0
    ? Math.round((stats.returningCount / stats.totalPatients) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">Acquisition and retention metrics</p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="New Patients" value={stats.newPatients.toString()} icon={UserPlus} trend="up" trendLabel={period} />
        <KpiCard title="Total Patients" value={stats.totalPatients.toString()} icon={Users} trend="neutral" trendLabel="all time" />
        <KpiCard title="Retention Rate" value={`${retentionRate}%`} icon={RotateCcw} trend={retentionRate > 60 ? 'up' : 'down'} trendLabel="returning" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Acquisition by Source</CardTitle></CardHeader>
          <CardContent><PatientAcquisitionChart data={stats.acquisitionBreakdown} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">New vs Returning</CardTitle></CardHeader>
          <CardContent><RetentionChart newPatients={stats.newPatients} returningCount={stats.returningCount} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent New Patients</CardTitle></CardHeader>
        <CardContent>
          {recentPatients.length === 0 ? (
            <p className="text-sm text-gray-500">No new patients in this period</p>
          ) : (
            <div className="space-y-3">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Joined {patient.createdAt.toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[patient.acquisitionSource] ?? 'bg-gray-100 text-gray-600'}`}>
                    {patient.acquisitionSource}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
