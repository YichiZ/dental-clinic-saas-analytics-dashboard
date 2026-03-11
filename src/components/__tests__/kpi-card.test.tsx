import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '../kpi-card'
import { DollarSign } from 'lucide-react'

describe('KpiCard', () => {
  it('renders the title', () => {
    render(<KpiCard title="Total Revenue" value="$10,000" icon={DollarSign} />)
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
  })

  it('renders the value', () => {
    render(<KpiCard title="Total Revenue" value="$10,000" icon={DollarSign} />)
    expect(screen.getByText('$10,000')).toBeInTheDocument()
  })

  it('renders trend badge when trend and trendLabel provided', () => {
    render(
      <KpiCard
        title="Revenue"
        value="$5,000"
        icon={DollarSign}
        trend="up"
        trendLabel="this month"
      />
    )
    expect(screen.getByText(/this month/)).toBeInTheDocument()
  })

  it('does not render trend badge when trend is not provided', () => {
    render(<KpiCard title="Revenue" value="$5,000" icon={DollarSign} />)
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
    expect(screen.queryByText('↓')).not.toBeInTheDocument()
  })

  it('renders up arrow for up trend', () => {
    render(
      <KpiCard
        title="Revenue"
        value="$5,000"
        icon={DollarSign}
        trend="up"
        trendLabel="growing"
      />
    )
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders down arrow for down trend', () => {
    render(
      <KpiCard
        title="No-shows"
        value="12"
        icon={DollarSign}
        trend="down"
        trendLabel="decreasing"
      />
    )
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })

  it('renders neutral arrow for neutral trend', () => {
    render(
      <KpiCard
        title="Balance"
        value="$500"
        icon={DollarSign}
        trend="neutral"
        trendLabel="stable"
      />
    )
    expect(screen.getByText(/→/)).toBeInTheDocument()
  })
})
