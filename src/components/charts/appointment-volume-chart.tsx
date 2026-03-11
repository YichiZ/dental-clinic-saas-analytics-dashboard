'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface VolumeDataPoint {
  date: string
  total: number
  noShows: number
}

interface AppointmentVolumeChartProps {
  data: VolumeDataPoint[]
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AppointmentVolumeChart({ data }: AppointmentVolumeChartProps) {
  // Sample to avoid overcrowding (show every Nth point)
  const step = Math.max(1, Math.floor(data.length / 20))
  const sampled = data.filter((_, i) => i % step === 0).map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={sampled} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="noShows"
          name="No-shows"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
