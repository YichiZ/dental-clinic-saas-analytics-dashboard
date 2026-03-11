import { Suspense } from 'react'
import { DollarSign, AlertCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/kpi-card'
import { PeriodSelector } from '@/components/period-selector'
import { RevenueChart } from '@/components/charts/revenue-chart'
import { PaymentMethodChart } from '@/components/charts/payment-method-chart'

interface InvoiceRow {
  id: string
  patientName: string
  total: number
  paid: number
  balance: number
  status: string
  dueDate: string
}

interface FinancialData {
  totalRevenue: number
  outstanding: number
  byMethod: Record<string, number>
  weeklyRevenue: { week: string; revenue: number }[]
  overdueInvoices: InvoiceRow[]
}

async function fetchFinancial(period: string): Promise<FinancialData> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/metrics/financial?period=${period}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch financial data')
  return res.json()
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
  const period = (params.period ?? '30d') as '7d' | '30d' | '90d'

  let data: FinancialData | null = null
  let error: string | null = null

  try {
    data = await fetchFinancial(period)
  } catch {
    error = 'Failed to load financial data'
  }

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

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              icon={DollarSign}
              trend="up"
              trendLabel={period}
            />
            <KpiCard
              title="Outstanding Balance"
              value={formatCurrency(data.outstanding)}
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
                <RevenueChart data={data.weeklyRevenue} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodChart data={data.byMethod} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {data.overdueInvoices.length === 0 ? (
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
                      {data.overdueInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium">{inv.patientName}</td>
                          <td className="py-3 text-right text-gray-600">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="py-3 text-right font-semibold">
                            {formatCurrency(inv.balance)}
                          </td>
                          <td className="py-3 pl-4">
                            <Badge variant={statusBadgeVariant(inv.status)}>
                              {inv.status}
                            </Badge>
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
        </>
      )}
    </div>
  )
}
