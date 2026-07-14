import { test, expect, type APIRequestContext, type Locator } from '@playwright/test'

/**
 * About (`/about`) — server-rendering, SEO surface, structured data, accessibility,
 * and the manifesto-band WCAG contrast guard (issue #7).
 *
 * Mirrors tests/e2e/home.e2e.spec.ts: the SSR/SEO/JSON-LD assertions read the *raw*
 * server HTML via APIRequestContext (a plain HTTP GET — no browser, no JS execution),
 * so anything only present after client hydration fails. That is the point: PRD §10.1
 * requires public pages to be server-rendered so Google and the AI crawlers (GPTBot,
 * ClaudeBot, PerplexityBot, Google-Extended) receive crawlable HTML.
 *
 * /about is fully static (design/site/pages.jsx → AboutPage) with no CMS data, so no
 * DB seeding is required. The shared chrome (Nav, Footer, and the site-wide
 * Organization JSON-LD) comes from the frontend layout; this page adds its own
 * sections + the Person JSON-LD.
 *
 * Divergence from the homepage green-band guard (flagged by the page's author): the
 * manifesto band has NO <p>. Its label is a <div> kicker and its quote a
 * <blockquote className="h1">, so the homepage's `[data-testid] p` contrast loop does
 * not apply here — the kicker and blockquote are asserted directly instead.
 */

// ---------- raw-HTML helpers (dependency-free head/JSON-LD parsing) ----------
// Duplicated from home.e2e.spec.ts to keep each e2e file self-contained (the suite's
// existing convention), plus getMetaProperty for Open Graph — Next emits OG tags as
// <meta property="og:..."> (not name=), which getMetaContent would silently miss.

async function fetchHtml(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path)
  expect(res.status(), `GET ${path} must return 200`).toBe(200)
  const ct = res.headers()['content-type'] ?? ''
  expect(ct, `GET ${path} must serve HTML`).toMatch(/text\/html/i)
  return res.text()
}

const fetchAboutHtml = (request: APIRequestContext) => fetchHtml(request, '/about')

/** Extract the text of the first <title>. */
function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : null
}

