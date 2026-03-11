'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PaymentMethodChartProps {
  data: Record<string, number>
}

const COLORS = {
  cash: '#10b981',
  card: '#3b82f6',
  insurance: '#8b5cf6',
  check: '#f59e0b',
}

const LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  insurance: 'Insurance',
  check: 'Check',
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key] ?? key,
      value: Math.round(value),
      color: COLORS[key as keyof typeof COLORS] ?? '#94a3b8',
    }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-gray-400">
        No payment data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value)
          }
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
