import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import {
  fetchHtml,
  getTitle,
  getMetaContent,
  getMetaProperty,
  getCanonicals,
  collectJsonLdNodes,
  typeMatches,
} from '../helpers/rawHtml'
import { E2E_BASE_URL } from '../helpers/serverURL'

/**
 * /request-demo — the highest-intent lead page (issue #14, PRD §8.1 / §10, invariant d).
 *
 * The page is static except the ONE client island, DemoRequestForm, so the
 * SSR/SEO/copy assertions read the *raw* server HTML over HTTP (no browser, no JS)
 * via tests/helpers/rawHtml.ts. Raw-HTML matches use clean-ASCII fragments — React
 * escapes `&`→`&amp;` and renders curly apostrophes / em-dashes / middots as literal
 * UTF-8, so we match around them.
 *
 * The form's delivery path is PROVEN: a browser fills + submits, then a separate
 * ADMIN-authenticated REST context reads the row back and asserts the persisted
 * values. The relaxed contract (phone / date CLIENT-OPTIONAL; hard-required set is
 * fullName / workEmail / consent) is covered, plus consent gating, interests /
 * heardAboutUs round-trip, the failed-POST error path (banner renders + values
 * preserved), server-side enforcement, and a11y. Modelled on keynotes.e2e.spec.ts.
 */

const PATH = '/request-demo'

// --------------------------- dedicated admin --------------------------------

// Own admin identity for this file — NOT the shared seedTestUser (admin.e2e seeds
// that one); Playwright runs spec files in parallel and a shared record races.
const DEMO_ADMIN = {
  email: `demo-e2e-admin-${Date.now()}@flowlyst.test`,
  password: 'demo-e2e-password-123',
  name: 'Request-Demo E2E Admin',
  role: 'admin' as const,
}

async function seedDemoAdmin(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: DEMO_ADMIN.email } } })
  await payload.create({ collection: 'users', data: DEMO_ADMIN })
}

async function cleanupDemoAdmin(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: DEMO_ADMIN.email } } })
}

/**
 * A fresh APIRequestContext authenticated as the dedicated Admin, via the Payload
 * REST login endpoint, with the JWT attached as an explicit `Authorization: JWT`
 * header (more reliable across contexts than cookie-jar propagation). Kept separate
 * from the anonymous `request` fixture. Caller disposes.
 */
async function adminContext(): Promise<APIRequestContext> {
  const loginCtx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  const res = await loginCtx.post('/api/users/login', {
    data: { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password },
  })
  expect(res.ok(), 'admin REST login must succeed').toBeTruthy()
  const { token } = (await res.json()) as { token?: string }
  expect(token, 'login must return a JWT').toBeTruthy()
  await loginCtx.dispose()
  return apiRequest.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: { Authorization: `JWT ${token}` },
  })
}

const whereEmail = (email: string): string =>
  `/api/demo-requests?where[workEmail][equals]=${encodeURIComponent(email)}&depth=0`

const submitButton = (page: import('@playwright/test').Page) =>
  page.getByTestId('demo-form').getByRole('button', { name: /request demo/i })

test.beforeAll(async () => {
  test.setTimeout(120_000)
  await seedDemoAdmin()
  // Warm the route so a cold dev-server compile doesn't blow a per-test timeout.
  const ctx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  try {
    await ctx.get(PATH, { timeout: 120_000 })
  } finally {
    await ctx.dispose()
  }
})

test.afterAll(async () => {
  await cleanupDemoAdmin()
})

// ------------------------------- SEO metadata -------------------------------

test.describe('Request-demo page — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, demo-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!, 'title names the page subject').toMatch(/demo/i)
    expect(title!, 'title is flowlyst-branded').toMatch(/flowlyst/i)
  })

  test('has a non-empty <meta description> distinct from the title', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const description = getMetaContent(html, 'description')
    const title = getTitle(html)
    expect(description, '<meta name="description"> must be present').toBeTruthy()
    expect(description!.length, 'description is a usable length').toBeGreaterThanOrEqual(50)
    expect(description, 'description and title serve different roles').not.toBe(title)
    expect(description!, 'description is on-topic').toMatch(/demo|walkthrough/i)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    const [homeHtml, demoHtml] = [await fetchHtml(request, '/'), await fetchHtml(request, PATH)]
    expect(getTitle(demoHtml), 'demo title differs from homepage').not.toBe(getTitle(homeHtml))
    expect(
      getMetaContent(demoHtml, 'description'),
      'demo description differs from homepage',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the request-demo path', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    expect(canonical, 'canonical must be absolute').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(canonical).pathname, 'canonical path is the request-demo path').toBe(PATH)
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(getMetaProperty(html, 'og:title'), 'og:title present').toBeTruthy()
    expect(getMetaProperty(html, 'og:description'), 'og:description present').toBeTruthy()
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogUrl, 'og:url present').toBeTruthy()
    expect(new URL(ogUrl!).pathname, 'og:url points at the request-demo path').toBe(PATH)
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('Request-demo page — JSON-LD', () => {
  test('the site-wide Organization node parses (no Service on a form page)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html) // throws on malformed JSON → asserts every block parses
    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'an Organization node must be present (from the layout)').toBeTruthy()
    expect(typeof org!.node.name, 'Organization.name is a string').toBe('string')
    expect(org!.node.url as string, 'Organization.url is absolute').toMatch(/^https?:\/\/[^/]+/i)
  })
})

