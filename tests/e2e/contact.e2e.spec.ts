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
 * Contact page (issue #15, PRD §8.2 / §10 / §11), modelled on
 * tests/e2e/keynotes.e2e.spec.ts.
 *
 * The page is server-rendered (heading, lead, alternative-contact links) with ONE
 * client island — ContactForm — so SSR/SEO/copy assertions read the *raw* server
 * HTML over HTTP (no browser, no JS) via tests/helpers/rawHtml.ts: a string that only
 * appears after hydration fails, which is the PRD §10.1 crawlability requirement
 * (review invariant a). Raw-HTML matches use clean-ASCII fragments — the H1 splits
 * across an <em> and the lead uses a curly apostrophe ("doesn't"), so assertions key
 * around them.
 *
 * The contact form is invariant (d) — lead capture is sacred — so its delivery path
 * is PROVEN, not assumed: a browser fills + submits, then a separate ADMIN-authed
 * REST context reads the row back and asserts the values persisted with the default
 * `status: new`. Client validation (required fields, email shape, focus-first-invalid,
 * zero-POST-on-invalid), a transport-failure banner, and server-side enforcement
 * (honeypot reject, admin-field injection strip, anon PII read) are all covered.
 * Unlike the solution pages, /contact carries NO page-level JSON-LD (only the
 * site-wide Organization from the layout) — asserted below.
 */

const PATH = '/contact'

// --------------------------- dedicated admin --------------------------------

// Own admin identity for this file — deliberately NOT the shared seedTestUser that
// admin.e2e.spec.ts seeds/cleans, because Playwright runs spec files in parallel:
// sharing that record races. A per-run stamped email keeps the files isolated.
const CONTACT_ADMIN = {
  email: `contact-e2e-admin-${Date.now()}@flowlyst.test`,
  password: 'contact-e2e-password-123',
  name: 'Contact E2E Admin',
  role: 'admin' as const,
}

async function seedContactAdmin(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: CONTACT_ADMIN.email } } })
  await payload.create({ collection: 'users', data: CONTACT_ADMIN })
}

async function cleanupContactAdmin(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: CONTACT_ADMIN.email } } })
}

/**
 * A fresh APIRequestContext authenticated as the dedicated Admin. Log in via the
 * Payload REST endpoint for the JWT, then attach it as an explicit
 * `Authorization: JWT <token>` header — Payload's default auth strategy honors that
 * header, which is more reliable across contexts than cookie-jar propagation. Kept
 * separate from the built-in (anonymous) `request` fixture. Caller disposes.
 */
