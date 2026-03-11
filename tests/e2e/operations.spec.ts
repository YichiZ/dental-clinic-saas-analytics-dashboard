import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@brightsmile.com')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
}

test.describe('Operations page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/operations')
  })

  test('shows Operations heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible()
  })

  test('shows appointment KPI cards', async ({ page }) => {
    await expect(page.getByText('Total Appointments')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Completed').first()).toBeVisible()
    await expect(page.getByText('No-Shows').first()).toBeVisible()
  })

  test('shows Appointment Volume chart', async ({ page }) => {
    await expect(page.getByText('Appointment Volume')).toBeVisible()
  })

  test('shows Utilization by Day chart', async ({ page }) => {
    await expect(page.getByText('Utilization by Day of Week')).toBeVisible()
  })

  test('shows Busiest Hours chart', async ({ page }) => {
    await expect(page.getByText('Busiest Hours')).toBeVisible()
  })
})
