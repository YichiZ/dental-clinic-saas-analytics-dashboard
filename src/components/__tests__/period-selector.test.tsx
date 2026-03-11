import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PeriodSelector } from '../period-selector'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

describe('PeriodSelector', () => {
  it('renders three period buttons', () => {
    render(<PeriodSelector current="30d" />)
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('30 days')).toBeInTheDocument()
    expect(screen.getByText('90 days')).toBeInTheDocument()
  })

  it('highlights the current period button', () => {
    render(<PeriodSelector current="30d" />)
    const btn = screen.getByText('30 days')
    expect(btn.className).toContain('bg-gray-900')
  })

  it('does not highlight non-current period buttons', () => {
    render(<PeriodSelector current="30d" />)
    const btn7 = screen.getByText('7 days')
    expect(btn7.className).not.toContain('bg-gray-900')
  })

  it('calls router.push with correct period when a button is clicked', () => {
    render(<PeriodSelector current="30d" />)
    fireEvent.click(screen.getByText('7 days'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard?period=7d')
  })

  it('calls router.push with 90d when 90 days button is clicked', () => {
    render(<PeriodSelector current="30d" />)
    fireEvent.click(screen.getByText('90 days'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard?period=90d')
  })
})
