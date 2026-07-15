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
 * Keynotes solution page (issue #13, PRD §4.4 / §7 / §8 / §10).
 *
 * The page is static except the ONE client island — SpeakingRequestForm — so the
 * SSR/SEO/JSON-LD/copy assertions read the *raw* server HTML over HTTP (no browser,
 * no JS) via tests/helpers/rawHtml.ts: if a string only appears after hydration
 * these fail, which is the PRD §10.1 requirement that public pages are crawlable
 * server-side (review invariant a). Raw-HTML matches use clean-ASCII fragments —
 * React escapes `&`→`&amp;` and renders curly apostrophes / en-dashes as literal
 * UTF-8, so we match around them.
 *
 * The speaking-request form is invariant (d) — lead capture is sacred — so its
 * delivery path is PROVEN, not assumed: a browser fills + submits the form, then a
 * separate ADMIN-authenticated REST context reads the row back and asserts the
 * submitted values persisted with the default `status: pending`. Client validation
 * and server-side enforcement (honeypot, field-level injection, anon PII read) are
 * covered too. Structural/a11y checks mirror budget.e2e.spec.ts.
 */

const PATH = '/solutions/keynotes'

// --------------------------- dedicated admin --------------------------------

// Own admin identity for this file — deliberately NOT the shared seedTestUser
// (dev-e2e-<hash>@payloadcms.com, derived per checkout+port) that admin.e2e.spec.ts
// seeds/cleans, because Playwright runs
// spec files in parallel: sharing that record races (one file's afterAll deletes the
// user mid-login for the other). A per-run stamped email keeps the two isolated.
const KN_ADMIN = {
  email: `kn-e2e-admin-${Date.now()}@flowlyst.test`,
  password: 'kn-e2e-password-123',
  name: 'Keynotes E2E Admin',
  role: 'admin' as const,
}

async function seedKeynotesAdmin(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: KN_ADMIN.email } } })
  await payload.create({ collection: 'users', data: KN_ADMIN })
}

async function cleanupKeynotesAdmin(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: KN_ADMIN.email } } })
}

/**
 * A fresh APIRequestContext authenticated as the dedicated Admin. We log in via the
 * Payload REST endpoint to obtain the JWT, then attach it as an explicit
 * `Authorization: JWT <token>` header on the returned context — Payload's default
 * auth strategy honors that header, which is more reliable across contexts than
 * depending on cookie-jar propagation. Kept separate from the built-in (anonymous)
 * `request` fixture so the two never mix. Caller disposes.
 */
