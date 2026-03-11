import { describe, it, expect, vi, beforeEach } from 'vitest'
import { periodStart, type Period } from '../metrics'

// Mock prisma
vi.mock('../prisma', () => ({
  prisma: {
    payment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    invoice: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    appointment: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    patient: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  },
}))

describe('periodStart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
  })

  it('returns a date 7 days ago for "7d"', () => {
    const result = periodStart('7d')
    const expected = new Date('2024-03-08T00:00:00.000Z')
    // Allow for timezone offset differences
    expect(result.getTime()).toBeLessThanOrEqual(new Date('2024-03-09T00:00:00Z').getTime())
    expect(result.getTime()).toBeGreaterThanOrEqual(new Date('2024-03-07T00:00:00Z').getTime())
  })

  it('returns a date 30 days ago for "30d"', () => {
    const result = periodStart('30d')
    expect(result.getTime()).toBeLessThanOrEqual(new Date('2024-02-15T12:00:00Z').getTime())
    expect(result.getTime()).toBeGreaterThanOrEqual(new Date('2024-02-13T00:00:00Z').getTime())
  })

  it('returns a date 90 days ago for "90d"', () => {
    const result = periodStart('90d')
    expect(result.getTime()).toBeLessThanOrEqual(new Date('2023-12-16T12:00:00Z').getTime())
    expect(result.getTime()).toBeGreaterThanOrEqual(new Date('2023-12-13T00:00:00Z').getTime())
  })

  it('returns a date with hours set to 0', () => {
    const result = periodStart('7d')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('returns different dates for different periods', () => {
    const d7 = periodStart('7d')
    const d30 = periodStart('30d')
    const d90 = periodStart('90d')
    expect(d7.getTime()).toBeGreaterThan(d30.getTime())
    expect(d30.getTime()).toBeGreaterThan(d90.getTime())
  })
})
