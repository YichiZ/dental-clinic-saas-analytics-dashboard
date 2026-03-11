import { Suspense } from 'react'
import { DollarSign, AlertCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { RevenueChart } from '@/components/charts/revenue-chart'
import { PaymentMethodChart } from '@/components/charts/payment-method-chart'
import { type Period, periodStart, getRevenueSummary, getOutstandingBalance } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'

function buildWeeklyBuckets(payments: { amount: number; paidAt: Date }[], start: Date) {
  const buckets: Record<string, number> = {}
  const now = new Date()
  const current = new Date(start)
  while (current <= now) {
    buckets[current.toISOString().split('T')[0]] = 0
    current.setDate(current.getDate() + 7)
  }
  for (const payment of payments) {
    const weekStart = new Date(payment.paidAt)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const key = weekStart.toISOString().split('T')[0]
    buckets[key] = (buckets[key] ?? 0) + payment.amount
  }
  return Object.entries(buckets).map(([week, revenue]) => ({ week, revenue }))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function statusBadgeVariant(status: string) {
  if (status === 'overdue') return 'destructive'
  if (status === 'partial') return 'secondary'
  return 'outline'
}

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function FinancialPage({ searchParams }: PageProps) {
  const params = await searchParams
  const period = (params.period ?? '30d') as Period
  const start = periodStart(period)

  const [revenue, outstanding, overdueInvoicesRaw] = await Promise.all([
    getRevenueSummary(period),
    getOutstandingBalance(),
    prisma.invoice.findMany({
      where: { status: { in: ['pending', 'partial', 'overdue'] } },
      include: {
        appointment: {
          include: { patient: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
  ])

  const weeklyRevenue = buildWeeklyBuckets(revenue.payments, start)
  const overdueInvoices = overdueInvoicesRaw.map((inv) => ({
    id: inv.id,
    patientName: `${inv.appointment.patient.firstName} ${inv.appointment.patient.lastName}`,
    total: inv.totalAmount,
    paid: inv.paidAmount,
    balance: inv.totalAmount - inv.paidAmount,
    status: inv.status,
    dueDate: inv.dueDate.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue and billing metrics</p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Weekly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={weeklyRevenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodChart data={revenue.byMethod} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-gray-500">No outstanding invoices</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left font-medium text-gray-500">Patient</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Total</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Balance</th>
                    <th className="pb-3 text-left font-medium text-gray-500 pl-4">Status</th>
                    <th className="pb-3 text-left font-medium text-gray-500 pl-4">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50">
                      <td className="py-3 font-medium">{inv.patientName}</td>
                      <td className="py-3 text-right text-gray-600">{formatCurrency(inv.total)}</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(inv.balance)}</td>
                      <td className="py-3 pl-4">
                        <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
                      </td>
                      <td className="py-3 pl-4 text-gray-600">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
