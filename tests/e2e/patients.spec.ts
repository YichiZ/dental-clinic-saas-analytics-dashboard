import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@brightsmile.com')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
}

test.describe('Patients page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/patients')
  })

  test('shows Patients heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible()
  })

  test('shows patient KPI cards', async ({ page }) => {
    await expect(page.getByText('New Patients').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Total Patients').first()).toBeVisible()
    await expect(page.getByText('Retention Rate')).toBeVisible()
  })

  test('shows Acquisition by Source chart', async ({ page }) => {
    await expect(page.getByText('Acquisition by Source')).toBeVisible()
  })

  test('shows New vs Returning chart', async ({ page }) => {
    await expect(page.getByText('New vs Returning')).toBeVisible()
  })
})
