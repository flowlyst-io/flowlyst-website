import { test, expect, type BrowserContext, type Page } from '@playwright/test'

import {
  E2E_GA_ID,
  GTAG,
  cookieState,
  dataLayer,
  expectNeverReachedGoogle,
  hasDataLayer,
  leadEvents,
  stubGoogle,
} from '../helpers/ga'

/**
 * Regional consent (issue #161). The region comes from the real proxy, driven by the
 * `x-vercel-ip-country` header; GPC is a stubbed `navigator.globalPrivacyControl`.
 * Google is always stubbed and never reached.
 */

const US = { 'x-vercel-ip-country': 'US' }
const DE = { 'x-vercel-ip-country': 'DE' }

const OPT_OUT_TEXT =
  'We use Google Analytics cookies to understand how the site is used. You can opt out at any time. Read our cookie policy.'
const OPT_IN_TEXT =
  'We use essential cookies, including one that remembers this choice. If you accept, we also use Google Analytics cookies to understand how the site is used. Read our cookie policy.'
const GPC_TEXT =
  "Your browser sends a Global Privacy Control signal, so we don't use analytics cookies. Read our cookie policy."

const banner = (page: Page) => page.getByTestId('cookie-consent')

async function sendGpc(context: BrowserContext) {
  await context.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {
      get: () => true,
      configurable: true,
    }),
  )
}

async function seedGaCookies(context: BrowserContext) {
  const base = { domain: 'localhost', path: '/', expires: -1 }
  await context.addCookies([
    { ...base, name: '_ga', value: 'GA1.1.111.222' },
    { ...base, name: `_ga_${E2E_GA_ID.slice(2)}`, value: 'GS2.1.s1' },
  ])
}

async function cookieNames(context: BrowserContext) {
  return (await context.cookies()).map((c) => c.name)
}

async function consentValue(context: BrowserContext) {
  return (await context.cookies()).find((c) => c.name === 'fl_cookie_consent')?.value
}

const disableFlag = (page: Page) =>
  page.evaluate(
    (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
    E2E_GA_ID,
  )

async function submitContact(page: Page) {
  await page.route('**/api/contact-messages', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
  )
  await page.getByLabel('Name').fill('Region Contact')
  await page.getByLabel('Work email').fill('region@district.k12.us')
  await page.getByLabel('Message').fill('Testing regional analytics.')
  await page.getByRole('button', { name: /send message/i }).click()
  await expect(page.getByTestId('contact-form-success')).toBeVisible()
}

test.describe('US visitor, no choice yet', () => {
  test.use({ storageState: cookieState(), extraHTTPHeaders: US })

  test('R1: shows the opt-out banner with Got it and Opt out', async ({ page, context }) => {
    await stubGoogle(context)
    await page.goto('/')
    await expect(banner(page)).toBeVisible()
    await expect(banner(page)).toHaveAttribute('data-variant', 'opt-out')
    await expect(banner(page).locator('p')).toHaveText(OPT_OUT_TEXT)
    await expect(page.getByTestId('cookie-got-it')).toHaveText('Got it')
    await expect(page.getByTestId('cookie-opt-out')).toHaveText('Opt out')
    await expect(page.getByTestId('cookie-accept')).toHaveCount(0)
    await expect(page.getByTestId('cookie-decline')).toHaveCount(0)
    await expect(banner(page).getByRole('link', { name: 'cookie policy' })).toHaveAttribute(
      'href',
      '/cookies',
    )
  })

  test('R2: GA loads on the first page with no click', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/')
    const script = page.locator(GTAG)
    await expect(script).toBeAttached()
    await expect(script).toHaveAttribute('src', new RegExp(`id=${E2E_GA_ID}`))
    expect(await dataLayer(page)).toContainEqual(['config', E2E_GA_ID])
    expect(await consentValue(context)).toBeUndefined()
    expectNeverReachedGoogle(seen)
  })

  test('R3: Got it stores acknowledged, hides the banner and keeps counting', async ({
    page,
    context,
  }) => {
    await stubGoogle(context)
    await page.goto('/')
    await page.getByTestId('cookie-got-it').click()
    await expect(banner(page)).toHaveCount(0)
    expect(await consentValue(context)).toBe('acknowledged')
    await page.reload()
    await expect(banner(page)).toHaveCount(0)
    await expect(page.locator(GTAG)).toHaveCount(1)
  })

  test('R4: Opt out stops GA in the same page view and deletes its cookies', async ({
    page,
    context,
  }) => {
    const seen = await stubGoogle(context)
    await seedGaCookies(context)
    await page.goto('/')
    await expect(page.locator(GTAG)).toBeAttached()
    await page.getByTestId('cookie-opt-out').click()
    await expect(banner(page)).toHaveCount(0)
    expect(await disableFlag(page)).toBe(true)
    const names = await cookieNames(context)
    expect(names).not.toContain('_ga')
    expect(names).not.toContain(`_ga_${E2E_GA_ID.slice(2)}`)
    expect(await consentValue(context)).toBe('declined')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator(GTAG)).toHaveCount(0)
    expect(await hasDataLayer(page)).toBe(false)
    expectNeverReachedGoogle(seen)
  })

  test('R5: a lead sent after Opt out is not tracked', async ({ page, context }) => {
    await stubGoogle(context)
    await page.goto('/contact')
    await expect(page.locator(GTAG)).toBeAttached()
    await page.getByTestId('cookie-opt-out').click()
    await submitContact(page)
    expect(await leadEvents(page)).toHaveLength(0)
  })

  test('R18: the banner is a fixed bottom overlay', async ({ page, context }) => {
    await stubGoogle(context)
    await page.goto('/')
    await expect(banner(page)).toBeVisible()
    await expect(banner(page)).toHaveCSS('position', 'fixed')
    await expect(banner(page)).toHaveCSS('bottom', '0px')
  })
})

