import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { E2E_BASE_URL } from '../helpers/serverURL'
import { deriveFixtureEmail } from '../helpers/seedUser'
import { collectJsonLdNodes, fetchHtml, typeMatches } from '../helpers/rawHtml'

/**
 * Proves #40's hide/show-without-redeploy contract against whatever server the suite
 * talks to: saving Site Settings through the running server's REST API must change
 * the footer icon, the /about link and the JSON-LD `sameAs` on the next visit.
 * Writes go through REST, not the Local API, so the afterChange revalidation runs in
 * the server's own request scope — a Local-API write from this process could not
 * refresh a `pnpm start` build's caches. Run against the production build for the
 * real caching path (locally `pnpm dev` is the default server).
 */

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const ADMIN = {
  email: deriveFixtureEmail({ prefix: 'social-e2e-admin' }),
  password: 'social-e2e-password-123',
  name: 'Social E2E Admin',
  role: 'admin' as const,
}
const COMPANY_URL = `https://example.com/e2e-company-${stamp}`
const FOUNDER_URL = `https://example.com/e2e-founder-${stamp}`

type Settings = { socialLinks?: Array<{ platform: string; url: string }>; founderLinkedIn?: string }

let api: APIRequestContext
let token = ''
let original: Settings = {}

async function saveSettings(data: Settings): Promise<void> {
  const res = await api.post('/api/globals/site-settings', {
    headers: { Authorization: `JWT ${token}` },
    data,
  })
  expect(res.status(), `saving Site Settings: ${await res.text()}`).toBe(200)
}

const EMPTY: Settings = { socialLinks: [], founderLinkedIn: '' }
const FILLED: Settings = {
  socialLinks: [{ platform: 'linkedin', url: COMPANY_URL }],
  founderLinkedIn: FOUNDER_URL,
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.create({ collection: 'users', data: ADMIN })

  api = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  const login = await api.post('/api/users/login', {
    data: { email: ADMIN.email, password: ADMIN.password },
  })
  expect(login.status()).toBe(200)
  token = (await login.json()).token

  const current = await api.get('/api/globals/site-settings')
  const body = await current.json()
  original = {
    socialLinks: (body.socialLinks ?? []).map((l: { platform: string; url: string }) => ({
      platform: l.platform,
      url: l.url,
    })),
    founderLinkedIn: body.founderLinkedIn ?? '',
  }
})

test.afterAll(async () => {
  if (token) await saveSettings(original)
  await api?.dispose()
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
})

function footerHtml(html: string): string {
  return html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? ''
}

function founderSectionHtml(html: string): string {
  const start = html.indexOf('data-testid="about-founder"')
  return start < 0 ? '' : html.slice(start, html.indexOf('</section>', start))
}

function footerLinkedInHref(html: string): string | null {
  const m = footerHtml(html).match(/<a\b[^>]*aria-label="[^"]*linkedin[^"]*"[^>]*>/i)
  return m?.[0].match(/href="([^"]*)"/)?.[1] ?? null
}

function founderLinkedInHref(html: string): string | null {
  const m = founderSectionHtml(html).match(/<a\b[^>]*href="([^"]*)"[^>]*>\s*LinkedIn/i)
  return m?.[1] ?? null
}

function nodeOf(html: string, type: string) {
  return collectJsonLdNodes(html).find(({ node }) => typeMatches(node, type))?.node
}

async function pollHtml(
  path: string,
  done: (html: string) => boolean,
  request: APIRequestContext,
): Promise<string> {
  let last = ''
  await expect
    .poll(
      async () => {
        last = await fetchHtml(request, path)
        return done(last)
      },
      { timeout: 30_000, message: `${path} should reflect the saved Site Settings` },
    )
    .toBe(true)
  return last
}

test('empty: no icon, no link, no sameAs; Organization has @id and a loadable logo', async ({
  request,
}) => {
  test.setTimeout(120_000)
  await saveSettings(EMPTY)

  const home = await pollHtml('/', (h) => footerHtml(h) !== '' && !footerLinkedInHref(h), request)
  expect(footerHtml(home)).not.toMatch(/linkedin/i)
  const org = nodeOf(home, 'Organization')!
  expect(String(org['@id'])).toMatch(/\/#organization$/)
  expect('sameAs' in org).toBe(false)
  const logo = await request.get(new URL(String(org.logo)).pathname)
  expect(logo.status()).toBe(200)
  expect(logo.headers()['content-type']).toMatch(/^image\//)

  const about = await pollHtml('/about', (h) => !founderLinkedInHref(h), request)
  expect(founderSectionHtml(about)).not.toMatch(/linkedin/i)
  const person = nodeOf(about, 'Person')!
  expect('sameAs' in person).toBe(false)
  expect((person.worksFor as Record<string, unknown>)['@id']).toBe(org['@id'])
})

test('filled: icon and link appear on static, ISR and dynamic pages with no redeploy', async ({
  request,
}) => {
  test.setTimeout(120_000)
  await saveSettings(FILLED)

  const home = await pollHtml('/', (h) => footerLinkedInHref(h) === COMPANY_URL, request)
  expect(footerHtml(home)).toContain('target="_blank"')
  expect(nodeOf(home, 'Organization')!.sameAs).toContain(COMPANY_URL)

  const about = await pollHtml('/about', (h) => founderLinkedInHref(h) === FOUNDER_URL, request)
  expect(nodeOf(about, 'Person')!.sameAs).toEqual([FOUNDER_URL])

  await pollHtml('/privacy', (h) => footerLinkedInHref(h) === COMPANY_URL, request)
  // /contact is dynamic: it only changes if the data-cache tag expired, not just the route cache.
  await pollHtml('/contact', (h) => footerLinkedInHref(h) === COMPANY_URL, request)
})

test('cleared again: everything disappears and sameAs is gone', async ({ request }) => {
  test.setTimeout(120_000)
  await saveSettings(EMPTY)

  for (const path of ['/', '/about', '/privacy', '/contact']) {
    const html = await pollHtml(
      path,
      (h) => !footerLinkedInHref(h) && !founderLinkedInHref(h),
      request,
    )
    expect(html, `${path} must not show the cleared URLs`).not.toContain(COMPANY_URL)
    expect(html).not.toContain(FOUNDER_URL)
  }
  const home = await fetchHtml(request, '/')
  expect('sameAs' in nodeOf(home, 'Organization')!).toBe(false)
  const about = await fetchHtml(request, '/about')
  expect('sameAs' in nodeOf(about, 'Person')!).toBe(false)
})
