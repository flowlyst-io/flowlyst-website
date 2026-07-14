import { test, expect, type Locator } from '@playwright/test'
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
 * Budget Software solution page — server-rendering, SEO surface, structured data,
 * copy guardrails, WCAG contrast, and accessibility smoke (issue #8).
 *
 * The SSR/SEO/JSON-LD/copy assertions read the *raw* server HTML over HTTP (no
 * browser, no JS) via the shared helpers in tests/helpers/rawHtml.ts — if a string
 * only appears after hydration these fail, which is the PRD §10.1 requirement that
 * public pages are crawlable server-side (review invariant a). The green-band
 * contrast guard and the 390px overflow / a11y checks need a real browser (computed
 * styles, layout, focus), so those go through the `page` fixture.
 *
 * The page is hardcoded content (8 modules, 4 promises, hero, supplementary band)
 * except the single featured budget-software testimonial, which is CMS-driven and
 * omitted when none is published — the omitted-state e2e here reads an isolated DB
 * (no seeded testimonial); the deterministic omit/render/no-leak proof lives in
 * tests/int/budget-cms.int.spec.ts.
 */

const PATH = '/solutions/budget-software'

// ------------------------------- SEO metadata -------------------------------

test.describe('Budget page — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, budget-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!.length).toBeGreaterThan(0)
    expect(title!, 'title names the page subject').toMatch(/budget software/i)
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
    expect(description!, 'description is on-topic').toMatch(/budgeting|budget/i)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    // PRD §10.1 / §11: every public page needs its OWN title + description. Prove
    // the budget page did not inherit the site defaults by diffing against "/".
    const [homeHtml, budgetHtml] = [await fetchHtml(request, '/'), await fetchHtml(request, PATH)]
    expect(getTitle(budgetHtml), 'budget title must differ from homepage title').not.toBe(
      getTitle(homeHtml),
    )
    expect(
      getMetaContent(budgetHtml, 'description'),
      'budget description must differ from homepage description',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the budget path', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // A missing/misconfigured metadataBase renders canonical as a relative path —
    // this fails loudly on that: it must be a full scheme+host URL.
    expect(canonical, 'canonical must be absolute (scheme + host)').toMatch(/^https?:\/\/[^/]+/i)
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    expect(new URL(canonical).pathname, 'canonical path must be the budget path').toBe(PATH)
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const ogTitle = getMetaProperty(html, 'og:title')
    const ogDesc = getMetaProperty(html, 'og:description')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogTitle, 'og:title present and non-empty').toBeTruthy()
    expect(ogDesc, 'og:description present and non-empty').toBeTruthy()
    expect(ogUrl, 'og:url present').toBeTruthy()
    // og:url resolves to the budget page (absolute via metadataBase).
    expect(new URL(ogUrl!).pathname, 'og:url points at the budget path').toBe(PATH)
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('Budget page — JSON-LD structured data', () => {
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

  test('Service node has schema.org context, name, and a provider', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const service = nodes.find(({ node }) => typeMatches(node, 'Service'))
    expect(service, 'a Service JSON-LD node must be present on the solution page').toBeTruthy()

    const context = service!.context
    const contextStr = Array.isArray(context) ? context.join(' ') : String(context ?? '')
    expect(contextStr, '@context references schema.org').toMatch(/schema\.org/i)

    const node = service!.node
    expect(typeof node.name, 'Service.name is a string').toBe('string')
    expect((node.name as string).length, 'Service.name non-empty').toBeGreaterThan(0)
    expect(node.name as string, 'Service.name names the budget offering').toMatch(/budget/i)
    expect(typeof node.url, 'Service.url is a string').toBe('string')
    expect(node.url as string, 'Service.url absolute').toMatch(/^https?:\/\/[^/]+/i)

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
    // PRD §4.1 / brand rule: pricing is "on a call", never published. The Service
    // node must not smuggle price data via schema.org offer fields.
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

test.describe('Budget page — server-rendered content (raw HTML, no JS)', () => {
  test('hero positioning headline is in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'hero "Many tools"').toMatch(/Many tools/i)
    expect(html, 'hero "One platform"').toMatch(/One platform/i)
    expect(html, 'hero primary CTA').toMatch(/Request a demo/i)
  })

  test('the supplementary-to-ERP positioning is server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Flagship positioning (PRD §4.1): flowlyst adds to the ERP, never replaces it.
    expect(html, 'supplementary eyebrow').toContain('Built to add, not replace')
    expect(html, 'supplementary body copy').toMatch(/supplementary to your ERP/i)
  })

  test('all eight platform module titles are server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const modules = [
      'Department-level entry',
      'Real-time tracking',
      'Color-coded reports',
      'Supervisor rollup',
      'Pre-built dashboards',
      'Fast table export',
      'Salary projections',
      'AI budget analysis',
    ]
    for (const title of modules) {
      expect(html, `module "${title}" must be in the server HTML`).toContain(title)
    }
  })

  test('the service-promises band strings are server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Stats + labels from the green promises band (PRD §4.1 differentiators).
    for (const stat of ['1 wk', '1:1', 'CFOs', '$0']) {
      expect(html, `promise stat "${stat}"`).toContain(stat)
    }
    expect(html, 'promise label — implementation').toMatch(/Average implementation/i)
    expect(html, 'promise label — onboarding').toMatch(/Personalized onboarding/i)
    expect(html, 'promise label — finance experts').toMatch(/school finance experts/i)
    expect(html, 'promise label — no hidden fees').toMatch(/No hidden fees/i)
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1> in the server HTML').toBe(1)
  })
})

