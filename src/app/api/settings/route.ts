import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d\s\-().]{7,20}$/

function validateClinicBody(body: unknown): { name: string; address: string; phone: string; email: string } | null {
  if (typeof body !== 'object' || body === null) return null
  const { name, address, phone, email } = body as Record<string, unknown>
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) return null
  if (typeof address !== 'string' || address.trim().length === 0 || address.length > 500) return null
  if (typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) return null
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return null
  return {
    name: name.trim(),
    address: address.trim(),
    phone: phone.trim(),
    email: email.trim(),
  }
}

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = validateClinicBody(body)
  if (!data) {
    return NextResponse.json(
      { error: 'Invalid request: name, address, phone, and a valid email are required' },
      { status: 400 }
    )
  }

  const clinic = await prisma.clinic.findFirst()
  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  const updated = await prisma.clinic.update({
    where: { id: clinic.id },
    data,
  })

  return NextResponse.json({ clinic: updated })
}
