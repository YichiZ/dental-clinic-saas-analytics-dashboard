import { Suspense } from 'react'
import { Users, UserPlus, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { PatientAcquisitionChart } from '@/components/charts/patient-acquisition-chart'
import { RetentionChart } from '@/components/charts/retention-chart'

interface PatientData {
  newPatients: number
  totalPatients: number
  returningCount: number
  retentionRate: number
  acquisitionBreakdown: { source: string; count: number }[]
  recentPatients: { id: string; name: string; source: string; joinedAt: string }[]
}

async function fetchPatients(period: string): Promise<PatientData> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/metrics/patients?period=${period}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch patient data')
  return res.json()
}

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
  const period = (params.period ?? '30d') as '7d' | '30d' | '90d'

  let data: PatientData | null = null
  let error: string | null = null

  try {
    data = await fetchPatients(period)
  } catch {
    error = 'Failed to load patient data'
  }

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

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              title="New Patients"
              value={data.newPatients.toString()}
              icon={UserPlus}
              trend="up"
              trendLabel={period}
            />
            <KpiCard
              title="Total Patients"
              value={data.totalPatients.toString()}
              icon={Users}
              trend="neutral"
              trendLabel="all time"
            />
            <KpiCard
              title="Retention Rate"
              value={`${data.retentionRate}%`}
              icon={RotateCcw}
              trend={data.retentionRate > 60 ? 'up' : 'down'}
              trendLabel="returning"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acquisition by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <PatientAcquisitionChart data={data.acquisitionBreakdown} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">New vs Returning</CardTitle>
              </CardHeader>
              <CardContent>
                <RetentionChart
                  newPatients={data.newPatients}
                  returningCount={data.returningCount}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent New Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentPatients.length === 0 ? (
                <p className="text-sm text-gray-500">No new patients in this period</p>
              ) : (
                <div className="space-y-3">
                  {data.recentPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Joined {new Date(patient.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          SOURCE_COLORS[patient.source] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {patient.source}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
