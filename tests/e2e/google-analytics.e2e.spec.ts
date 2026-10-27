import { test, expect, type BrowserContext, type Page } from '@playwright/test'

import { E2E_GA_ID } from '../helpers/ga'

/**
 * Google Analytics (issue #139): loads only after Accept, never on /admin, and each
 * successful lead-form submit sends one `generate_lead` carrying only the form name.
 * Google is never reached: the gtag script is stubbed and collection calls are aborted.
 */

const GTAG = 'script[src*="googletagmanager.com/gtag/js"]'

const cookieState = (value?: 'accepted' | 'declined') => ({
  cookies: value
    ? [
        {
          name: 'fl_cookie_consent',
          value,
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax' as const,
        },
      ]
    : [],
  origins: [],
})

type Seen = { gtm: string[]; collect: string[]; reached: string[] }

async function stubGoogle(context: BrowserContext): Promise<Seen> {
  const seen: Seen = { gtm: [], collect: [], reached: [] }
  context.on('requestfinished', (req) => {
    if (/google-analytics\.com|analytics\.google\.com/.test(req.url())) seen.reached.push(req.url())
  })
  await context.route('https://www.googletagmanager.com/**', (route) => {
    seen.gtm.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  })
  const abort = (route: import('@playwright/test').Route) => {
    seen.collect.push(route.request().url())
    return route.abort()
  }
  await context.route('https://*.google-analytics.com/**', abort)
  await context.route('https://*.analytics.google.com/**', abort)
  return seen
}

const dataLayer = (page: Page) =>
  page.evaluate(() => (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>)))

const hasDataLayer = (page: Page) => page.evaluate(() => window.dataLayer !== undefined)

const leadEvents = async (page: Page) =>
  (await dataLayer(page)).filter((e) => e[0] === 'event' && e[1] === 'generate_lead')

function expectNeverReachedGoogle(seen: Seen) {
  expect(seen.reached, 'no request ever completed against real Google Analytics').toEqual([])
}

test.describe('GA consent gate', () => {
  test.use({ storageState: cookieState() })

  test('G1: with no choice, nothing GA loads', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/')
    await expect(page.getByTestId('cookie-consent')).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(seen.gtm).toHaveLength(0)
    await expect(page.locator(GTAG)).toHaveCount(0)
    expect(await hasDataLayer(page)).toBe(false)
    expect(seen.collect).toHaveLength(0)
  })

  test('G2: Accept starts GA in the same page view', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/')
    await expect(page.getByTestId('cookie-consent')).toBeVisible()
    await page.evaluate(() => {
      ;(window as unknown as { __noReload: number }).__noReload = 1
    })
    await page.getByTestId('cookie-accept').click()
    const script = page.locator(GTAG)
    await expect(script).toBeAttached()
    await expect(script).toHaveAttribute('src', new RegExp(`id=${E2E_GA_ID}`))
    await expect.poll(() => seen.gtm.length).toBeGreaterThan(0)
    expect(await dataLayer(page)).toContainEqual(['config', E2E_GA_ID])
    expect(
      await page.evaluate(() => (window as unknown as { __noReload: number }).__noReload),
    ).toBe(1)
    expectNeverReachedGoogle(seen)
  })

  test('G3: Decline keeps GA off across navigation and reload', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/')
    await page.getByTestId('cookie-decline').click()
    await page.goto('/contact')
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(seen.gtm).toHaveLength(0)
    await expect(page.locator(GTAG)).toHaveCount(0)
    expect(await hasDataLayer(page)).toBe(false)
    expect(seen.collect).toHaveLength(0)
  })
})