async function adminContext(): Promise<APIRequestContext> {
  const loginCtx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  const res = await loginCtx.post('/api/users/login', {
    data: { email: CONTACT_ADMIN.email, password: CONTACT_ADMIN.password },
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

// Read the inbox filtered to a single stamped email — the DB carries unrelated rows
// (coder proofs + other tests), so keying on our own unique value isolates the read.
const whereEmail = (email: string): string =>
  `/api/contact-messages?where[email][equals]=${encodeURIComponent(email)}&depth=0`

test.beforeAll(async () => {
  test.setTimeout(120_000)
  await seedContactAdmin()
  // Warm the route so a cold dev-server compile doesn't blow a per-test timeout.
  const ctx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  try {
    await ctx.get(PATH, { timeout: 120_000 })
  } finally {
    await ctx.dispose()
  }
})

test.afterAll(async () => {
  await cleanupContactAdmin()
})

// ------------------------------- SEO metadata -------------------------------

test.describe('Contact page — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, contact-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!.length).toBeGreaterThan(0)
    expect(title!, 'title names the page subject').toMatch(/contact/i)
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
    expect(description!, 'description is on-topic').toMatch(/press|partnership|support|demo/i)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    // PRD §10.1 / §11: every public page needs its OWN title + description. Prove the
    // contact page did not inherit the site defaults by diffing against "/".
    const [homeHtml, contactHtml] = [await fetchHtml(request, '/'), await fetchHtml(request, PATH)]
    expect(getTitle(contactHtml), 'contact title must differ from homepage title').not.toBe(
      getTitle(homeHtml),
    )
    expect(
      getMetaContent(contactHtml, 'description'),
      'contact description must differ from homepage description',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the contact path', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // A missing/misconfigured metadataBase renders canonical as a relative path — fail
    // loudly on that: it must be a full scheme+host URL.
    expect(canonical, 'canonical must be absolute (scheme + host)').toMatch(/^https?:\/\/[^/]+/i)
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    expect(new URL(canonical).pathname, 'canonical path must be the contact path').toBe(PATH)
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const ogTitle = getMetaProperty(html, 'og:title')
    const ogDesc = getMetaProperty(html, 'og:description')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogTitle, 'og:title present and non-empty').toBeTruthy()
    expect(ogDesc, 'og:description present and non-empty').toBeTruthy()
    expect(ogUrl, 'og:url present').toBeTruthy()
    expect(new URL(ogUrl!).pathname, 'og:url points at the contact path').toBe(PATH)
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('Contact page — JSON-LD structured data', () => {
  test('the site-wide Organization node parses, and NO page-level Service node exists', async ({
    request,
  }) => {
    // Invariant (a) scopes structured data: Organization is site-wide (layout), Service
    // is for solution pages only. /contact is neither a solution nor a blog page, so it
    // must carry the Organization node and NOT a Service node.
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html) // throws on malformed JSON → asserts each parses
    expect(nodes.length, 'at least one application/ld+json block').toBeGreaterThan(0)

    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'the site-wide Organization node must be present').toBeTruthy()
    expect(typeof org!.node.name, 'Organization.name is a string').toBe('string')
    expect((org!.node.name as string).length).toBeGreaterThan(0)
    expect(org!.node.url as string, 'Organization.url is absolute').toMatch(/^https?:\/\/[^/]+/i)

    const service = nodes.find(({ node }) => typeMatches(node, 'Service'))
    expect(service, '/contact must NOT carry a Service node (not a solution page)').toBeFalsy()
  })
})

// --------------------------- Server-rendered content ------------------------

test.describe('Contact page — server-rendered content (raw HTML, no JS)', () => {
  test('the intro (eyebrow, headline, lead) is in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'intro eyebrow').toContain('Get in touch')
    // H1 splits across an <em>: "Not ready for a demo? <em>Drop us a line.</em>". Key on
    // each contiguous fragment, not the phrase that spans the tag.
    expect(html, 'H1 fragment before the em').toContain('Not ready for a demo?')
    expect(html, 'H1 fragment inside the em').toContain('Drop us a line')
    // Lead uses a curly apostrophe in "doesn't" — match clean fragments around it.
    expect(html, 'lead — reasons list').toContain(
      'press, partnerships, training questions, support',
    )
    expect(html, 'lead — tail').toContain('fit a demo form')
  })

  test('all three alternative-contact links are server-rendered with correct hrefs', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // Scope to the contact section so the nav's own "Request a demo" CTA can't satisfy
    // these (the page section has no nested <section>, so this slice is the whole panel).
    const sectionMatch = html.match(/data-testid="contact-page"[\s\S]*?<\/section>/i)
    expect(sectionMatch, 'contact section present in the server HTML').toBeTruthy()
    const section = sectionMatch![0]

    // Email → mailto: link with the PRD/Organization address.
    expect(section, 'Email row label').toContain('Email')
    expect(section, 'mailto link with the info@ address').toMatch(
      /<a\b[^>]*href="mailto:info@flowlyst\.io"[^>]*>\s*info@flowlyst\.io/i,
    )
    // Demo requests → internal /request-demo anchor (next/link renders a real <a>).
    expect(section, 'Demo requests row label').toContain('Demo requests')
    expect(section, '/request-demo anchor with its label').toMatch(
      /<a\b[^>]*href="\/request-demo"[^>]*>\s*Request a demo/i,
    )
    // Speaking inquiries → internal /solutions/keynotes anchor.
    expect(section, 'Speaking inquiries row label').toContain('Speaking inquiries')
    expect(section, '/solutions/keynotes anchor with its label').toMatch(
      /<a\b[^>]*href="\/solutions\/keynotes"[^>]*>\s*Keynotes/i,
    )
  })

  test('the form island SSRs its field labels and submit button (crawlable, not client-only)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // The client island still server-renders its initial markup, so the labels + submit
    // label are in the crawlable HTML.
    for (const label of ['Name', 'Work email', 'Reason', 'Message']) {
      expect(html, `form field label "${label}"`).toContain(label)
    }
    expect(html, 'form submit button label').toContain('Send message')
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1> in the server HTML').toBe(1)
  })
})