test.describe('US visitor, lead without ever touching the banner', () => {
  test.use({
    storageState: cookieState(),
    extraHTTPHeaders: US,
    viewport: { width: 1280, height: 2000 },
  })

  test('R6: a counted US visitor who has not chosen yet still sends generate_lead', async ({
    page,
    context,
  }) => {
    await stubGoogle(context)
    await page.goto('/contact')
    await expect(banner(page)).toBeVisible()
    await submitContact(page)
    const events = await leadEvents(page)
    expect(events).toHaveLength(1)
    expect(events[0][2]).toEqual({ form_name: 'contact' })
  })
})

test.describe('EU visitor, no choice yet', () => {
  test.use({ storageState: cookieState(), extraHTTPHeaders: DE })

  test('R7: Accept-first banner, nothing GA loads', async ({ page, context }) => {
    const seen = await stubGoogle(context)
    await page.goto('/')
    await expect(banner(page)).toBeVisible()
    await expect(banner(page)).toHaveAttribute('data-variant', 'opt-in')
    await expect(banner(page).locator('p')).toHaveText(OPT_IN_TEXT)
    await page.waitForLoadState('networkidle')
    expect(seen.gtm).toHaveLength(0)
    await expect(page.locator(GTAG)).toHaveCount(0)
    expect(await hasDataLayer(page)).toBe(false)
  })
})

test.describe('GPC visitors', () => {
  test.beforeEach(async ({ context }) => sendGpc(context))

  test.describe('US, no choice', () => {
    test.use({ storageState: cookieState(), extraHTTPHeaders: US })

    test('R8: not counted and no banner', async ({ page, context }) => {
      const seen = await stubGoogle(context)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(banner(page)).toHaveCount(0)
      await expect(page.locator(GTAG)).toHaveCount(0)
      expect(await hasDataLayer(page)).toBe(false)
      expect(seen.gtm).toHaveLength(0)
    })

    test('R19: leftover _ga cookies are removed on load with no click', async ({
      page,
      context,
    }) => {
      await stubGoogle(context)
      await seedGaCookies(context)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect.poll(() => cookieNames(context)).not.toContain('_ga')
      expect(await cookieNames(context)).not.toContain(`_ga_${E2E_GA_ID.slice(2)}`)
    })
  })

  test.describe('DE, no choice', () => {
    test.use({ storageState: cookieState(), extraHTTPHeaders: DE })

    test('R9: not counted and no banner', async ({ page, context }) => {
      const seen = await stubGoogle(context)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(banner(page)).toHaveCount(0)
      await expect(page.locator(GTAG)).toHaveCount(0)
      expect(await hasDataLayer(page)).toBe(false)
      expect(seen.gtm).toHaveLength(0)
    })
  })

  for (const [region, headers] of [
    ['US', US],
    ['DE', DE],
  ] as const) {
    test.describe(`${region}, stored accepted`, () => {
      test.use({ storageState: cookieState('accepted'), extraHTTPHeaders: headers })

      test(`R10: GPC beats a stored accept (${region}): no GA, no hit`, async ({
        page,
        context,
      }) => {
        const seen = await stubGoogle(context)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await expect(page.locator(GTAG)).toHaveCount(0)
        expect(await hasDataLayer(page)).toBe(false)
        expect(seen.gtm).toHaveLength(0)
        expect(seen.collect).toHaveLength(0)
      })
    })
  }

  test.describe('US, stored declined, Cookie settings', () => {
    test.use({ storageState: cookieState('declined'), extraHTTPHeaders: US })

    test('R15: opens the GPC note with only Close, stores nothing, returns focus', async ({
      page,
      context,
    }) => {
      const seen = await stubGoogle(context)
      await page.goto('/')
      await page.getByTestId('cookie-settings').click()
      await expect(banner(page)).toBeVisible()
      await expect(banner(page)).toHaveAttribute('data-variant', 'gpc')
      await expect(banner(page).locator('p')).toHaveText(GPC_TEXT)
      await expect(banner(page).getByRole('button')).toHaveCount(1)
      await expect(page.getByTestId('cookie-gpc-close')).toHaveText('Close')
      await expect(page.getByTestId('cookie-gpc-close')).toBeFocused()
      expect(await consentValue(context)).toBe('declined')
      await page.keyboard.press('Enter')
      await expect(banner(page)).toHaveCount(0)
      await expect(page.getByTestId('cookie-settings')).toBeFocused()
      expect(await consentValue(context)).toBe('declined')
      await expect(page.locator(GTAG)).toHaveCount(0)
      expect(seen.gtm).toHaveLength(0)
    })
  })
})

