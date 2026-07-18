import { test, expect } from '@playwright/test'

/**
 * Cookie-consent banner + Corpowid (issue #22, PRD §10.3–§10.4).
 *
 * The rest of the suite seeds an accepted-consent cookie (playwright.config.ts `use`)
 * so the global banner never obscures other tests. THIS spec opts out — it resets
 * storageState to empty so every test starts with no consent cookie and the banner
 * renders, which is exactly what we need to exercise it.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const CONSENT_COOKIE = 'fl_cookie_consent'

async function consentCookie(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies()
  return cookies.find((c) => c.name === CONSENT_COOKIE)
}

test.describe('Cookie consent — first visit', () => {
  test('shows the banner when no choice is stored, and no consent cookie exists yet', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('cookie-consent')).toBeVisible()
    // The banner is a labelled region (announced to assistive tech).
    await expect(page.getByRole('region', { name: /cookie consent/i })).toBeVisible()
    // No decision persisted until the visitor acts.
    expect(await consentCookie(page), 'no consent cookie before a choice').toBeUndefined()
  })
})

test.describe('Cookie consent — persistence', () => {
  test('Accept dismisses the banner, persists accepted, and stays gone on reload', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('cookie-consent')).toBeVisible()

    await page.getByTestId('cookie-accept').click()
    await expect(page.getByTestId('cookie-consent'), 'banner unmounts on choice').toHaveCount(0)

    const cookie = await consentCookie(page)
    expect(cookie?.value, 'accepted decision persisted').toBe('accepted')

    // Proven, not assumed: a fresh load of the same context does NOT re-show the banner.
    await page.reload()
    await expect(page.getByTestId('cookie-consent'), 'banner stays gone after reload').toHaveCount(
      0,
    )
  })

  test('Decline dismisses the banner, persists declined, and stays gone on reload', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('cookie-consent')).toBeVisible()

    await page.getByTestId('cookie-decline').click()
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0)

    const cookie = await consentCookie(page)
    expect(cookie?.value, 'declined decision persisted').toBe('declined')

    await page.reload()
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0)
  })

  test('the choice carries across pages (banner absent on a second route)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('cookie-accept').click()
    await expect(page.getByTestId('cookie-consent')).toHaveCount(0)

    await page.goto('/cookies')
    await expect(
      page.getByTestId('cookie-consent'),
      'banner absent after consent on /cookies',
    ).toHaveCount(0)
  })
})

test.describe('Cookie consent — keyboard operability (WCAG 2.1.1)', () => {
  test('the Accept action is focusable and activates with the keyboard', async ({ page }) => {
    await page.goto('/')
    const accept = page.getByTestId('cookie-accept')
    await accept.focus()
    await expect(accept, 'the Accept button can receive keyboard focus').toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByTestId('cookie-consent'), 'Enter activates Accept').toHaveCount(0)
    expect((await consentCookie(page))?.value, 'keyboard Accept persists').toBe('accepted')
  })
})

test.describe('Cookie consent — layout stability (CLS-safe overlay)', () => {
  test('the banner is a fixed, bottom-anchored overlay (does not push content)', async ({
    page,
  }) => {
    await page.goto('/')
    const banner = page.getByTestId('cookie-consent')
    await expect(banner).toBeVisible()
    // A fixed, bottom:0 overlay reserves no space in flow, so its appearance shifts no
    // content — the mechanism behind CLS < 0.1 (PRD §10.2). The Lighthouse CLS number
    // itself is the ui-verifier / QE gate; this asserts the guarantee that makes it 0.
    const style = await banner.evaluate((el) => {
      const s = getComputedStyle(el)
      return { position: s.position, bottom: s.bottom }
    })
    expect(style.position, 'banner is position: fixed (overlays, does not push)').toBe('fixed')
    expect(style.bottom, 'banner is anchored to the viewport bottom').toBe('0px')
  })
})

test.describe('Corpowid accessibility widget (PRD §10.3)', () => {
  test('loads BEFORE consent (accessibility-essential), with the preserved account id', async ({
    page,
  }) => {
    await page.goto('/')
    // Banner still visible == no consent given; the a11y widget must load anyway.
    await expect(page.getByTestId('cookie-consent')).toBeVisible()
    const script = page.locator('script[src*="corpowid.com"]')
    await expect(script, 'the Corpowid embed is present in the DOM').toHaveCount(1)
    await expect(script, 'the preserved account id is carried over').toHaveAttribute(
      'data-account',
      '0dad393b-e1f0-4586-aa19-31eedcf20a06',
    )
  })
})