/** Value of a named <meta name="..." content="..."> (attribute order agnostic). */
function getMetaContent(html: string, name: string): string | null {
  const tagRe = /<meta\b[^>]*>/gi
  for (const tag of html.match(tagRe) ?? []) {
    const nameM = tag.match(/\bname=["']([^"']*)["']/i)
    if (nameM && nameM[1].toLowerCase() === name.toLowerCase()) {
      const contentM = tag.match(/\bcontent=["']([\s\S]*?)["']/i)
      return contentM ? contentM[1].trim() : null
    }
  }
  return null
}

/**
 * Value of a <meta property="..." content="..."> tag — the Open Graph shape. Next
 * renders og:* as `property=`, so the name-based getter above never matches them;
 * this is the load-bearing difference for the OG coverage.
 */
function getMetaProperty(html: string, property: string): string | null {
  const tagRe = /<meta\b[^>]*>/gi
  for (const tag of html.match(tagRe) ?? []) {
    const propM = tag.match(/\bproperty=["']([^"']*)["']/i)
    if (propM && propM[1].toLowerCase() === property.toLowerCase()) {
      const contentM = tag.match(/\bcontent=["']([\s\S]*?)["']/i)
      return contentM ? contentM[1].trim() : null
    }
  }
  return null
}

/** href values of every <link rel="canonical"> (there should be exactly one). */
function getCanonicals(html: string): string[] {
  const tagRe = /<link\b[^>]*>/gi
  const out: string[] = []
  for (const tag of html.match(tagRe) ?? []) {
    const relM = tag.match(/\brel=["']([^"']*)["']/i)
    if (relM && relM[1].toLowerCase() === 'canonical') {
      const hrefM = tag.match(/\bhref=["']([^"']*)["']/i)
      if (hrefM) out.push(hrefM[1].trim())
    }
  }
  return out
}

type JsonLdNode = Record<string, unknown> & { '@type'?: string | string[]; '@context'?: unknown }

/** Count of raw <script type="application/ld+json"> blocks, before any flattening. */
function countJsonLdBlocks(html: string): number {
  const blockRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  return (html.match(blockRe) ?? []).length
}

/**
 * Parse every <script type="application/ld+json"> block into a flat list of nodes,
 * each tagged with the effective @context inherited from its wrapper.
 */
function collectJsonLdNodes(html: string): Array<{ node: JsonLdNode; context: unknown }> {
  const blockRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const out: Array<{ node: JsonLdNode; context: unknown }> = []
  for (const m of html.matchAll(blockRe)) {
    const parsed = JSON.parse(m[1].trim())
    const roots = Array.isArray(parsed) ? parsed : [parsed]
    for (const root of roots) {
      const context = (root as JsonLdNode)['@context']
      const graph = (root as { '@graph'?: unknown })['@graph']
      const nodes = Array.isArray(graph) ? graph : [root]
      for (const node of nodes) {
        out.push({ node: node as JsonLdNode, context: (node as JsonLdNode)['@context'] ?? context })
      }
    }
  }
  return out
}

function typeMatches(node: JsonLdNode, type: string): boolean {
  const t = node['@type']
  return Array.isArray(t) ? t.includes(type) : t === type
}

// ------------------------------- SSR content --------------------------------

test.describe('About — server-rendered content (raw HTML, no JS)', () => {
  test('hero, founder, and mission copy are present in the server HTML', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    // Hero headline "We sat in your seat. Now we build for it." (design AboutPage).
    expect(html).toMatch(/We sat in/i)
    expect(html).toMatch(/your seat/i)
    expect(html).toMatch(/Now we build for it/i)
    // Founder name (also the Person JSON-LD subject) and mission heading.
    expect(html).toContain('Aziz Aghayev')
    expect(html).toMatch(/Equip K-12 districts with the tools and partners/i)
  })

  test('the three mission pillars are present in the server HTML', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    for (const pillar of ['Operator credibility', 'Partner, not vendor', 'K-12 first']) {
      expect(html, `pillar "${pillar}" must be server-rendered`).toContain(pillar)
    }
  })

  test('the manifesto quote is present in the server HTML', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    // "I sat in <span>your seat</span> for fifteen years. flowlyst is the partner..."
    expect(html).toMatch(/I sat in/i)
    expect(html).toMatch(/for fifteen years/i)
    expect(html).toMatch(/the partner I wished/i)
  })

  test('the offerings cross-link section is present in the server HTML', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    expect(html).toMatch(/Four ways to/i)
    for (const offering of ['Budget Software', 'AI Training', 'Consulting', 'Keynotes']) {
      expect(html, `offering "${offering}" must be server-rendered`).toContain(offering)
    }
  })
})

// ------------------------------- SEO surface --------------------------------