// --------------------------- Server-rendered content ------------------------

test.describe('Request-demo page — server-rendered content (raw HTML, no JS)', () => {
  test('the proof column (eyebrow, H1, lead, bullets, response note) is server-rendered', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'eyebrow').toContain('30-minute walkthrough')
    expect(html, 'H1 fragment').toContain('See flowlyst on')
    expect(html, 'lead fragment').toContain('Personalized, not a generic vendor demo')
    for (const bullet of [
      'we open the product and show you',
      'Tailored to your district size and priorities',
      'Aziz or a senior consultant on the call',
      '1-week typical implementation',
    ]) {
      expect(html, `bullet "${bullet}"`).toContain(bullet)
    }
    expect(html, 'response note eyebrow').toContain('Average response')
    expect(html, 'response note body').toContain('Same business day')
  })

  test('the form island server-renders its labels and controls (crawlable)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // 'use client' components still SSR their initial markup — labels are crawlable.
    for (const label of ['Full name', 'Work email', 'multi-select', 'I agree to flowlyst']) {
      expect(html, `form text "${label}" in server HTML`).toContain(label)
    }
    // Submit label ("Request demo") is distinct from the nav CTA ("Request a demo").
    expect(html, 'submit button label').toContain('Request demo')
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1>').toBe(1)
  })
})

// ------------------- Lead capture: form delivery path (invariant d) ---------

