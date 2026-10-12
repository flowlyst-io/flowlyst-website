import { test, expect } from '@playwright/test'
import {
  fetchHtml,
  getTitle,
  getMetaContent,
  getMetaProperty,
  getCanonicals,
  collectJsonLdNodes,
  typeMatches,
} from '../helpers/rawHtml'

/**
 * AI & Automation Consulting solution page — server-rendering, SEO surface,
 * structured data, copy guardrails, and accessibility smoke (issue #12).
 *
 * Mirrors tests/e2e/budget.e2e.spec.ts. The SSR / SEO / JSON-LD / copy assertions
 * read the *raw* server HTML over HTTP (a plain GET, no browser, no JS) via the
 * shared helpers in tests/helpers/rawHtml.ts — if a string only appears after
 * hydration these fail, which is the PRD §10.1 requirement that public pages are
 * crawlable server-side (review invariant a). The 390px reflow, 768px nav-fold,
 * heading-order, focus, and section-shape checks need a real browser (layout,
 * computed tab order, scoped DOM), so those go through the `page` fixture.
 *
 * The page is fully static (src/app/(frontend)/solutions/consulting/page.tsx) — no
 * section maps to a CMS collection — so no DB seeding is required and there is no
 * int spec: every string under test is hardcoded content or layout-emitted metadata.
 *
 * Raw-HTML string choices deliberately avoid the page's typographic glyphs (en dash,
 * curly apostrophe, middle dot, the "→" arrow in the report stat) and any run split
 * across an <em>/<span> boundary — those are matched on their unambiguous adjacent
 * fragments instead, so a matcher never fails on an encoding/markup artifact rather
 * than on real missing content.
 */

const PATH = '/solutions/consulting'

// ------------------------------- SEO metadata -------------------------------

test.describe('Consulting page — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, consulting-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!.length).toBeGreaterThan(0)
    expect(title!, 'title names the page subject').toMatch(/consulting/i)
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
    expect(description!, 'description is on-topic').toMatch(/consulting|automation/i)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    // PRD §10.1 / §11: every public page needs its OWN title + description. Prove the
    // consulting page did not inherit the site defaults by diffing against "/".
    const [homeHtml, consultingHtml] = [
      await fetchHtml(request, '/'),
      await fetchHtml(request, PATH),
    ]
    expect(getTitle(consultingHtml), 'consulting title must differ from homepage title').not.toBe(
      getTitle(homeHtml),
    )
    expect(
      getMetaContent(consultingHtml, 'description'),
      'consulting description must differ from homepage description',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the consulting path', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // A missing/misconfigured metadataBase renders canonical as a relative path — this
    // fails loudly on that: it must be a full scheme+host URL.
    expect(canonical, 'canonical must be absolute (scheme + host)').toMatch(/^https?:\/\/[^/]+/i)
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    expect(new URL(canonical).pathname, 'canonical path must be the consulting path').toBe(PATH)
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const ogTitle = getMetaProperty(html, 'og:title')
    const ogDesc = getMetaProperty(html, 'og:description')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogTitle, 'og:title present and non-empty').toBeTruthy()
    expect(ogDesc, 'og:description present and non-empty').toBeTruthy()
    expect(ogUrl, 'og:url present').toBeTruthy()
    // og:url resolves to the consulting page (absolute via metadataBase).
    expect(new URL(ogUrl!).pathname, 'og:url points at the consulting path').toBe(PATH)
  })

  test('Twitter card tags are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // twitter:* is emitted as name= (unlike og:* which is property=).
    expect(getMetaContent(html, 'twitter:card'), 'twitter:card must be summary_large_image').toBe(
      'summary_large_image',
    )
    expect(getMetaContent(html, 'twitter:title'), 'twitter:title must be present').toMatch(
      /flowlyst/i,
    )
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('Consulting page — JSON-LD structured data', () => {
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

  test('there is EXACTLY ONE Service node, with schema.org context, name, and a provider', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const services = nodes.filter(({ node }) => typeMatches(node, 'Service'))
    // A solution page carries exactly one Service node (a duplicate would be a defect).
    expect(services.length, 'exactly one Service JSON-LD node on the solution page').toBe(1)
    const service = services[0]

    const context = service.context
    const contextStr = Array.isArray(context) ? context.join(' ') : String(context ?? '')
    expect(contextStr, '@context references schema.org').toMatch(/schema\.org/i)

    const node = service.node
    expect(typeof node.name, 'Service.name is a string').toBe('string')
    expect((node.name as string).length, 'Service.name non-empty').toBeGreaterThan(0)
    expect(node.name as string, 'Service.name names the consulting offering').toMatch(/consulting/i)
    expect(typeof node.url, 'Service.url is a string').toBe('string')
    expect(node.url as string, 'Service.url absolute').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(node.url as string).pathname, 'Service.url path is the consulting path').toBe(
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
    // PRD §12 / brand rule (d): pricing is handled in sales conversations, never
    // published. The Service node must not smuggle price data via schema.org offers.
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const service = nodes.find(({ node }) => typeMatches(node, 'Service'))!
    const node = service.node
    for (const banned of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'priceRange']) {
      expect(node[banned], `Service must not carry a "${banned}" field`).toBeUndefined()
    }
    // Belt-and-suspenders: no offer/price key anywhere in the node's JSON (e.g. nested).
    expect(JSON.stringify(node), 'no offer/price fields anywhere in the Service node').not.toMatch(
      /"(offers|price|priceCurrency|priceSpecification|priceRange)"\s*:/i,
    )
  })
})