async function adminContext(): Promise<APIRequestContext> {
  const loginCtx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  const res = await loginCtx.post('/api/users/login', {
    data: { email: KN_ADMIN.email, password: KN_ADMIN.password },
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

const whereEvent = (eventName: string): string =>
  `/api/speaking-requests?where[eventName][equals]=${encodeURIComponent(eventName)}&depth=0`

test.beforeAll(async () => {
  test.setTimeout(120_000)
  // Admin used by the round-trip read-back and the request-level enforcement checks.
  await seedKeynotesAdmin()
  // Warm the route so a cold dev-server compile doesn't blow a per-test timeout.
  const ctx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  try {
    await ctx.get(PATH, { timeout: 120_000 })
  } finally {
    await ctx.dispose()
  }
})

test.afterAll(async () => {
  await cleanupKeynotesAdmin()
})

// ------------------------------- SEO metadata -------------------------------

test.describe('Keynotes page — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, keynote-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!.length).toBeGreaterThan(0)
    expect(title!, 'title names the page subject').toMatch(/keynote/i)
    expect(title!, 'title is flowlyst-branded').toMatch(/flowlyst/i)
  })

  test('has a non-empty <meta description> distinct from the title', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const description = getMetaContent(html, 'description')
    const title = getTitle(html)
    expect(description, '<meta name="description"> must be present').toBeTruthy()
    expect(
      description!.length,
      'description is a usable length, not a stub',
    ).toBeGreaterThanOrEqual(50)
    expect(description, 'description and title serve different roles').not.toBe(title)
    expect(description!, 'description is on-topic').toMatch(/keynote|speak|Aziz/i)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    // PRD §10.1 / §11: every public page needs its OWN title + description. Prove
    // the keynotes page did not inherit the site defaults by diffing against "/".
    const [homeHtml, keynoteHtml] = [await fetchHtml(request, '/'), await fetchHtml(request, PATH)]
    expect(getTitle(keynoteHtml), 'keynotes title must differ from homepage title').not.toBe(
      getTitle(homeHtml),
    )
    expect(
      getMetaContent(keynoteHtml, 'description'),
      'keynotes description must differ from homepage description',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the keynotes path', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // A missing/misconfigured metadataBase renders canonical as a relative path —
    // fail loudly on that: it must be a full scheme+host URL.
    expect(canonical, 'canonical must be absolute (scheme + host)').toMatch(/^https?:\/\/[^/]+/i)
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    expect(new URL(canonical).pathname, 'canonical path must be the keynotes path').toBe(PATH)
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const ogTitle = getMetaProperty(html, 'og:title')
    const ogDesc = getMetaProperty(html, 'og:description')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogTitle, 'og:title present and non-empty').toBeTruthy()
    expect(ogDesc, 'og:description present and non-empty').toBeTruthy()
    expect(ogUrl, 'og:url present').toBeTruthy()
    expect(new URL(ogUrl!).pathname, 'og:url points at the keynotes path').toBe(PATH)
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('Keynotes page — JSON-LD structured data', () => {
  test('Organization (site-wide) and Service (page) nodes both parse', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // collectJsonLdNodes throws on malformed JSON, so this asserts every block parses.
    const nodes = collectJsonLdNodes(html)
    expect(nodes.length, 'at least one application/ld+json block').toBeGreaterThan(0)

    // Organization comes from the root layout (review invariant a).
    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'an Organization node must be present').toBeTruthy()
    expect(typeof org!.node.name, 'Organization.name is a string').toBe('string')
    expect((org!.node.name as string).length).toBeGreaterThan(0)
    expect(org!.node.url as string, 'Organization.url is absolute').toMatch(/^https?:\/\/[^/]+/i)
  })

  test('exactly one Service node, with schema.org context, name, url, and a provider', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const services = nodes.filter(({ node }) => typeMatches(node, 'Service'))
    expect(services.length, 'exactly one Service JSON-LD node on the solution page').toBe(1)

    const service = services[0]
    const context = service.context
    const contextStr = Array.isArray(context) ? context.join(' ') : String(context ?? '')
    expect(contextStr, '@context references schema.org').toMatch(/schema\.org/i)

    const node = service.node
    expect(typeof node.name, 'Service.name is a string').toBe('string')
    expect((node.name as string).length, 'Service.name non-empty').toBeGreaterThan(0)
    expect(node.name as string, 'Service.name names the keynote offering').toMatch(/keynote/i)
    expect(typeof node.url, 'Service.url is a string').toBe('string')
    expect(node.url as string, 'Service.url absolute').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(node.url as string).pathname, 'Service.url points at the keynotes path').toBe(
      PATH,
    )

    // provider is a schema.org Organization with a name.
    const provider = node.provider as Record<string, unknown> | undefined
    expect(provider, 'Service.provider present').toBeTruthy()
    expect(provider!['@type'], 'provider is an Organization').toBe('Organization')
    expect(typeof provider!.name, 'provider.name is a string').toBe('string')
    expect((provider!.name as string).length).toBeGreaterThan(0)
  })

  test('Service node carries NO price / offers fields (public pricing is banned)', async ({
    request,
  }) => {
    // PRD §12: no public pricing anywhere. The Service node must not smuggle price
    // data via schema.org offer fields.
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const service = nodes.find(({ node }) => typeMatches(node, 'Service'))!
    const node = service.node
    for (const banned of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'priceRange']) {
      expect(node[banned], `Service must not carry a "${banned}" field`).toBeUndefined()
    }
    expect(JSON.stringify(node), 'no offer/price fields anywhere in the Service node').not.toMatch(
      /"(offers|price|priceCurrency|priceSpecification|priceRange)"\s*:/i,
    )
  })
})