test.describe('About — SEO metadata (raw HTML, no JS)', () => {
  test('has a unique, flowlyst-branded <title> distinct from the homepage', async ({ request }) => {
    const aboutHtml = await fetchAboutHtml(request)
    const homeHtml = await fetchHtml(request, '/')
    const aboutTitle = getTitle(aboutHtml)
    const homeTitle = getTitle(homeHtml)

    expect(aboutTitle, '<title> must be present').toBeTruthy()
    expect(aboutTitle!.length).toBeGreaterThan(0)
    expect(aboutTitle!).toMatch(/flowlyst/i)
    // "Unique per page" (PRD §10.1) — not merely present: it must differ from the home title.
    expect(aboutTitle, 'about <title> must be unique vs the homepage').not.toBe(homeTitle)
  })

  test('has a distinct, non-empty <meta description> unique from the homepage', async ({
    request,
  }) => {
    const aboutHtml = await fetchAboutHtml(request)
    const homeHtml = await fetchHtml(request, '/')
    const aboutDesc = getMetaContent(aboutHtml, 'description')
    const aboutTitle = getTitle(aboutHtml)
    const homeDesc = getMetaContent(homeHtml, 'description')

    expect(aboutDesc, '<meta name="description"> must be present').toBeTruthy()
    expect(
      aboutDesc!.length,
      'description must be a usable length, not a stub',
    ).toBeGreaterThanOrEqual(50)
    // Title and description serve different roles; they must not be identical.
    expect(aboutDesc).not.toBe(aboutTitle)
    // Unique per page (PRD §10.1): distinct from the homepage description.
    expect(aboutDesc, 'about description must be unique vs the homepage').not.toBe(homeDesc)
  })

  test('has exactly one canonical, absolute, pointing at /about', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // A missing/misconfigured metadataBase renders canonical as a relative path — this
    // fails loudly on that: it must be a full scheme+host URL, not a bare path.
    expect(canonical, 'canonical must be an absolute URL with scheme + host').toMatch(
      /^https?:\/\/[^/]+/i,
    )
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    // Port/host-agnostic: assert the path resolves to /about, not a hardcoded origin.
    expect(new URL(canonical).pathname, 'about canonical path must be "/about"').toBe('/about')
  })

  test('Open Graph tags are present and correct (property-based)', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    // og:* is emitted as property=, which the name-based getter would miss entirely.
    const ogTitle = getMetaProperty(html, 'og:title')
    const ogDesc = getMetaProperty(html, 'og:description')
    const ogUrl = getMetaProperty(html, 'og:url')
    const ogType = getMetaProperty(html, 'og:type')
    const ogSite = getMetaProperty(html, 'og:site_name')

    expect(ogTitle, 'og:title must be present').toBeTruthy()
    expect(ogTitle!).toMatch(/flowlyst/i)
    expect(ogDesc, 'og:description must be present and non-trivial').toBeTruthy()
    expect(ogDesc!.length).toBeGreaterThanOrEqual(50)
    expect(ogType, 'og:type must be "website"').toBe('website')
    expect(ogSite, 'og:site_name must be flowlyst').toBe('flowlyst')
    expect(ogUrl, 'og:url must be an absolute URL').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(ogUrl!).pathname, 'og:url path must be "/about"').toBe('/about')
  })

  test('Twitter card tags are present (name-based)', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    // twitter:* uses name= (unlike og:*), so the name-based getter is correct here.
    expect(getMetaContent(html, 'twitter:card'), 'twitter:card must be summary_large_image').toBe(
      'summary_large_image',
    )
    expect(getMetaContent(html, 'twitter:title'), 'twitter:title must be present').toMatch(
      /flowlyst/i,
    )
  })
})

// --------------------------- Structured data --------------------------------

