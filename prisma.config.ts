import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: 'postgresql://postgres:postgres@localhost:5432/dental_dashboard',
  },
})