test.describe('Request-demo form — delivery path (invariant d)', () => {
  test('a valid submission WITHOUT phone/date persists and is admin-readable (relaxed contract)', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const stamp = Date.now()
    const fullName = `E2E Demo ${stamp}`
    const workEmail = `demo-ok-${stamp}@district.k12.us`

    await page.goto(PATH)
    await expect(page.getByTestId('demo-form'), 'the form island hydrates').toBeVisible()

    // ONLY the hard-required set — no phone, no date (the relaxed contract).
    await page.getByLabel('Full name').fill(fullName)
    await page.getByLabel('Work email').fill(workEmail)
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()

    // The honeypot stays empty when only visible fields are filled.
    await expect(page.locator('input[name="botField"]')).toHaveValue('')

    await submitButton(page).click()

    const success = page.getByTestId('demo-form-success')
    await expect(success).toBeVisible()
    await expect(success).toContainText(/Request received/i)

    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEmail(workEmail))
      expect(readRes.status(), 'admin read returns 200').toBe(200)
      const body = (await readRes.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'exactly one persisted row').toBe(1)
      const doc = body.docs[0]
      expect(doc.fullName).toBe(fullName)
      expect(doc.workEmail).toBe(workEmail)
      expect(doc.consent, 'consent persisted true').toBe(true)
      expect(doc.status, 'status defaults to pending').toBe('pending')
      // The relaxed contract: omitted phone/date persist empty, not blocked.
      expect(doc.phone ?? '', 'phone omitted').toBeFalsy()
      expect(doc.datePreference ?? '', 'date omitted').toBeFalsy()
      expect(doc.botField ?? '', 'honeypot empty').toBeFalsy()
      await ctx.delete(`/api/demo-requests/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('interests multi-select and heardAboutUs round-trip to storage', async ({ page }) => {
    test.setTimeout(90_000)
    const stamp = Date.now()
    const workEmail = `demo-interests-${stamp}@district.k12.us`

    await page.goto(PATH)
    await page.getByLabel('Full name').fill(`Interested Org ${stamp}`)
    await page.getByLabel('Work email').fill(workEmail)
    await page.getByRole('checkbox', { name: 'Budget Software' }).check()
    await page.getByRole('checkbox', { name: 'Keynotes' }).check()
    await page.getByLabel('How did you hear?').selectOption('ai-assistant')
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()

    await submitButton(page).click()
    await expect(page.getByTestId('demo-form-success')).toBeVisible()

    const ctx = await adminContext()
    try {
      const body = (await (await ctx.get(whereEmail(workEmail))).json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs).toBe(1)
      const doc = body.docs[0]
      expect(doc.interests, 'chosen interests round-trip (incl. keynotes)').toEqual(
        expect.arrayContaining(['budget-software', 'keynotes']),
      )
      expect(doc.heardAboutUs, 'heardAboutUs mapping persists').toBe('ai-assistant')
      await ctx.delete(`/api/demo-requests/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('consent unchecked blocks client-side: error + focus + NO API call', async ({ page }) => {
    await page.goto(PATH)
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/demo-requests')) posts.push(req.url())
    })

    // Everything else valid; only consent left unchecked.
    await page.getByLabel('Full name').fill('Consent Missing')
    await page.getByLabel('Work email').fill(`demo-noconsent-${Date.now()}@district.k12.us`)
    await submitButton(page).click()

    const consent = page.getByRole('checkbox', { name: /I agree to flowlyst/i })
    await expect(consent, 'consent is flagged invalid').toHaveAttribute('aria-invalid', 'true')
    const describedby = await consent.getAttribute('aria-describedby')
    expect(describedby, 'consent wires aria-describedby to its error').toBeTruthy()
    await expect(page.locator(`[id="${describedby}"]`)).toHaveText(/agree to be contacted/i)
    // Focus lands on the first invalid field in order — here that is consent.
    await expect(consent, 'focus moves to the consent checkbox').toBeFocused()
    await expect(page.getByTestId('demo-form-success')).toHaveCount(0)
    expect(posts, 'no POST fired → no doc created').toHaveLength(0)
  })

  test('empty submit: required errors, focus on the first field, NO API call', async ({ page }) => {
    await page.goto(PATH)
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/demo-requests')) posts.push(req.url())
    })

    await submitButton(page).click()

    // Focus jumps to the first invalid field (fullName).
    await expect(
      page.getByLabel('Full name'),
      'focus moves to the first invalid field',
    ).toBeFocused()
    for (const label of ['Full name', 'Work email']) {
      await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true')
    }
    await expect(page.getByRole('checkbox', { name: /I agree to flowlyst/i })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByTestId('demo-form-success')).toHaveCount(0)
    expect(posts, 'client validation blocked the POST').toHaveLength(0)
  })

  test('a malformed email is rejected client-side (focus + no API call)', async ({ page }) => {
    await page.goto(PATH)
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/demo-requests')) posts.push(req.url())
    })

    await page.getByLabel('Full name').fill('Bad Email')
    await page.getByLabel('Work email').fill('not-an-email')
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()
    await submitButton(page).click()

    const email = page.getByLabel('Work email')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedby = await email.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedby}"]`)).toHaveText(/valid email/i)
    await expect(email, 'focus moves to the offending email field').toBeFocused()
    await expect(page.getByTestId('demo-form-success')).toHaveCount(0)
    expect(posts, 'a bad email never reaches the API').toHaveLength(0)
  })

  test('a failed POST (500) shows the error banner AND preserves the entered values', async ({
    page,
  }) => {
    // The reviewer's carried-over hardening item: prove the failed-delivery path.
    await page.goto(PATH)
    await page.route('**/api/demo-requests', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ errors: [{ message: 'boom' }] }),
          })
        : route.continue(),
    )

    const fullName = 'Preserve Me'
    const workEmail = `demo-preserve-${Date.now()}@district.k12.us`
    await page.getByLabel('Full name').fill(fullName)
    await page.getByLabel('Work email').fill(workEmail)
    await page.getByRole('checkbox', { name: 'Keynotes' }).check()
    await page.getByRole('checkbox', { name: /I agree to flowlyst/i }).check()

    await submitButton(page).click()

    // The role=alert error banner renders (the POST resolved !ok, no field errors).
    const banner = page.getByTestId('demo-form-error')
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute('role', 'alert')
    await expect(banner).toContainText(/something went wrong/i)

    // Values are PRESERVED (form only resets on success) — the lead isn't lost.
    await expect(page.getByLabel('Full name')).toHaveValue(fullName)
    await expect(page.getByLabel('Work email')).toHaveValue(workEmail)
    await expect(page.getByRole('checkbox', { name: 'Keynotes' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /I agree to flowlyst/i })).toBeChecked()
    await expect(page.getByTestId('demo-form-success')).toHaveCount(0)
  })

  test('the honeypot is hidden, out of the tab order, and autofill-proof', async ({ page }) => {
    await page.goto(PATH)
    const honeypot = page.locator('input[name="botField"]')
    await expect(honeypot).toHaveCount(1)
    await expect(honeypot).toHaveAttribute('tabindex', '-1')
    await expect(honeypot).toHaveAttribute('autocomplete', 'off')
    await expect(
      page.locator('[aria-hidden="true"] input[name="botField"]'),
      'honeypot is inside an aria-hidden container',
    ).toHaveCount(1)
    // Not actually visible: the wrapper is a 1x1 clip box. Check the wrapper's
    // bounding box (<=1px), NOT isVisible() — Playwright false-positives on this pattern.
    const wrapper = page.locator('div[aria-hidden="true"]', {
      has: page.locator('input[name="botField"]'),
    })
    const box = await wrapper.boundingBox()
    expect(box, 'the honeypot wrapper has a layout box').not.toBeNull()
    expect(box!.width, 'wrapper collapses to <=1px wide').toBeLessThanOrEqual(1)
    expect(box!.height, 'wrapper collapses to <=1px tall').toBeLessThanOrEqual(1)
  })
})