test.describe('About — JSON-LD (Organization + Person)', () => {
  test('embeds exactly two ld+json nodes: the layout Organization and the page Person', async ({
    request,
  }) => {
    const html = await fetchAboutHtml(request)
    // Exactly two blocks: Organization (root layout) + Person (this page). No @graph
    // is used, so block count and node count coincide.
    expect(countJsonLdBlocks(html), 'exactly two application/ld+json blocks').toBe(2)
    const nodes = collectJsonLdNodes(html) // throws on malformed JSON — parse validity is asserted
    expect(nodes.length, 'exactly two JSON-LD nodes').toBe(2)

    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    const person = nodes.find(({ node }) => typeMatches(node, 'Person'))
    expect(org, 'an Organization JSON-LD node must be present (site-wide)').toBeTruthy()
    expect(person, 'a Person JSON-LD node must be present (About)').toBeTruthy()

    // Organization shape (site-wide node): strict on essentials.
    const orgCtx = Array.isArray(org!.context) ? org!.context.join(' ') : String(org!.context ?? '')
    expect(orgCtx, 'Organization @context must reference schema.org').toMatch(/schema\.org/i)
    expect(typeof org!.node.name, 'Organization.name must be a string').toBe('string')
    expect(org!.node.url as string, 'Organization.url must be absolute').toMatch(
      /^https?:\/\/[^/]+/i,
    )
  })

  test('the Person node parses and is shape-valid (Aziz Aghayev)', async ({ request }) => {
    const html = await fetchAboutHtml(request)
    const nodes = collectJsonLdNodes(html)
    const person = nodes.find(({ node }) => typeMatches(node, 'Person'))
    expect(person, 'a Person JSON-LD node must be present').toBeTruthy()

    const ctx = Array.isArray(person!.context)
      ? person!.context.join(' ')
      : String(person!.context ?? '')
    expect(ctx, 'Person @context must reference schema.org').toMatch(/schema\.org/i)

    const node = person!.node
    expect(node.name, 'Person.name must be Aziz Aghayev').toBe('Aziz Aghayev')
    expect(typeof node.jobTitle, 'Person.jobTitle must be a string').toBe('string')
    expect((node.jobTitle as string).length, 'Person.jobTitle non-empty').toBeGreaterThan(0)
    // url is present and points at /about (port/host-agnostic).
    expect(typeof node.url, 'Person.url must be a string').toBe('string')
    expect(new URL(node.url as string).pathname, 'Person.url path must be "/about"').toBe('/about')
    // worksFor must resolve to the flowlyst Organization.
    const worksFor = node.worksFor as JsonLdNode | undefined
    expect(worksFor, 'Person.worksFor must be present').toBeTruthy()
    expect(typeMatches(worksFor!, 'Organization'), 'worksFor must be an Organization').toBe(true)
    expect(worksFor!.name, 'worksFor.name must be flowlyst').toBe('flowlyst')
  })
})

// ------------------------- Accessibility smoke ------------------------------

