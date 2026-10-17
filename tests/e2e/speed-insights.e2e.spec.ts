import { test, expect } from '@playwright/test'

test.describe('#10 Vercel Speed Insights', () => {
  for (const path of ['/privacy', '/cookies']) {
    test(`L1 ${path} names Speed Insights`, async ({ page }) => {
      await page.goto(path)
      expect(await page.getByText(/Speed Insights/).count()).toBeGreaterThanOrEqual(1)
    })
  }
})