test.describe('GA with a stored accept', () => {
  test.use({ storageState: cookieState('accepted') })

  test('G4: loads once on a fresh page and stays at one after client-side navigation', async ({
    page,
    context,
  }) => {
    const seen = await stubGoogle(context)
    await page.goto('/solutions/budget-software')
    await expect(page.locator(GTAG)).toHaveCount(1)
    await page.locator('nav a[href="/about"]').first().click()
    await expect(page).toHaveURL(/\/about$/)
    await expect(page.locator(GTAG)).toHaveCount(1)
    expectNeverReachedGoogle(seen)
  })

  test('G5: /admin is never tracked', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    expect(seen.gtm).toHaveLength(0)
    await expect(page.locator(GTAG)).toHaveCount(0)
  })

  test('G6: the server HTML carries no GA', async ({ request }) => {
    const res = await request.get('/')
    expect(res.ok()).toBe(true)
    expect(await res.text()).not.toContain('googletagmanager')
  })

  test('E1: demo submit sends one generate_lead with only form_name', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.route('**/api/demo-requests', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/request-demo')
    await page.getByLabel('Full name').fill('GA Demo')
    await page.getByLabel('Work email').fill('ga-demo@district.k12.us')
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()
    await page
      .getByTestId('demo-form')
      .getByRole('button', { name: /request demo/i })
      .click()
    await expect(page.getByTestId('demo-form-success')).toBeVisible()
    const events = await leadEvents(page)
    expect(events).toHaveLength(1)
    expect(events[0][2]).toEqual({ form_name: 'demo' })
    expectNeverReachedGoogle(seen)
  })

  test('E2: contact submit sends one generate_lead with only form_name', async ({
    page,
    context,
  }) => {
    const seen = await stubGoogle(context)
    await page.route('**/api/contact-messages', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/contact')
    await page.getByLabel('Name').fill('GA Contact')
    await page.getByLabel('Work email').fill('ga-contact@district.k12.us')
    await page.getByLabel('Message').fill('Testing analytics wiring.')
    await page.getByRole('button', { name: /send message/i }).click()
    await expect(page.getByTestId('contact-form-success')).toBeVisible()
    const events = await leadEvents(page)
    expect(events).toHaveLength(1)
    expect(events[0][2]).toEqual({ form_name: 'contact' })
    expectNeverReachedGoogle(seen)
  })

  test('E3: newsletter submit sends one generate_lead with only form_name', async ({
    page,
    context,
  }) => {
    const seen = await stubGoogle(context)
    await page.route('**/api/newsletter-subscribers/subscribe', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/blog')
    await expect(page.getByTestId('newsletter-form')).toBeVisible()
    await page.getByLabel('Email address').fill('ga-news@district.k12.us')
    await page.getByRole('button', { name: /subscribe/i }).click()
    await expect(page.getByTestId('newsletter-success')).toBeVisible()
    const events = await leadEvents(page)
    expect(events).toHaveLength(1)
    expect(events[0][2]).toEqual({ form_name: 'newsletter' })
    expectNeverReachedGoogle(seen)
  })

  test('E4: speaking submit sends one generate_lead with only form_name', async ({
    page,
    context,
  }) => {
    const seen = await stubGoogle(context)
    await page.route('**/api/speaking-requests', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/solutions/keynotes')
    await expect(page.getByTestId('keynotes-form')).toBeVisible()
    await page.getByLabel('Your name').fill('GA Speaker')
    await page.getByLabel('Work email').fill('ga-speak@district.k12.us')
    await page.getByLabel('Event name').fill('GA Summit')
    await page.getByLabel('Event date or timeframe').fill('Fall 2027')
    await page.getByRole('button', { name: /submit speaking request/i }).click()
    await expect(page.getByTestId('keynotes-form-success')).toBeVisible()
    const events = await leadEvents(page)
    expect(events).toHaveLength(1)
    expect(events[0][2]).toEqual({ form_name: 'speaking' })
    expectNeverReachedGoogle(seen)
  })

  test('E5: a failed demo submit sends no generate_lead', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.route('**/api/demo-requests', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/request-demo')
    await page.getByLabel('Full name').fill('GA Fail')
    await page.getByLabel('Work email').fill('ga-fail@district.k12.us')
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()
    await page
      .getByTestId('demo-form')
      .getByRole('button', { name: /request demo/i })
      .click()
    await expect(page.getByTestId('demo-form-error')).toBeVisible()
    expect(await leadEvents(page)).toHaveLength(0)
    expectNeverReachedGoogle(seen)
  })

  test('E6: an empty demo submit sends no generate_lead', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/request-demo')
    await page
      .getByTestId('demo-form')
      .getByRole('button', { name: /request demo/i })
      .click()
    await expect(page.getByTestId('demo-form-success')).toHaveCount(0)
    expect(await leadEvents(page)).toHaveLength(0)
    expectNeverReachedGoogle(seen)
  })

  test('L1: the cookie policy names Google Analytics and its cookies', async ({ page }) => {
    await page.goto('/cookies')
    const text = await page.locator('main').innerText()
    expect(text).toContain('Google Analytics')
    expect(text).toContain('_ga')
    expect(text).toContain('_ga_')
  })

  test('L2: the privacy policy names Google Analytics', async ({ page }) => {
    await page.goto('/privacy')
    expect(await page.locator('main').innerText()).toContain('Google Analytics')
  })
})

test.describe('GA after a decline', () => {
  test.use({ storageState: cookieState('declined') })

  test('E7: a successful demo submit sends nothing to Google', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.route('**/api/demo-requests', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/request-demo')
    await page.getByLabel('Full name').fill('GA Declined')
    await page.getByLabel('Work email').fill('ga-declined@district.k12.us')
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()
    await page
      .getByTestId('demo-form')
      .getByRole('button', { name: /request demo/i })
      .click()
    await expect(page.getByTestId('demo-form-success')).toBeVisible()
    expect(await hasDataLayer(page)).toBe(false)
    expect(seen.gtm).toHaveLength(0)
    expectNeverReachedGoogle(seen)
  })
})