test.describe('About — accessibility smoke', () => {
  test('has exactly one H1', async ({ page }) => {
    await page.goto('/about')
    // The manifesto <blockquote className="h1"> is styled like an H1 but is NOT an
    // <h1> element, so the hero heading remains the page's only true H1.
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('page headings have no skipped levels (h1 → h2 → h3, no jumps)', async ({ page }) => {
    await page.goto('/about')
    // Scope to <main> (the page's own hierarchy), ignoring shared Nav/Footer chrome.
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'))
        .map((h) => Number(h.tagName[1]))
        .filter((n) => !Number.isNaN(n)),
    )
    expect(levels.length, 'the page must have at least one heading in <main>').toBeGreaterThan(0)
    expect(levels[0], 'the first heading in <main> must be the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      // Descending (e.g. h3 → h2) is fine; only a downward jump > 1 (e.g. h1 → h3) skips a level.
      expect(
        levels[i] - levels[i - 1],
        `heading level jumped from h${levels[i - 1]} to h${levels[i]} (skipped a level)`,
      ).toBeLessThanOrEqual(1)
    }
  })

  test('every <img> carries an alt attribute', async ({ page }) => {
    await page.goto('/about')
    // The founder portrait is inline SVG (decorative, aria-hidden), so /about itself
    // ships no <img>; this guards the shared chrome and any future imagery on the page.
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute (present, may be empty)`).not.toBeNull()
    }
  })

  test('the founder section links to /testimonials ("What districts say")', async ({ page }) => {
    await page.goto('/about')
    const link = page
      .locator('[data-testid="about-founder"]')
      .getByRole('link', { name: /what districts say/i })
    await expect(
      link,
      'the "What districts say" CTA must exist in the founder section',
    ).toHaveCount(1)
    await expect(link).toHaveAttribute('href', '/testimonials')
  })
})

// ----------------- WCAG 1.4.3 contrast (manifesto green band) ----------------

test.describe('About — WCAG 1.4.3 contrast on the manifesto green band', () => {
  const WHITE = 'rgb(255, 255, 255)'

  // WCAG "large text": >=18pt (24px) regular, or >=14pt (18.66px) bold (weight >=700).
  const isLargeText = (fontSizePx: number, fontWeight: number) =>
    fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700)

  const computed = (
    locator: Locator,
  ): Promise<{ fontSize: number; fontWeight: number; color: string }> =>
    locator.evaluate((el) => {
      const s = getComputedStyle(el)
      return { fontSize: parseFloat(s.fontSize), fontWeight: Number(s.fontWeight), color: s.color }
    })

  test('the kicker renders at 19px/700 full-opacity white (load-bearing for contrast)', async ({
    page,
  }) => {
    await page.goto('/about')
    // Structural target: the manifesto container's only direct <div> child is the kicker
    // (its sibling is the <blockquote>). Guards the exact contract the page comments as
    // load-bearing — white on #00A568 is 3.19:1, which clears AA only as WCAG large text.
    const kicker = page.locator('[data-testid="about-manifesto"] .container > div')
    await expect(kicker, 'exactly one kicker <div> in the manifesto band').toHaveCount(1)
    await expect(kicker).toContainText('Aziz on flowlyst')

    const c = await computed(kicker)
    expect(c.fontSize, 'kicker font-size must be 19px').toBe(19)
    expect(c.fontWeight, 'kicker font-weight must be 700').toBe(700)
    expect(c.color, 'kicker must be full-opacity white (no alpha)').toBe(WHITE)
    // Why those exact values matter: they are the minimum that clears the WCAG
    // large-text bar (>=18.66px at weight >=700). If the size shrinks or the weight
    // drops, contrast silently regresses to an AA fail — this catches it.
    expect(
      isLargeText(c.fontSize, c.fontWeight),
      `kicker must clear the WCAG large-text floor — got ${c.fontSize}px/${c.fontWeight}`,
    ).toBe(true)
  })

  test('the blockquote and its .accent--yellow run render full white as large text', async ({
    page,
  }) => {
    await page.goto('/about')
    const quote = page.locator('[data-testid="about-manifesto"] blockquote')
    await expect(quote, 'exactly one manifesto blockquote').toHaveCount(1)
    const q = await computed(quote)
    expect(q.color, 'blockquote must be full-opacity white on green').toBe(WHITE)
    expect(
      isLargeText(q.fontSize, q.fontWeight),
      `blockquote must be WCAG large text — got ${q.fontSize}px/${q.fontWeight}`,
    ).toBe(true)

    // The design's yellow "your seat" accent can't reach 3:1 on green at any size, so
    // the shared .section--green rule recolors it to white — mirrors the homepage guard.
    const accent = page.locator('[data-testid="about-manifesto"] .accent--yellow')
    await expect(accent, 'the manifesto has a .accent--yellow run').toHaveCount(1)
    const a = await computed(accent)
    expect(a.color, '.accent--yellow must be recolored full white on green').toBe(WHITE)
  })

  test('the manifesto band has no <p> (kicker is a <div>, quote is a <blockquote>)', async ({
    page,
  }) => {
    await page.goto('/about')
    // Documents the divergence from the homepage green-band guard: there is no body <p>
    // here, so the homepage's `[data-testid] p` contrast loop is intentionally not reused.
    await expect(page.locator('[data-testid="about-manifesto"] p')).toHaveCount(0)
  })
})

// --------------------------- Reflow (WCAG 1.4.10) ---------------------------

test.describe('About — reflow', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/about')
    // WCAG 1.4.10 reflow guard (mirrors the homepage check). The hero's oversized faded
    // mark is absolutely positioned inside an overflow:hidden section; if any section
    // pushes the document past the viewport, this fails.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'document must not scroll horizontally at 390px').toBeLessThanOrEqual(390)
  })
})
