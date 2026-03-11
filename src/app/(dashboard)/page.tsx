import { DollarSign, Calendar, Users, AlertCircle } from 'lucide-react'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { Suspense } from 'react'
import {
  parsePeriod,
  getRevenueSummary,
  getOutstandingBalance,
  getAppointmentStats,
  getPatientStats,
} from '@/lib/metrics'

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
  const period = parsePeriod(params.period)

  const [revenue, outstanding, appointments, patients] = await Promise.all([
    getRevenueSummary(period),
    getOutstandingBalance(),
    getAppointmentStats(period),
    getPatientStats(period),
  ])

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(revenue.totalRevenue)}
          icon={DollarSign}
          trend="up"
          trendLabel={period}
        />
        <KpiCard
          title="Outstanding Balance"
          value={formatCurrency(outstanding.outstanding)}
          icon={AlertCircle}
          trend="neutral"
          trendLabel="unpaid invoices"
        />
        <KpiCard
          title="Appointments"
          value={appointments.total.toString()}
          icon={Calendar}
          trend="up"
          trendLabel={period}
        />
        <KpiCard
          title="No-Show Rate"
          value={`${appointments.noShowRate.toFixed(1)}%`}
          icon={Calendar}
          trend={appointments.noShowRate > 15 ? 'down' : 'up'}
          trendLabel="of appointments"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="New Patients"
          value={patients.newPatients.toString()}
          icon={Users}
          trend="up"
          trendLabel={period}
        />
        <KpiCard
          title="Total Patients"
          value={patients.totalPatients.toString()}
          icon={Users}
          trend="neutral"
          trendLabel="all time"
        />
      </div>
    </div>
  )
}