// --------------------------- Server-rendered content ------------------------

test.describe('Keynotes page — server-rendered content (raw HTML, no JS)', () => {
  test('the hero (eyebrow, headline, lead) is in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'hero eyebrow').toContain('conference sessions')
    expect(html, 'hero headline').toContain('A keynote on AI in')
    expect(html, 'hero lead').toContain('speaks at state and national association events')
    // PRD-backed speaker credentials are server-rendered (invariant a). Clean-ASCII
    // fragments — the lead wraps them in em-dashes and a curly apostrophe.
    expect(html, 'hero credential — former school CFO').toContain('former school CFO')
    expect(html, 'hero credential — years in K-12 finance').toContain('15+ years in K-12 finance')
    expect(html, 'hero primary CTA label').toContain('Submit a speaking request')
    // Secondary CTA is a server-rendered anchor to the About page.
    expect(html, 'Meet Aziz -> /about anchor in server HTML').toMatch(
      /<a\b[^>]*href="\/about"[^>]*>\s*Meet Aziz/i,
    )
  })

  test('the venues strip is exactly the three real venues (no AASA / Regional PD overclaim)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // The three venues attributable to Aziz are server-rendered.
    for (const venue of ['ASBO International', 'NJASBO', 'CPS']) {
      expect(html, `venue "${venue}" must be in the server HTML`).toContain(venue)
    }
    // "Regional PD" was dropped as a venue claim and must not reappear anywhere on the
    // page. (Audiences' "Regional service-agency PD" is a different, non-matching string.)
    expect(html, '"Regional PD" venue claim removed page-wide').not.toContain('Regional PD')
    // AASA is a PRD audience example, NOT a venue — scope the negative to the venue
    // strip, since AASA legitimately remains in the audiences copy elsewhere.
    const strip = html.match(/data-testid="keynotes-venues"[\s\S]*?<\/section>/i)
    expect(strip, 'venues section present in the server HTML').toBeTruthy()
    expect(strip![0], 'AASA is not presented as a venue tile').not.toContain('AASA')
  })

  test('the speaking topics are server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Match clean-ASCII fragments (the design titles contain "&" → &amp;).
    for (const topic of [
      'school business officials',
      'Automating district finance',
      'AI adoption for school leaders',
    ]) {
      expect(html, `topic "${topic}" must be in the server HTML`).toContain(topic)
    }
  })

  test('the audiences band is server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    for (const audience of [
      'national associations',
      'District-hosted summits',
      'service-agency PD',
      'School finance conferences',
    ]) {
      expect(html, `audience "${audience}" must be in the server HTML`).toContain(audience)
    }
  })

  test('the request-form heading and lead are SERVER-rendered (only the form is a client island)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // Heading + lead live in page.tsx (server component) around the client form.
    expect(html, 'request section eyebrow').toContain('Request a keynote')
    expect(html, 'request section heading').toContain('Tell us about')
    expect(html, 'request section lead').toContain('come back within 3 business days')
    // The client island itself server-renders its initial markup too: the submit
    // button label and the field labels are in the crawlable HTML.
    expect(html, 'form submit button label (island SSR)').toContain('Submit speaking request')
    expect(html, 'form field label — event name').toContain('Event name')
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1> in the server HTML').toBe(1)
  })
})

// ------------------- Lead capture: form delivery path (invariant d) ---------

