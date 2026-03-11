import { DollarSign, Calendar, Users, AlertCircle } from 'lucide-react'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { Suspense } from 'react'

interface OverviewData {
  totalRevenue: number
  outstandingBalance: number
  totalAppointments: number
  noShowRate: number
  newPatients: number
  totalPatients: number
}

async function fetchOverview(period: string): Promise<OverviewData> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/metrics/overview?period=${period}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch overview data')
  return res.json()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const params = await searchParams
  const period = (params.period ?? '30d') as '7d' | '30d' | '90d'

  let data: OverviewData | null = null
  let error: string | null = null

  try {
    data = await fetchOverview(period)
  } catch {
    error = 'Failed to load dashboard data'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            BrightSmile Dental analytics dashboard
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue)}
            icon={DollarSign}
            trend="up"
            trendLabel={period}
          />
          <KpiCard
            title="Outstanding Balance"
            value={formatCurrency(data.outstandingBalance)}
            icon={AlertCircle}
            trend="neutral"
            trendLabel="unpaid invoices"
          />
          <KpiCard
            title="Appointments"
            value={data.totalAppointments.toString()}
            icon={Calendar}
            trend="up"
            trendLabel={period}
          />
          <KpiCard
            title="No-Show Rate"
            value={`${data.noShowRate.toFixed(1)}%`}
            icon={Calendar}
            trend={data.noShowRate > 15 ? 'down' : 'up'}
            trendLabel="of appointments"
          />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            title="New Patients"
            value={data.newPatients.toString()}
            icon={Users}
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
        </div>
      )}
    </div>
  )
}