// ------------------- Lead capture: server-side enforcement ------------------

test.describe('Request-demo API — server-side enforcement (request level)', () => {
  test('consent forced false is rejected 400 and persists nothing', async ({ request }) => {
    const workEmail = `demo-consentfalse-${Date.now()}@district.k12.us`
    const res = await request.post('/api/demo-requests', {
      data: { fullName: 'No Consent', workEmail, consent: false },
    })
    expect(res.status(), 'server rejects consent:false with 400').toBe(400)

    const ctx = await adminContext()
    try {
      const body = (await (await ctx.get(whereEmail(workEmail))).json()) as { totalDocs: number }
      expect(body.totalDocs, 'a consent-rejected create persists nothing').toBe(0)
    } finally {
      await ctx.dispose()
    }
  })

  test('a honeypot-tripped submission is rejected 400 and persists nothing', async ({
    request,
  }) => {
    const workEmail = `demo-hp-${Date.now()}@district.k12.us`
    const res = await request.post('/api/demo-requests', {
      data: { fullName: 'Bot', workEmail, consent: true, botField: 'i am a bot' },
    })
    expect(res.status(), 'server rejects a honeypot-tripped create with 400').toBe(400)

    const ctx = await adminContext()
    try {
      const body = (await (await ctx.get(whereEmail(workEmail))).json()) as { totalDocs: number }
      expect(body.totalDocs, 'honeypot submission persists nothing').toBe(0)
    } finally {
      await ctx.dispose()
    }
  })

  test('anonymous read of the demo-requests inbox is forbidden (PII)', async ({ request }) => {
    const res = await request.get('/api/demo-requests')
    expect(res.status(), 'anon read denied — PII is admin-only').toBe(403)
    const text = await res.text()
    expect(text, 'no lead PII in a forbidden response').not.toMatch(/@district\.k12\.us/)
  })
})

// ------------------------- Responsive / accessibility -----------------------

test.describe('Request-demo page — responsive & accessibility smoke', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'no horizontal overflow at 390px').toBeLessThanOrEqual(390)
  })

  test('at 768px width there is no horizontal overflow and the burger is the nav control', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(PATH)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'scrollWidth equals the 768px viewport').toBe(768)
    await expect(page.locator('.nav__burger')).toBeVisible()
    await expect(page.locator('.nav__links a').first()).toBeHidden()
  })

  test('has exactly one H1 and non-skipping heading levels', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('h1')).toHaveCount(1)
    const levels = await page.$$eval('#main-content :is(h1,h2,h3,h4,h5,h6)', (els) =>
      els.map((el) => Number(el.tagName.slice(1))),
    )
    expect(levels.length, 'main has headings').toBeGreaterThan(0)
    expect(levels[0], 'the first heading in main is the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], 'heading levels never skip down').toBeLessThanOrEqual(1)
    }
  })

  test('every <img> carries an alt attribute', async ({ page }) => {
    await page.goto(PATH)
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      expect(await imgs.nth(i).getAttribute('alt'), `img[${i}] has an alt attribute`).not.toBeNull()
    }
  })

  test('the interests multi-select is a labeled group of reachable checkboxes', async ({
    page,
  }) => {
    await page.goto(PATH)
    // role=group with an accessible name (aria-labelledby → "Interests · multi-select").
    const group = page.getByRole('group', { name: /Interests/i })
    await expect(group, 'the interests group has an accessible name').toBeVisible()
    for (const name of ['AI Training', 'Budget Software', 'Consulting', 'Keynotes']) {
      await expect(
        page.getByRole('checkbox', { name }),
        `interest "${name}" is a reachable checkbox`,
      ).toBeVisible()
    }
  })

  test('the consent checkbox is labeled, required, and keyboard-reachable', async ({ page }) => {
    await page.goto(PATH)
    const consent = page.getByRole('checkbox', { name: /I agree to flowlyst/i })
    await expect(consent).toBeVisible()
    await expect(consent, 'consent is marked required for AT').toHaveAttribute(
      'aria-required',
      'true',
    )
    await consent.focus()
    await expect(consent).toBeFocused()
  })

  test('the submit button is labeled and keyboard-reachable', async ({ page }) => {
    await page.goto(PATH)
    const submit = submitButton(page)
    await expect(submit).toBeVisible()
    await submit.focus()
    await expect(submit).toBeFocused()
  })
})
