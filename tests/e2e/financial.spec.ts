import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@brightsmile.com')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
}

test.describe('Financial page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/financial')
  })

  test('shows Financial heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Financial' })).toBeVisible()
  })

  test('shows revenue KPI card', async ({ page }) => {
    await expect(page.getByText('Total Revenue')).toBeVisible({ timeout: 10000 })
  })

  test('shows Weekly Revenue chart section', async ({ page }) => {
    await expect(page.getByText('Weekly Revenue')).toBeVisible({ timeout: 10000 })
  })

  test('shows Payment Methods section', async ({ page }) => {
    await expect(page.getByText('Payment Methods')).toBeVisible()
  })

  test('shows Outstanding Invoices section', async ({ page }) => {
    await expect(page.getByText('Outstanding Invoices')).toBeVisible()
  })
})