// --------------------------- Copy guardrails --------------------------------

test.describe('Budget page — copy guardrails', () => {
  test('pricing is "on a call", never published', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'secondary CTA offers pricing on a call').toContain('See pricing on a call')
  })

  test('never positions flowlyst as an ERP replacement', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Supplementary-not-replacement is the flagship stance (PRD §4.1). These
    // anti-strings must never appear.
    expect(html, '"ERP replacement" must be absent').not.toMatch(/ERP replacement/i)
    expect(html, '"replace your ERP" must be absent').not.toMatch(/replace your ERP/i)
  })

  test('modules kicker is the visitor-facing string, not the implementer note', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // Adjudicated copy: visitors see "Illustrative — the platform keeps growing.";
    // the design's "CMS-driven" annotation was an implementer note, not visitor copy.
    expect(html, 'visitor-facing kicker present').toMatch(/Illustrative/i)
    expect(html, 'kicker tail present').toMatch(/the platform keeps growing/i)
    expect(html, '"CMS-driven" must not leak into visitor copy').not.toMatch(/CMS-driven/i)
  })
})

// ------------------- WCAG 1.4.3 contrast — the green promises band ----------

test.describe('Budget page — WCAG 1.4.3 contrast on the green promises band', () => {
  // The promises band (`budget-promises`) reuses the brand-green surface, so the
  // `.section--green p` amendment (src/app/(frontend)/styles.css) is load-bearing:
  // white on #00A568 is only 3.19:1, which clears AA solely as WCAG "large text"
  // (>=24px regular). The supporting captions render as bare <p> and MUST resolve to
  // 24px / weight 400 / full-opacity white. If a caption later shrinks below 24px or
  // drops opacity it silently regresses to an AA fail — this guard is the only thing
  // that catches it. Anchored to the amendment, not the current markup.
  const WHITE = 'rgb(255, 255, 255)'

  const computed = (
    locator: Locator,
  ): Promise<{ fontSize: number; fontWeight: number; color: string }> =>
    locator.evaluate((el) => {
      const s = getComputedStyle(el)
      return { fontSize: parseFloat(s.fontSize), fontWeight: Number(s.fontWeight), color: s.color }
    })

  test('every supporting caption is 24px / 400 / full-opacity white', async ({ page }) => {
    await page.goto(PATH)
    const paras = page.locator('[data-testid="budget-promises"] p')
    const n = await paras.count()
    // Four promises → four caption <p>. Assert we found them (a 0-count would make
    // the loop vacuous).
    expect(n, 'the promises band must render its four supporting captions').toBeGreaterThanOrEqual(
      4,
    )
    for (let i = 0; i < n; i++) {
      const c = await computed(paras.nth(i))
      expect(
        c.fontSize,
        `caption[${i}] must render at the 24px large-text floor — got ${c.fontSize}px`,
      ).toBe(24)
      expect(c.fontWeight, `caption[${i}] weight must be 400 — got ${c.fontWeight}`).toBe(400)
      expect(c.color, `caption[${i}] must be full-opacity white (no alpha)`).toBe(WHITE)
    }
  })
})

// --------------------- CMS-driven testimonial omission ----------------------

test.describe('Budget page — featured testimonial omission', () => {
  test('omits the testimonial section (and leaves no empty band) when none is published', async ({
    request,
  }) => {
    // Read against the isolated test DB (no seeded budget testimonial), so the
    // CMS-driven section is absent. Deterministic omit/render/no-leak coverage is in
    // tests/int/budget-cms.int.spec.ts — this proves the served page reflects it.
    const html = await fetchHtml(request, PATH)
    expect(html, 'no testimonial section markup when the CMS returns none').not.toContain(
      'data-testid="budget-testimonial"',
    )
    // The page still closes cleanly with the shared final CTA — no empty gap where
    // the omitted band would have been.
    expect(html, 'the closing CTA band still renders').toContain('data-testid="home-final-cta"')
    // No stray undefined/null bleeding into the markup from the empty query.
    expect(html).not.toMatch(/>\s*undefined\s*</)
    expect(html).not.toMatch(/>\s*null\s*</)
  })
})

// ------------------------- Responsive / accessibility -----------------------

test.describe('Budget page — responsive & accessibility smoke', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    // WCAG 1.4.10 reflow: the document must not scroll horizontally on a phone.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'no horizontal overflow at 390px').toBeLessThanOrEqual(390)
  })

  test('has exactly one H1', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('heading levels within the page never skip', async ({ page }) => {
    await page.goto(PATH)
    // Scope to the page's own <main> — the footer's h3/h5 chrome is not this page's
    // content and its structure isn't under test here.
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
      .getByRole('link', { name: /request a demo/i })
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
})
