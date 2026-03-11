import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parsePeriod, periodStart, getPatientStats } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = parsePeriod(searchParams.get('period') ?? undefined)
  const start = periodStart(period)

  const [stats, recentPatients] = await Promise.all([
    getPatientStats(period),
    prisma.patient.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        acquisitionSource: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    period,
    newPatients: stats.newPatients,
    totalPatients: stats.totalPatients,
    returningCount: stats.returningCount,
    retentionRate:
      stats.totalPatients > 0
        ? Math.round((stats.returningCount / stats.totalPatients) * 100)
        : 0,
    acquisitionBreakdown: stats.acquisitionBreakdown,
    recentPatients: recentPatients.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      source: p.acquisitionSource,
      joinedAt: p.createdAt,
    })),
  })
}