// --------------------------- Server-rendered content ------------------------

test.describe('Consulting page — server-rendered content (raw HTML, no JS)', () => {
  test('the hero is in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'hero eyebrow').toContain('AI & Automation Consulting')
    // "Peer-to-peer consulting from <em>former school CFOs.</em>" — the run is split by
    // the <em>, so each side is matched on its own fragment.
    expect(html, 'hero headline (pre-em)').toContain('Peer-to-peer consulting from')
    expect(html, 'hero headline (in-em)').toContain('former school CFOs')
    expect(html, 'hero lead').toMatch(/map and automate routine work/i)
    expect(html, 'hero primary CTA — the free assessment').toContain('Free 30-min assessment')
    expect(html, 'hero secondary CTA').toContain('See case studies')
    // Hero trust badges.
    expect(html, 'hero badge — rollout satisfaction').toContain('98% rollout satisfaction')
    expect(html, 'hero badge — embedded engineers').toContain('Embedded engineers')
  })

  test('both engagement modes are server-rendered (PRD §4.3)', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Mode 1 — targeted projects.
    expect(html, 'Mode 1 label').toContain('Mode 1')
    expect(html, 'Mode 1 title').toContain('Targeted automation projects')
    expect(html, 'Mode 1 body copy').toMatch(/gets automated end-to-end/i)
    expect(html, 'Mode 1 point — hand-off').toContain('Hand-off to your team')
    // Mode 2 — embedded, McKinsey-style transformation.
    expect(html, 'Mode 2 label').toContain('Mode 2')
    expect(html, 'Mode 2 title').toContain('Full automation consulting')
    expect(html, 'Mode 2 — McKinsey-style positioning').toMatch(/McKinsey-style/i)
    expect(html, 'Mode 2 point — embedded engineer').toContain('Embedded engineer')
  })

  test('the departments-served band is server-rendered (PRD §4.3)', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'departments eyebrow').toContain('Departments served')
    expect(html, 'departments framing — routine & repeatable').toMatch(/routine and repeatable/i)
    expect(html, 'departments lead').toMatch(/Every central office function/i)
    // Representative department chips (glyph-free ones — the list also has curly-quote
    // and middle-dot entries that are intentionally not asserted as raw strings).
    for (const dept of [
      'Business Office',
      'Instructional leaders',
      'Accounts Payable',
      'Accounts Receivable',
    ]) {
      expect(html, `department "${dept}" must be in the server HTML`).toContain(dept)
    }
  })

  test('all three use-case proof stats are server-rendered (PRD §4.3 / §5)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'use-cases section framing').toContain('districts report back')
    // Anchor each proof point on its unambiguous title (the "3 days → 3 hrs" stat carries
    // a "→" glyph, so it is proven via its card title, not the arrow string).
    expect(html, 'proof — monthly report prep').toContain('Monthly report prep')
    expect(html, 'proof — HR form review').toContain('HR form review')
    expect(html, 'proof — rollout satisfaction').toContain('Rollout satisfaction')
    // The two glyph-free numeric stats.
    expect(html, 'stat — 70%').toContain('70%')
    expect(html, 'stat — 98%').toContain('98%')
  })

  test('the Assess → Map → Build → Embed process is server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'process eyebrow').toContain('Process')
    // Each step is proven on its distinctive body copy — the bare titles ("Map",
    // "Build") also appear elsewhere in the page (the hero automation-map art, a
    // "Building" status), so the copy is the unambiguous evidence the step rendered.
    expect(html, 'step Assess').toMatch(/sketch the pain/i)
    expect(html, 'step Map').toMatch(/Document the current workflow/i)
    expect(html, 'step Build').toMatch(/Iterate weekly/i)
    expect(html, 'step Embed').toMatch(/Hand-off \(Mode 1\) or embedded engineer/i)
  })

  test('the shared closing CTA band is server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // The page closes with the shared FinalCTA (data-testid asserted so an empty/omitted
    // band would fail here, not silently pass a copy match elsewhere).
    expect(html, 'final CTA band present').toContain('data-testid="home-final-cta"')
    expect(html, 'final CTA headline (pre-span)').toContain('See it run on')
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1> in the server HTML').toBe(1)
  })
})

