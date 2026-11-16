import { expect, type BrowserContext, type Page, type Route } from '@playwright/test'

export const E2E_GA_ID = 'G-E2ETEST000'

export const GTAG = 'script[src*="googletagmanager.com/gtag/js"]'

export const cookieState = (value?: 'accepted' | 'declined' | 'acknowledged') => ({
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

export type Seen = { gtm: string[]; collect: string[]; reached: string[] }

export async function stubGoogle(context: BrowserContext): Promise<Seen> {
  const seen: Seen = { gtm: [], collect: [], reached: [] }
  context.on('requestfinished', (req) => {
    if (/google-analytics\.com|analytics\.google\.com/.test(req.url())) seen.reached.push(req.url())
  })
  await context.route('https://www.googletagmanager.com/**', (route) => {
    seen.gtm.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  })
  const abort = (route: Route) => {
    seen.collect.push(route.request().url())
    return route.abort()
  }
  await context.route('https://*.google-analytics.com/**', abort)
  await context.route('https://*.analytics.google.com/**', abort)
  return seen
}

export const dataLayer = (page: Page) =>
  page.evaluate(() => (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>)))

export const hasDataLayer = (page: Page) => page.evaluate(() => window.dataLayer !== undefined)

export const leadEvents = async (page: Page) =>
  (await dataLayer(page)).filter((e) => e[0] === 'event' && e[1] === 'generate_lead')

export function expectNeverReachedGoogle(seen: Seen) {
  expect(seen.reached, 'no request ever completed against real Google Analytics').toEqual([])
}
