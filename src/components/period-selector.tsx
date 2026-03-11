'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const PERIODS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
] as const

type Period = (typeof PERIODS)[number]['value']

interface PeriodSelectorProps {
  current: Period
}

export function PeriodSelector({ current }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelect = (period: Period) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex rounded-lg border border-gray-200 p-1 bg-white">
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            current === value
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