test.describe('US visitor with a stored choice', () => {
  test.use({ extraHTTPHeaders: US })

  test.describe('declined', () => {
    test.use({ storageState: cookieState('declined') })

    test('R11: no banner and no GA', async ({ page, context }) => {
      const seen = await stubGoogle(context)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(banner(page)).toHaveCount(0)
      await expect(page.locator(GTAG)).toHaveCount(0)
      expect(await hasDataLayer(page)).toBe(false)
      expect(seen.gtm).toHaveLength(0)
    })

    test('R13: Cookie settings reopens the opt-out banner by keyboard; Got it counts again', async ({
      page,
      context,
    }) => {
      await stubGoogle(context)
      await page.goto('/')
      await page.getByTestId('cookie-settings').focus()
      await page.keyboard.press('Enter')
      await expect(banner(page)).toBeVisible()
      await expect(banner(page)).toHaveAttribute('data-variant', 'opt-out')
      await expect(page.getByTestId('cookie-got-it')).toBeFocused()
      expect(await consentValue(context)).toBe('declined')
      await expect(page.locator(GTAG)).toHaveCount(0)
      await page.keyboard.press('Enter')
      expect(await consentValue(context)).toBe('acknowledged')
      await expect(page.locator(GTAG)).toBeAttached()
      await expect(page.getByTestId('cookie-settings')).toBeFocused()
      await expect(banner(page)).toHaveCount(0)
    })
  })

  test.describe('accepted', () => {
    test.use({ storageState: cookieState('accepted') })

    test('R12: no banner, GA loads once', async ({ page, context }) => {
      await stubGoogle(context)
      await page.goto('/')
      await expect(banner(page)).toHaveCount(0)
      await expect(page.locator(GTAG)).toHaveCount(1)
    })
  })
})

test.describe('EU visitor, stored accepted', () => {
  test.use({ storageState: cookieState('accepted'), extraHTTPHeaders: DE })

  test('R14: Cookie settings reopens Accept/Decline; Decline stops GA and deletes cookies', async ({
    page,
    context,
  }) => {
    await stubGoogle(context)
    await seedGaCookies(context)
    await page.goto('/')
    await expect(page.locator(GTAG)).toBeAttached()
    await page.getByTestId('cookie-settings').click()
    await expect(banner(page)).toHaveAttribute('data-variant', 'opt-in')
    await page.getByTestId('cookie-decline').click()
    expect(await disableFlag(page)).toBe(true)
    const names = await cookieNames(context)
    expect(names).not.toContain('_ga')
    expect(names).not.toContain(`_ga_${E2E_GA_ID.slice(2)}`)
    expect(await consentValue(context)).toBe('declined')
  })
})

test.describe('server HTML and proxy scope', () => {
  test.use({ storageState: cookieState() })

  test('R16: the home page HTML has no banner and no GA for either region, and the same shape', async ({
    request,
  }) => {
    const [us, de] = await Promise.all([
      request.get('/', { headers: US }),
      request.get('/', { headers: DE }),
    ])
    const [usBody, deBody] = [await us.text(), await de.text()]
    for (const body of [usBody, deBody]) {
      expect(body).not.toContain('cookie-consent')
      expect(body).not.toContain('googletagmanager')
      expect(body).toContain('Cookie settings')
    }
    // Inline scripts carry a per-request token in dev, so only the markup is compared.
    const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '')
    expect(markup(usBody)).toBe(markup(deBody))
  })

  test('R17: the proxy sets the region cookie on pages only', async ({ playwright, baseURL }) => {
    const regionCookie = (res: { headersArray: () => { name: string; value: string }[] }) =>
      res
        .headersArray()
        .filter((h) => h.name.toLowerCase() === 'set-cookie')
        .map((h) => h.value)
        .filter((v) => v.includes('fl_consent_region'))

    // A fresh context per call: a shared cookie jar would send the region cookie back and
    // the proxy would rightly not set it again.
    const get = async (path: string, maxRedirects?: number) => {
      const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: US })
      const res = await ctx.get(path, { maxRedirects })
      const cookies = regionCookie(res)
      await ctx.dispose()
      return cookies
    }

    for (const path of ['/', '/about', '/cookies']) {
      expect((await get(path)).join(), path).toContain('fl_consent_region=opt-out')
    }
    for (const path of [
      '/admin',
      '/api/users/me',
      '/card/nonexistent',
      '/go/nonexistent',
      '/robots.txt',
      '/sitemap.xml',
    ]) {
      expect(await get(path, 0), path).toEqual([])
    }
  })
})