// ------------------- The free-assessment "one-time / by-exception" line ------

test.describe('Consulting page — assessment framing (PRD §4.3)', () => {
  test('the one-time / by-exception clarifier is in the server HTML', async ({ request }) => {
    // PRD §4.3: the free 30-min assessment is offered "one-time and by exception" —
    // flowlyst does NOT routinely give free assessments. That qualifier must be
    // server-rendered (crawlable, review invariant a), not just present after
    // hydration, so the offer is never read as a recurring giveaway. Anchored on the
    // adjudicated copy's glyph-free fragments (the sentence carries an em dash between
    // "offering" and "not", so each side is matched on its own clean fragment).
    const html = await fetchHtml(request, PATH)
    expect(html, 'the by-exception framing of the free assessment').toContain(
      'The free 30-minute assessment is a one-time, by-exception',
    )
    expect(html, 'the "not recurring" qualifier').toContain('not a recurring service')
  })
})

// --------------------------- Section shape (browser DOM) --------------------

test.describe('Consulting page — section shape', () => {
  test('the two engagement-mode cards render', async ({ page }) => {
    await page.goto(PATH)
    // Two modes → two <h3> mode titles in the modes band (the SectionHead above them
    // is an <h2>, so it is not counted).
    const modeTitles = page.locator('[data-testid="consulting-modes"] h3')
    await expect(modeTitles, 'exactly two engagement-mode cards').toHaveCount(2)
  })

  test('the four process steps render', async ({ page }) => {
    await page.goto(PATH)
    // Assess / Map / Build / Embed → four <h3> step titles (SectionHead is an <h2>).
    const steps = page.locator('[data-testid="consulting-process"] h3')
    await expect(steps, 'exactly four process steps').toHaveCount(4)
  })
})

// ------------------------- Responsive / accessibility -----------------------

test.describe('Consulting page — responsive & accessibility smoke', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    // WCAG 1.4.10 reflow: the document must not scroll horizontally on a phone.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'no horizontal overflow at 390px').toBeLessThanOrEqual(390)
  })

  test('at 768px the nav folds to the burger with no horizontal overflow', async ({ page }) => {
    // Shared-chrome reflow guard (issues #45/#58), mirrored from the homepage: the
    // full horizontal nav wraps to two lines below its ~908px single-line fit point,
    // so it folds to the hamburger at <=959px; at 768 it must be folded or it wraps /
    // forces a page-level horizontal scrollbar (WCAG 1.4.10 fail).
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
    // Scope to the page's own <main> — the shared footer's heading chrome is not this
    // page's content and its structure isn't under test here.
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

  test('the hero assessment CTA is keyboard-reachable and points at /contact', async ({ page }) => {
    await page.goto(PATH)
    const cta = page
      .locator('[data-testid="solution-hero"]')
      .getByRole('link', { name: /free 30-min assessment/i })
    // The page goal (PRD §4.3) is the assessment booking, so its CTA must be a real,
    // keyboard-reachable anchor pointing at the contact route.
    await expect(cta, 'the hero assessment CTA must exist').toHaveCount(1)
    await expect(cta).toHaveAttribute('href', '/contact')
    // Prove it's in the tab order (a tabindex=-1 element would pass .focus() alone),
    // then confirm it can take focus.
    const tabindex = await cta.getAttribute('tabindex')
    expect(
      tabindex === null || Number(tabindex) >= 0,
      'hero CTA must not have a negative tabindex',
    ).toBe(true)
    await cta.focus()
    await expect(cta).toBeFocused()
  })
})