test.describe('Keynotes speaking-request form — delivery path (invariant d)', () => {
  test('a valid browser submission persists a row an Admin can read back', async ({ page }) => {
    test.setTimeout(90_000)
    const stamp = Date.now()
    const contactName = `E2E Organizer ${stamp}`
    const email = `e2e-${stamp}@district.k12.us`
    const eventName = `E2E Keynote ${stamp}`
    const eventDate = 'Fall 2026'

    await page.goto(PATH)
    await expect(page.getByTestId('keynotes-form'), 'the form island hydrates').toBeVisible()

    // Locate inputs by their programmatic label (proves label association too).
    await page.getByLabel('Your name').fill(contactName)
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Event name').fill(eventName)
    await page.getByLabel('Event date or timeframe').fill(eventDate)

    // Filling only the visible fields must leave the honeypot empty — the original
    // silent-lead-drop bug was an autofill-prone honeypot getting filled and failing
    // a real visitor's submit. (Playwright doesn't simulate browser autofill; the
    // structural guards that defeat it are asserted in the honeypot test below.)
    await expect(
      page.locator('input[name="botField"]'),
      'honeypot stays empty for a real submission',
    ).toHaveValue('')

    await page.getByRole('button', { name: /submit speaking request/i }).click()

    // The success state renders only after the POST resolved `res.ok` (201) — so
    // seeing it proves the create committed server-side before we read it back.
    const success = page.getByTestId('keynotes-form-success')
    await expect(success).toBeVisible()
    await expect(success).toContainText(/Request received/i)

    // Prove persistence through the real HTTP surface, authenticated as Admin.
    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEvent(eventName))
      expect(readRes.status(), 'admin read of the inbox returns 200').toBe(200)
      const body = (await readRes.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'exactly one persisted row for the submitted eventName').toBe(1)

      const doc = body.docs[0]
      // Assert the EFFECT: the typed values round-tripped to storage …
      expect(doc.contactName).toBe(contactName)
      expect(doc.email).toBe(email)
      expect(doc.eventName).toBe(eventName)
      expect(doc.eventDate).toBe(eventDate)
      // … the server default applied, and no admin-only field was injected.
      expect(doc.status, 'status defaults to pending').toBe('pending')
      expect(doc.internalNotes ?? '', 'no internal notes on a public submission').toBeFalsy()
      expect(doc.botField ?? '', 'honeypot stored empty for a real submission').toBeFalsy()

      // Clean up the row this test created.
      await ctx.delete(`/api/speaking-requests/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('client validation blocks an empty submit: errors render and NO API call is made', async ({
    page,
  }) => {
    await page.goto(PATH)

    // Record any POST to the create endpoint — a blocked submit must fire none.
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/speaking-requests')) {
        posts.push(req.url())
      }
    })

    await page.getByRole('button', { name: /submit speaking request/i }).click()

    // Keyboard/AT users land on the problem: focus jumps to the first invalid field
    // in REQUIRED order — with everything empty that is "Your name" (contactName).
    await expect(
      page.getByLabel('Your name'),
      'focus moves to the first invalid field on submit',
    ).toBeFocused()

    // Each required field surfaces an inline error + aria-invalid + aria-describedby.
    for (const label of ['Your name', 'Work email', 'Event name', 'Event date or timeframe']) {
      const input = page.getByLabel(label)
      await expect(input, `${label} is flagged invalid`).toHaveAttribute('aria-invalid', 'true')
      const describedby = await input.getAttribute('aria-describedby')
      expect(describedby, `${label} wires aria-describedby to its error`).toBeTruthy()
      await expect(page.locator(`[id="${describedby}"]`), `${label} error text renders`).toHaveText(
        /required/i,
      )
    }

    await expect(
      page.getByTestId('keynotes-form-success'),
      'no success state on invalid submit',
    ).toHaveCount(0)
    expect(posts, 'client validation blocked the network POST → no doc created').toHaveLength(0)
  })

  test('a malformed email is rejected client-side before any API call', async ({ page }) => {
    await page.goto(PATH)
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/speaking-requests')) {
        posts.push(req.url())
      }
    })

    await page.getByLabel('Your name').fill('Some Organizer')
    await page.getByLabel('Work email').fill('not-an-email')
    await page.getByLabel('Event name').fill('Some Event')
    await page.getByLabel('Event date or timeframe').fill('Spring 2027')
    await page.getByRole('button', { name: /submit speaking request/i }).click()

    const email = page.getByLabel('Work email')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedby = await email.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedby}"]`)).toHaveText(/valid email/i)
    // Focus jumps to the first invalid field in REQUIRED order. Here the required
    // fields are filled and only the email is malformed, so focus lands on the email
    // input — proving "first INVALID", not merely "the first field".
    await expect(email, 'focus moves to the offending email field').toBeFocused()
    await expect(page.getByTestId('keynotes-form-success')).toHaveCount(0)
    expect(posts, 'a bad email address never reaches the API').toHaveLength(0)
  })

  test('the honeypot is hidden, out of the tab order, and autofill-proof (anti-lead-drop)', async ({
    page,
  }) => {
    // The original bug: an autofill-prone honeypot (name="company") that password
    // managers / browser autofill would fill for a REAL visitor, tripping the trap
    // and silently dropping the lead (invariant d). These guards pin the fix.
    await page.goto(PATH)
    const honeypot = page.locator('input[name="botField"]')
    await expect(honeypot, 'the honeypot input exists').toHaveCount(1)

    // Out of the tab order and off browser-autofill heuristics.
    await expect(honeypot).toHaveAttribute('tabindex', '-1')
    await expect(honeypot).toHaveAttribute('autocomplete', 'off')

    // Off the accessibility tree: it lives inside an aria-hidden wrapper.
    await expect(
      page.locator('[aria-hidden="true"] input[name="botField"]'),
      'honeypot is inside an aria-hidden container',
    ).toHaveCount(1)

    // Not actually visible: the wrapper is a 1x1 clip box. We assert the wrapper's
    // bounding box (<=1px), NOT locator.isVisible() — Playwright ignores ancestor
    // clip/overflow and reports this pattern as visible (a known false positive).
    const wrapper = page.locator('div[aria-hidden="true"]', {
      has: page.locator('input[name="botField"]'),
    })
    const box = await wrapper.boundingBox()
    expect(box, 'the honeypot wrapper has a layout box').not.toBeNull()
    expect(box!.width, 'honeypot wrapper collapses to <=1px wide').toBeLessThanOrEqual(1)
    expect(box!.height, 'honeypot wrapper collapses to <=1px tall').toBeLessThanOrEqual(1)
  })
})

