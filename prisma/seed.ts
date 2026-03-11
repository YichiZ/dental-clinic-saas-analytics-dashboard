import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const ACQUISITION_SOURCES = ['referral', 'walk-in', 'online', 'insurance', 'other'] as const
const APPOINTMENT_TYPES = ['checkup', 'cleaning', 'filling', 'extraction', 'crown', 'root-canal', 'whitening', 'consultation'] as const
const APPOINTMENT_STATUSES = ['completed', 'cancelled', 'no-show', 'scheduled'] as const
const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'check'] as const
const STAFF_ROLES = ['dentist', 'hygienist'] as const

const ADA_CODES: Record<string, { code: string; description: string; fee: number }[]> = {
  checkup: [{ code: 'D0120', description: 'Periodic oral evaluation', fee: 65 }],
  cleaning: [{ code: 'D1110', description: 'Adult prophylaxis', fee: 120 }],
  filling: [
    { code: 'D2140', description: 'Amalgam restoration, 1 surface', fee: 180 },
    { code: 'D2160', description: 'Amalgam restoration, 3 surfaces', fee: 260 },
  ],
  extraction: [{ code: 'D7140', description: 'Extraction, erupted tooth', fee: 220 }],
  crown: [{ code: 'D2750', description: 'Crown, porcelain fused to metal', fee: 1200 }],
  'root-canal': [{ code: 'D3330', description: 'Endodontic therapy, molar', fee: 1400 }],
  whitening: [{ code: 'D9975', description: 'External bleaching, per arch', fee: 350 }],
  consultation: [{ code: 'D9310', description: 'Consultation (referred)', fee: 90 }],
}

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDateInPast(daysBack: number): Date {
  const now = new Date()
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()))
}

function appointmentFee(type: string): number {
  const codes = ADA_CODES[type] ?? ADA_CODES['checkup']
  return codes.reduce((sum, c) => sum + c.fee, 0)
}

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.treatment.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.adminUser.deleteMany()
  await prisma.clinic.deleteMany()

  // Create clinic
  const clinic = await prisma.clinic.create({
    data: {
      name: 'BrightSmile Dental',
      address: '123 Main Street, San Francisco, CA 94105',
      phone: '(415) 555-0100',
      email: 'info@brightsmile.com',
    },
  })

  // Create staff (4 dentists, 3 hygienists)
  const staffData = [
    { name: 'Dr. Sarah Johnson', role: 'dentist', email: 'sarah.johnson@brightsmile.com' },
    { name: 'Dr. Michael Chen', role: 'dentist', email: 'michael.chen@brightsmile.com' },
    { name: 'Dr. Emily Rodriguez', role: 'dentist', email: 'emily.rodriguez@brightsmile.com' },
    { name: 'Dr. James Park', role: 'dentist', email: 'james.park@brightsmile.com' },
    { name: 'Amy Williams', role: 'hygienist', email: 'amy.williams@brightsmile.com' },
    { name: 'Tom Brown', role: 'hygienist', email: 'tom.brown@brightsmile.com' },
    { name: 'Lisa Davis', role: 'hygienist', email: 'lisa.davis@brightsmile.com' },
  ]

  const staff = await Promise.all(
    staffData.map((s) =>
      prisma.staff.create({ data: { ...s, clinicId: clinic.id, phone: faker.phone.number() } })
    )
  )

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.adminUser.create({
    data: {
      email: 'admin@brightsmile.com',
      passwordHash,
      name: 'Admin User',
    },
  })

  // Create 200 patients
  const patients = await Promise.all(
    Array.from({ length: 200 }, () =>
      prisma.patient.create({
        data: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
          acquisitionSource: randomElement(ACQUISITION_SOURCES),
          createdAt: randomDateInPast(365),
        },
      })
    )
  )

  // Create ~4 appointments per patient (some more, some fewer)
  console.log('Creating appointments...')
  for (const patient of patients) {
    const numAppointments = Math.floor(Math.random() * 6) + 1
    for (let i = 0; i < numAppointments; i++) {
      const type = randomElement(APPOINTMENT_TYPES)
      const status = randomElement(APPOINTMENT_STATUSES)
      const scheduledAt = randomDateInPast(365)
      const staffMember = randomElement(staff)
      const fee = appointmentFee(type)

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          staffId: staffMember.id,
          scheduledAt,
          duration: randomElement([30, 45, 60, 90]),
          status,
          type,
          notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        },
      })

      // Add treatments for completed appointments
      if (status === 'completed') {
        const codes = ADA_CODES[type] ?? ADA_CODES['checkup']
        await Promise.all(
          codes.map((c) =>
            prisma.treatment.create({
              data: {
                appointmentId: appointment.id,
                adaCode: c.code,
                description: c.description,
                fee: c.fee,
              },
            })
          )
        )

        // Create invoice
        const invoiceStatus = randomElement(['paid', 'paid', 'paid', 'pending', 'partial', 'overdue'] as const)
        const dueDate = new Date(scheduledAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        const paidAmount =
          invoiceStatus === 'paid'
            ? fee
            : invoiceStatus === 'partial'
            ? fee * (Math.random() * 0.5 + 0.2)
            : 0

        const invoice = await prisma.invoice.create({
          data: {
            appointmentId: appointment.id,
            totalAmount: fee,
            paidAmount,
            status: invoiceStatus,
            dueDate,
          },
        })

        // Create payments for paid/partial invoices
        if (paidAmount > 0) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: paidAmount,
              method: randomElement(PAYMENT_METHODS),
              paidAt: new Date(scheduledAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
            },
          })
        }
      }
    }
  }

  const appointmentCount = await prisma.appointment.count()
  const invoiceCount = await prisma.invoice.count()
  const paymentCount = await prisma.payment.count()

  console.log(`Seeded:`)
  console.log(`   1 clinic`)
  console.log(`   ${staff.length} staff members`)
  console.log(`   1 admin user (admin@brightsmile.com / admin123)`)
  console.log(`   ${patients.length} patients`)
  console.log(`   ${appointmentCount} appointments`)
  console.log(`   ${invoiceCount} invoices`)
  console.log(`   ${paymentCount} payments`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
