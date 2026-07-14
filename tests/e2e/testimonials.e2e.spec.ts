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
 * Testimonials index (`/testimonials`, issue #18) — server-rendering, SEO surface,
 * structured data, filter-chip behavior, and accessibility smoke.
 *
 * The SSR/SEO/JSON-LD assertions read the *raw* server HTML over HTTP (no browser, no
 * JS) via the shared helpers — if a string only appears after hydration these fail,
 * which is the PRD §10.1 requirement that public pages are crawlable server-side
 * (review invariant a). The filter-chip navigation, 390px overflow, and a11y checks
 * need a real browser, so those go through the `page` fixture.
 *
 * Deterministic content-driven proofs (published-only visibility, the two filter
 * dimensions, their combination, both empty states, param-merge) live in
 * tests/int/testimonials-cms.int.spec.ts, which controls the DB. These e2e checks are
 * content-agnostic: they hold whether or not the isolated DB has published testimonials,
 * because the hero, the service filter chips, and the SEO surface are always present.
 */

const PATH = '/testimonials'

// ------------------------------- SEO metadata -------------------------------

test.describe('Testimonials — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, testimonials-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!, 'title names the page subject').toMatch(/testimonial/i)
    expect(title!, 'title is flowlyst-branded').toMatch(/flowlyst/i)
  })

  test('has a non-empty <meta description> distinct from the title', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const description = getMetaContent(html, 'description')
    const title = getTitle(html)
    expect(description, '<meta name="description"> must be present').toBeTruthy()
    expect(description!.length, 'description is a usable length').toBeGreaterThanOrEqual(50)
    expect(description, 'description and title serve different roles').not.toBe(title)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    const [homeHtml, thisHtml] = [await fetchHtml(request, '/'), await fetchHtml(request, PATH)]
    expect(getTitle(thisHtml), 'title must differ from homepage title').not.toBe(getTitle(homeHtml))
    expect(
      getMetaContent(thisHtml, 'description'),
      'description must differ from homepage description',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the testimonials path', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    expect(canonical, 'canonical must be absolute (scheme + host)').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(canonical).pathname, 'canonical path is the testimonials path').toBe(PATH)
  })

  test('canonical stays the bare path under a filter (no duplicate content)', async ({
    request,
  }) => {
    // Every ?service=/?role= variation must canonicalize to the bare /testimonials so a
    // filtered view is never indexed as duplicate content (PRD §10.1).
    const html = await fetchHtml(request, `${PATH}?service=budget-software&role=CFO`)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one canonical on the filtered view').toBe(1)
    expect(new URL(canonicals[0]).pathname, 'filtered view canonicalizes to the bare path').toBe(
      PATH,
    )
    // Title must not vary by filter either.
    expect(getTitle(html), 'title is stable across filters').toBe(
      getTitle(await fetchHtml(request, PATH)),
    )
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(getMetaProperty(html, 'og:title'), 'og:title present').toBeTruthy()
    expect(getMetaProperty(html, 'og:description'), 'og:description present').toBeTruthy()
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogUrl, 'og:url present').toBeTruthy()
    expect(new URL(ogUrl!).pathname, 'og:url points at the testimonials path').toBe(PATH)
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('Testimonials — JSON-LD structured data', () => {
  test('the site-wide Organization node parses; no page-specific Service node is added', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    expect(nodes.length, 'at least one application/ld+json block').toBeGreaterThan(0)

    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'an Organization node must be present (from the layout)').toBeTruthy()
    expect(org!.node.url as string, 'Organization.url is absolute').toMatch(/^https?:\/\/[^/]+/i)

    // The index introduces no new JSON-LD type (issue #18: Organization is site-wide).
    expect(
      nodes.find(({ node }) => typeMatches(node, 'Service')),
      'no Service node on the testimonials index',
    ).toBeFalsy()
  })
})

// --------------------------- Server-rendered content ------------------------

test.describe('Testimonials — server-rendered content (raw HTML, no JS)', () => {
  test('hero + intro copy are in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html, 'hero eyebrow').toContain('In their own words')
    expect(html, 'hero headline').toMatch(/What districts say/i)
    expect(html, 'intro lead').toMatch(/Filterable by service and role/i)
  })

  test('all service filter chips render as links in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // The service chips are always present (schema-driven, not content-driven).
    for (const label of ['All', 'AI Training', 'Budget Software', 'Consulting', 'General']) {
      expect(html, `service chip "${label}"`).toContain(label)
    }
    // Chips are real links (anchors carrying the filter query), server-rendered.
    expect(html, 'a service chip links via ?service=').toMatch(
      /href="[^"]*\?service=budget-software/,
    )
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1> in the server HTML').toBe(1)
  })

  test('renders either the grid or a sensible empty state (never a blank page)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const hasGrid = html.includes('data-testid="testimonials-grid"')
    const hasEmpty = html.includes('data-testid="testimonials-empty"')
    expect(hasGrid || hasEmpty, 'the content region resolves to a grid or an empty state').toBe(
      true,
    )
    // Never leaves stray scaffolding regardless of content state.
    expect(html).not.toMatch(/>\s*undefined\s*</)
    expect(html).not.toMatch(/>\s*null\s*</)
  })
})

// ----------------------- Filter-chip behavior (browser) ---------------------

test.describe('Testimonials — filter chips (real navigation)', () => {
  test('clicking a service chip navigates to its filter and marks it active', async ({ page }) => {
    await page.goto(PATH)
    const chips = page.locator('[data-testid="filter-service"]')

    // "All" is the active default (aria-current) on the unfiltered view.
    await expect(chips.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'true')

    await chips.getByRole('link', { name: 'Budget Software' }).click()
    await expect(page, 'URL carries the service filter').toHaveURL(/\?service=budget-software/)

    // The clicked chip is now the active one; "All" no longer is.
    const active = page.locator('[data-testid="filter-service"]')
    await expect(active.getByRole('link', { name: 'Budget Software' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(active.getByRole('link', { name: 'All' })).not.toHaveAttribute(
      'aria-current',
      'true',
    )
  })
})

// ------------------------- Responsive / accessibility -----------------------

test.describe('Testimonials — responsive & accessibility smoke', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'no horizontal overflow at 390px').toBeLessThanOrEqual(390)
  })

  test('has exactly one H1', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('heading levels within the page never skip', async ({ page }) => {
    await page.goto(PATH)
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
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute (present, may be empty)`).not.toBeNull()
    }
  })

  test('the first service filter chip is keyboard-reachable', async ({ page }) => {
    await page.goto(PATH)
    const chip = page.locator('[data-testid="filter-service"]').getByRole('link').first()
    const tabindex = await chip.getAttribute('tabindex')
    expect(
      tabindex === null || Number(tabindex) >= 0,
      'filter chip must not have a negative tabindex',
    ).toBe(true)
    await chip.focus()
    await expect(chip).toBeFocused()
  })
})
