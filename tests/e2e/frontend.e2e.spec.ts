import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('homepage responds 200 and renders the placeholder', async ({ page }) => {
    const response = await page.goto('http://localhost:3000')

    // Server-rendered page must return a 200.
    expect(response?.status()).toBe(200)

    // Title comes from the frontend layout metadata.
    await expect(page).toHaveTitle(/flowlyst/i)

    // The single H1 renders the placeholder headline.
    const heading = page.locator('h1').first()
    await expect(heading).toHaveText(/The flowlyst site is being rebuilt\./)
  })
})
