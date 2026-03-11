'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RetentionChartProps {
  newPatients: number
  returningCount: number
}

export function RetentionChart({ newPatients, returningCount }: RetentionChartProps) {
  const chartData = [
    { name: 'New Patients', value: newPatients, color: '#3b82f6' },
    { name: 'Returning', value: returningCount, color: '#10b981' },
  ].filter((d) => d.value > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-gray-400">
        No patient data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, 'Patients']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
