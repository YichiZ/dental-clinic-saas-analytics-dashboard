import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Trend = 'up' | 'down' | 'neutral'

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: Trend
  trendLabel?: string
  className?: string
}

function TrendBadge({ trend, label }: { trend: Trend; label: string }) {
  const variants: Record<Trend, string> = {
    up: 'bg-green-100 text-green-800',
    down: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-600',
  }
  const arrows: Record<Trend, string> = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[trend]
      )}
    >
      {arrows[trend]} {label}
    </span>
  )
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-5 w-5 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && trendLabel && (
          <div className="mt-1">
            <TrendBadge trend={trend} label={trendLabel} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
