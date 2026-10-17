import { test, expect } from '@playwright/test'

const speedInsightsScripts = 'script[data-sdkn^="@vercel/speed-insights"]'

test.describe('#10 Vercel Speed Insights', () => {
  for (const path of ['/privacy', '/cookies']) {
    test(`L1 ${path} names Speed Insights`, async ({ page }) => {
      await page.goto(path)
      expect(await page.getByText(/Speed Insights/).count()).toBeGreaterThanOrEqual(1)
    })
  }

  for (const path of ['/', '/solutions/budget-software']) {
    test(`S1 Speed Insights script is injected on ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator(speedInsightsScripts).first()).toBeAttached()
      expect(await page.locator(speedInsightsScripts).count()).toBeGreaterThanOrEqual(1)
    })
  }

  test('S2 exactly one Speed Insights script on /', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(speedInsightsScripts).first()).toBeAttached()
    await expect(page.locator(speedInsightsScripts)).toHaveCount(1)
  })
})
