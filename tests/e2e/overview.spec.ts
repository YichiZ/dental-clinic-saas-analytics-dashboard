import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@brightsmile.com')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
  await page.waitForLoadState('networkidle')
}

test.describe('Overview page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows Overview heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 })
  })

  test('shows KPI cards', async ({ page }) => {
    await expect(page.getByText('Total Revenue')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Appointments').first()).toBeVisible()
    await expect(page.getByText('New Patients').first()).toBeVisible()
  })

  test('shows period selector with 3 options', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('7 days')).toBeVisible()
    await expect(page.getByText('30 days')).toBeVisible()
    await expect(page.getByText('90 days')).toBeVisible()
  })

  test('period selector changes URL', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 })
    await page.getByText('7 days').click()
    await expect(page).toHaveURL(/period=7d/, { timeout: 10000 })
  })
})