// ------------------- Lead capture: server-side enforcement ------------------

test.describe('Keynotes API — server-side enforcement (request level)', () => {
  test('a honeypot-tripped submission is rejected and persists nothing', async ({ request }) => {
    const stamp = Date.now()
    const eventName = `HONEYPOT-REQ-${stamp}`
    const res = await request.post('/api/speaking-requests', {
      data: {
        contactName: 'Bot',
        email: `bot-${stamp}@x.test`,
        eventName,
        eventDate: 'Fall 2026',
        botField: 'i am a bot',
      },
    })
    expect(res.status(), 'server rejects a honeypot-tripped create with 400').toBe(400)

    // Confirm the rejection blocked PERSISTENCE, not just returned a 400.
    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEvent(eventName))
      const body = (await readRes.json()) as { totalDocs: number }
      expect(body.totalDocs, 'honeypot-tripped submission persisted nothing').toBe(0)
    } finally {
      await ctx.dispose()
    }
  })

  test('anon-injected status / internalNotes are stripped over HTTP', async ({ request }) => {
    const stamp = Date.now()
    const eventName = `INJECT-REQ-${stamp}`
    const res = await request.post('/api/speaking-requests', {
      data: {
        contactName: 'Injector',
        email: `inj-${stamp}@x.test`,
        eventName,
        eventDate: 'Fall 2026',
        status: 'completed', // attacker-supplied …
        internalNotes: 'i set this', // … admin-only fields
      },
    })
    // The create still SUCCEEDS — the injected fields are stripped, not errored.
    expect(res.ok(), 'valid create succeeds with injected fields ignored').toBeTruthy()

    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEvent(eventName))
      const body = (await readRes.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'the row persisted').toBe(1)
      const doc = body.docs[0]
      expect(doc.status, 'injected status ignored → default pending').toBe('pending')
      expect(doc.internalNotes ?? '', 'injected internal notes stripped').toBeFalsy()
      await ctx.delete(`/api/speaking-requests/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('anonymous read of the speaking-requests inbox is forbidden (PII)', async ({ request }) => {
    const res = await request.get('/api/speaking-requests')
    expect(res.status(), 'anon read denied — PII is admin-only').toBe(403)
    // Defensive: whatever the body, no lead email pattern leaked.
    const text = await res.text()
    expect(text, 'no lead PII in a forbidden response').not.toMatch(/@district\.k12\.us/)
  })
})

// ------------------------- Responsive / accessibility -----------------------

test.describe('Keynotes page — responsive & accessibility smoke', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    // WCAG 1.4.10 reflow: the document must not scroll horizontally on a phone.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'no horizontal overflow at 390px').toBeLessThanOrEqual(390)
  })

  test('at 768px width there is no horizontal overflow and the burger is the nav control', async ({
    page,
  }) => {
    // The nav folds to the hamburger at <=959px (styles.css amendment, issues
    // #45/#58); at iPad-portrait 768 the desktop link row would otherwise wrap /
    // force a page-level horizontal scrollbar (WCAG 1.4.10 reflow). Mirrors the
    // home-page guard, which pins the full 768/900/960 fold behaviour.
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(PATH)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'documentElement.scrollWidth must equal the 768px viewport').toBe(768)
    await expect(page.locator('.nav__burger')).toBeVisible()
    await expect(page.locator('.nav__links a').first()).toBeHidden()
  })

  test('has exactly one H1', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('heading levels within the page never skip', async ({ page }) => {
    await page.goto(PATH)
    // Scope to the page's own content — the footer chrome is not this page's content.
    const levels = await page.$$eval('#main-content :is(h1,h2,h3,h4,h5,h6)', (els) =>
      els.map((el) => Number(el.tagName.slice(1))),
    )
    expect(levels.length, 'main has headings').toBeGreaterThan(0)
    expect(levels[0], 'the first heading in main is the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i] - levels[i - 1],
        `heading level must not jump down more than one (…h${levels[i - 1]} → h${levels[i]})`,
      ).toBeLessThanOrEqual(1)
    }
  })

  test('every <img> carries an alt attribute', async ({ page }) => {
    await page.goto(PATH)
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      // alt may be "" for decorative images — the attribute must be PRESENT.
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute (present, may be empty)`).not.toBeNull()
    }
  })

  test('the hero primary CTA is keyboard-reachable', async ({ page }) => {
    await page.goto(PATH)
    const cta = page
      .locator('[data-testid="solution-hero"]')
      .getByRole('link', { name: /submit a speaking request/i })
    // Prove it's a real anchor in the tab order (a tabindex=-1 element would pass
    // .focus() alone), then confirm it can take focus.
    const tabindex = await cta.getAttribute('tabindex')
    expect(
      tabindex === null || Number(tabindex) >= 0,
      'hero CTA must not have a negative tabindex',
    ).toBe(true)
    await cta.focus()
    await expect(cta).toBeFocused()
  })

  test('every required form field is reachable by its label, and the submit button is focusable', async ({
    page,
  }) => {
    await page.goto(PATH)
    // getByLabel resolving proves each control has a programmatic label (WCAG 3.3.2).
    for (const label of ['Your name', 'Work email', 'Event name', 'Event date or timeframe']) {
      await expect(page.getByLabel(label), `field "${label}" has an associated label`).toBeVisible()
    }
    const submit = page.getByRole('button', { name: /submit speaking request/i })
    await submit.focus()
    await expect(submit).toBeFocused()
  })

  test('the venues strip renders exactly three tiles in order', async ({ page }) => {
    await page.goto(PATH)
    // toHaveText(array) asserts both the count (exactly 3) and each tile's text/order.
    const tiles = page.locator('[data-testid="keynotes-venues"] .stat-band__grid > div')
    await expect(tiles).toHaveText(['ASBO International', 'NJASBO', 'CPS'])
  })

  test('the "Meet Aziz" secondary CTA links to /about and is keyboard-reachable', async ({
    page,
  }) => {
    await page.goto(PATH)
    const link = page
      .locator('[data-testid="solution-hero"]')
      .getByRole('link', { name: /meet aziz/i })
    await expect(link, 'Meet Aziz CTA points at the About page').toHaveAttribute('href', '/about')
    await link.focus()
    await expect(link).toBeFocused()
  })
})
