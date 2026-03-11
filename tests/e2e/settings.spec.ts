import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@brightsmile.com')
  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
}

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
  })

  test('shows Settings heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('shows Clinic Information form', async ({ page }) => {
    await expect(page.getByText('Clinic Information')).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel('Clinic Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Phone')).toBeVisible()
  })

  test('shows Staff section', async ({ page }) => {
    await expect(page.getByText(/Staff/)).toBeVisible({ timeout: 10000 })
  })

  test('can update clinic name and save', async ({ page }) => {
    await page.waitForSelector('input[id="name"]', { timeout: 10000 })
    await page.getByLabel('Clinic Name').fill('BrightSmile Dental Updated')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: 5000 })
    // Restore
    await page.getByLabel('Clinic Name').fill('BrightSmile Dental')
    await page.getByRole('button', { name: /save changes/i }).click()
  })
})