// ------------------- Lead capture: form delivery path (invariant d) ---------

test.describe('Contact form — delivery path (invariant d)', () => {
  test('a valid submission WITH a reason persists a row an Admin can read back', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const stamp = Date.now()
    const name = `E2E Contact ${stamp}`
    const email = `e2e-contact-${stamp}@district.k12.us`
    const message = `E2E message body ${stamp} — please disregard.`

    await page.goto(PATH)
    await expect(page.getByTestId('contact-form'), 'the form island hydrates').toBeVisible()

    // Locate by programmatic label (proves label association / WCAG 3.3.2 too).
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Reason').selectOption('training')
    await page.getByLabel('Message').fill(message)

    // A real submission leaves the honeypot empty.
    await expect(
      page.locator('input[name="botField"]'),
      'honeypot stays empty for a real submission',
    ).toHaveValue('')

    await page.getByRole('button', { name: /send message/i }).click()

    // Success renders only after the POST resolved res.ok (201) — seeing it proves the
    // create committed server-side before we read it back.
    const success = page.getByTestId('contact-form-success')
    await expect(success).toBeVisible()
    await expect(success).toContainText(/Message received/i)

    // Prove persistence through the real HTTP surface, authenticated as Admin.
    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEmail(email))
      expect(readRes.status(), 'admin read of the inbox returns 200').toBe(200)
      const body = (await readRes.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'exactly one persisted row for the submitted email').toBe(1)

      const doc = body.docs[0]
      // Assert the EFFECT: typed values round-tripped to storage …
      expect(doc.name).toBe(name)
      expect(doc.email).toBe(email)
      expect(doc.message).toBe(message)
      expect(doc.reason, 'the selected reason persisted').toBe('training')
      // … the server default applied, and no admin-only field was injected.
      expect(doc.status, 'status defaults to new').toBe('new')
      expect(doc.internalNotes ?? '', 'no internal notes on a public submission').toBeFalsy()
      expect(doc.botField ?? '', 'honeypot stored empty for a real submission').toBeFalsy()

      await ctx.delete(`/api/contact-messages/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('the default path — reason left UNSELECTED — succeeds and persists reason null', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const stamp = Date.now()
    const name = `E2E NoReason ${stamp}`
    const email = `e2e-noreason-${stamp}@district.k12.us`
    const message = `E2E no-reason message ${stamp}.`

    await page.goto(PATH)
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Message').fill(message)
    // Reason deliberately left on the placeholder "Choose…" (value "").
    await expect(page.getByLabel('Reason'), 'reason stays on the empty placeholder').toHaveValue('')

    await page.getByRole('button', { name: /send message/i }).click()
    await expect(page.getByTestId('contact-form-success')).toBeVisible()

    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEmail(email))
      const body = (await readRes.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'the reasonless submission persisted').toBe(1)
      const doc = body.docs[0]
      // Optional select left unset stores as null — never an empty string that would
      // trip the enum validator.
      expect(doc.reason ?? null, 'unselected reason persists as null').toBeNull()
      expect(doc.status, 'status still defaults to new').toBe('new')
      await ctx.delete(`/api/contact-messages/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('client validation blocks an empty submit: errors render, focus lands on first invalid, NO API call', async ({
    page,
  }) => {
    await page.goto(PATH)
    // Record any POST to the create endpoint — a blocked submit must fire none.
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/contact-messages')) {
        posts.push(req.url())
      }
    })

    await page.getByRole('button', { name: /send message/i }).click()

    // Keyboard/AT users land on the problem: focus jumps to the first invalid required
    // field in form order — with everything empty that is "Name".
    await expect(
      page.getByLabel('Name'),
      'focus moves to the first invalid field on submit',
    ).toBeFocused()

    // Each required field surfaces an inline error + aria-invalid + aria-describedby.
    for (const label of ['Name', 'Work email', 'Message']) {
      const input = page.getByLabel(label)
      await expect(input, `${label} is flagged invalid`).toHaveAttribute('aria-invalid', 'true')
      const describedby = await input.getAttribute('aria-describedby')
      expect(describedby, `${label} wires aria-describedby to its error`).toBeTruthy()
      await expect(page.locator(`[id="${describedby}"]`), `${label} error text renders`).toHaveText(
        /required/i,
      )
    }

    await expect(
      page.getByTestId('contact-form-success'),
      'no success state on invalid submit',
    ).toHaveCount(0)
    expect(posts, 'client validation blocked the network POST → no doc created').toHaveLength(0)
  })

  test('a malformed email is rejected client-side before any API call', async ({ page }) => {
    await page.goto(PATH)
    const posts: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/contact-messages')) {
        posts.push(req.url())
      }
    })

    await page.getByLabel('Name').fill('Some Person')
    await page.getByLabel('Work email').fill('not-an-email')
    await page.getByLabel('Message').fill('A message that is long enough.')
    await page.getByRole('button', { name: /send message/i }).click()

    const email = page.getByLabel('Work email')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedby = await email.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedby}"]`)).toHaveText(/valid email/i)
    // Required fields are filled and only the email is malformed, so focus lands on the
    // email input — proving "first INVALID", not merely "the first field".
    await expect(email, 'focus moves to the offending email field').toBeFocused()
    await expect(page.getByTestId('contact-form-success')).toHaveCount(0)
    expect(posts, 'a bad email address never reaches the API').toHaveLength(0)
  })

  test('a server/transport failure shows the role=alert banner and preserves entered values', async ({
    page,
  }) => {
    await page.goto(PATH)

    // Force the create endpoint to fail so we exercise the error branch deterministically
    // (no dependence on a real server error). Only the POST is intercepted.
    await page.route('**/api/contact-messages', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      } else {
        await route.continue()
      }
    })

    const name = 'Preserved Name'
    const email = 'preserved@district.k12.us'
    const message = 'This text must survive a failed submit.'
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Message').fill(message)
    await page.getByRole('button', { name: /send message/i }).click()

    // The error banner is a role=alert (announced to AT), and no success card appears.
    const banner = page.getByTestId('contact-form-error')
    await expect(banner, 'the transport-failure banner renders').toBeVisible()
    await expect(banner).toHaveAttribute('role', 'alert')
    await expect(banner).toContainText(/something went wrong/i)
    await expect(page.getByTestId('contact-form-success')).toHaveCount(0)

    // A failed submit must NOT wipe the visitor's input (only success resets the form).
    await expect(page.getByLabel('Name'), 'name preserved after failure').toHaveValue(name)
    await expect(page.getByLabel('Work email'), 'email preserved after failure').toHaveValue(email)
    await expect(page.getByLabel('Message'), 'message preserved after failure').toHaveValue(message)
  })

  test('the honeypot is hidden, out of the tab order, and autofill-proof (anti-lead-drop)', async ({
    page,
  }) => {
    // A honeypot that browser autofill / password managers fill for a REAL visitor would
    // trip the trap and silently drop the lead (invariant d). These guards pin the fix.
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

    // Not actually visible: the wrapper is a 1x1 clip box. Assert the wrapper's bounding
    // box (<=1px), NOT locator.isVisible() — Playwright ignores ancestor clip/overflow
    // and reports this pattern as visible (a known false positive).
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

test.describe('Contact API — server-side enforcement (request level)', () => {
  test('a honeypot-tripped submission is rejected and persists nothing', async ({ request }) => {
    const stamp = Date.now()
    const email = `honeypot-req-${stamp}@x.test`
    const res = await request.post('/api/contact-messages', {
      data: {
        name: 'Bot',
        email,
        message: 'automated spam',
        botField: 'i am a bot',
      },
    })
    expect(res.status(), 'server rejects a honeypot-tripped create with 400').toBe(400)

    // Confirm the rejection blocked PERSISTENCE, not just returned a 400.
    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEmail(email))
      const body = (await readRes.json()) as { totalDocs: number }
      expect(body.totalDocs, 'honeypot-tripped submission persisted nothing').toBe(0)
    } finally {
      await ctx.dispose()
    }
  })

  test('anon-injected status / internalNotes are stripped over HTTP', async ({ request }) => {
    const stamp = Date.now()
    const email = `inject-req-${stamp}@x.test`
    const res = await request.post('/api/contact-messages', {
      data: {
        name: 'Injector',
        email,
        message: 'trying to set admin fields',
        status: 'handled', // attacker-supplied …
        internalNotes: 'i set this', // … admin-only fields
      },
    })
    // The create still SUCCEEDS — the injected fields are stripped, not errored.
    expect(res.ok(), 'valid create succeeds with injected fields ignored').toBeTruthy()

    const ctx = await adminContext()
    try {
      const readRes = await ctx.get(whereEmail(email))
      const body = (await readRes.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'the row persisted').toBe(1)
      const doc = body.docs[0]
      expect(doc.status, 'injected status ignored → default new').toBe('new')
      expect(doc.internalNotes ?? '', 'injected internal notes stripped').toBeFalsy()
      await ctx.delete(`/api/contact-messages/${doc.id}`)
    } finally {
      await ctx.dispose()
    }
  })

  test('anonymous read of the contact-messages inbox is forbidden (PII)', async ({ request }) => {
    const res = await request.get('/api/contact-messages')
    expect(res.status(), 'anon read denied — PII is admin-only').toBe(403)
    // Defensive: whatever the body, no lead email pattern leaked.
    const text = await res.text()
    expect(text, 'no lead PII in a forbidden response').not.toMatch(/@district\.k12\.us/)
  })
})

