'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface AcquisitionDataPoint {
  source: string
  count: number
}

interface PatientAcquisitionChartProps {
  data: AcquisitionDataPoint[]
}

const SOURCE_COLORS: Record<string, string> = {
  referral: '#3b82f6',
  'walk-in': '#10b981',
  online: '#8b5cf6',
  insurance: '#f59e0b',
  other: '#94a3b8',
}

function formatSource(source: string) {
  return source.charAt(0).toUpperCase() + source.slice(1)
}

export function PatientAcquisitionChart({ data }: PatientAcquisitionChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatSource(d.source),
    fill: SOURCE_COLORS[d.source] ?? '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value: number) => [value, 'Patients']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {formatted.map((entry, index) => (
            <rect key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
