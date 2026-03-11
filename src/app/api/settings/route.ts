import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [clinic, staff] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.staff.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({ clinic, staff })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, address, phone, email } = body

  if (!name || !address || !phone || !email) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  const clinic = await prisma.clinic.findFirst()
  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  const updated = await prisma.clinic.update({
    where: { id: clinic.id },
    data: { name, address, phone, email },
  })

  return NextResponse.json({ clinic: updated })
}