// ------------------------- Responsive / accessibility -----------------------

test.describe('Contact page — responsive & accessibility smoke', () => {
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
    // The nav folds to the hamburger at <=959px (issues #45/#58); at iPad-portrait
    // 768 the desktop link row would otherwise wrap / force a page-level horizontal
    // scrollbar (WCAG 1.4.10 reflow). Mirrors the home-page guard, which pins the
    // full 768/900/960 fold behaviour.
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
    // This page has no imagery today; the loop is a regression guard for if any is added.
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute (present, may be empty)`).not.toBeNull()
    }
  })

  test('every form control is reachable by its label and the submit button is focusable', async ({
    page,
  }) => {
    await page.goto(PATH)
    // getByLabel resolving proves each control has a programmatic label (WCAG 3.3.2).
    for (const label of ['Name', 'Work email', 'Reason', 'Message']) {
      await expect(page.getByLabel(label), `field "${label}" has an associated label`).toBeVisible()
    }
    const submit = page.getByRole('button', { name: /send message/i })
    await submit.focus()
    await expect(submit).toBeFocused()
  })

  test('the three alternative-contact links are keyboard-reachable with the right hrefs', async ({
    page,
  }) => {
    await page.goto(PATH)
    // Scope to the contact panel so the nav's own "Request a demo" CTA is excluded.
    const panel = page.locator('[data-testid="contact-page"]')
    const cases: Array<{ name: RegExp; href: string }> = [
      { name: /info@flowlyst\.io/i, href: 'mailto:info@flowlyst.io' },
      { name: /request a demo/i, href: '/request-demo' },
      { name: /keynotes/i, href: '/solutions/keynotes' },
    ]
    for (const { name, href } of cases) {
      const link = panel.getByRole('link', { name })
      await expect(link, `link for ${href} present`).toHaveAttribute('href', href)
      await link.focus()
      await expect(link, `link for ${href} is keyboard-focusable`).toBeFocused()
    }
  })
})
