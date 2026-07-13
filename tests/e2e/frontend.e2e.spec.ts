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

  test('renders the shared shell (header nav + footer)', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Primary nav links are present (scoped to the header nav landmark, since the
    // same labels also appear in the footer).
    const primaryNav = page.getByRole('navigation', { name: 'Primary' })
    await expect(primaryNav.getByRole('link', { name: 'Budget Software' })).toBeVisible()
    await expect(primaryNav.getByRole('link', { name: 'Consulting' })).toBeVisible()

    // The demo CTA lives in the banner (header).
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Request a demo' }),
    ).toBeVisible()

    // Footer landmark (contentinfo) with legal links + copyright.
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
    await expect(footer.getByText('© 2026 flowlyst, Inc.')).toBeVisible()
  })

  test('mobile hamburger drawer opens, is keyboard closable, at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://localhost:3000')

    const drawer = page.locator('#site-nav-drawer')
    const openBtn = page.getByRole('button', { name: /open menu/i })

    // Closed by default on phone: burger shows, drawer is hidden.
    await expect(openBtn).toBeVisible()
    await expect(drawer).toBeHidden()

    // Opening reveals the nav links and flips aria-expanded.
    await openBtn.click()
    await expect(drawer).toBeVisible()
    const closeBtn = page.getByRole('button', { name: /close menu/i })
    await expect(closeBtn).toHaveAttribute('aria-expanded', 'true')
    await expect(drawer.getByRole('link', { name: 'Budget Software' })).toBeVisible()

    // Escape closes it (keyboard accessible).
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
