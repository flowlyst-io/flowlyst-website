import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Case studies index (`/case-studies`) — server-rendering, SEO surface, structured
 * data, accessibility, and reflow (issue #19).
 *
 * Mirrors tests/e2e/about.e2e.spec.ts: the SSR/SEO/JSON-LD assertions read the *raw*
 * server HTML via APIRequestContext (a plain HTTP GET — no browser, no JS execution),
 * so anything only present after client hydration fails. PRD §10.1 requires public
 * pages to be server-rendered so Google and the AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, Google-Extended) receive crawlable HTML.
 *
 * Scope is the INDEX page against its empty state (no published case studies in the
 * test DB — real content lands with #20). The populated index cards, the detail-page
 * story sections, and the detail Article JSON-LD are proven in
 * tests/int/case-studies-cms.int.spec.ts, which renders the real components against a
 * seeded Local-API DB — the reliable way to assert CMS-driven rendering without
 * coordinating a seed across the running dev server's process.
 */

// ---------- raw-HTML helpers (dependency-free head/JSON-LD parsing) ----------
// Duplicated per the suite's self-contained-e2e convention (see about.e2e.spec.ts).

async function fetchHtml(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path)
  expect(res.status(), `GET ${path} must return 200`).toBe(200)
  const ct = res.headers()['content-type'] ?? ''
  expect(ct, `GET ${path} must serve HTML`).toMatch(/text\/html/i)
  return res.text()
}

const fetchCaseStudiesHtml = (request: APIRequestContext) => fetchHtml(request, '/case-studies')

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : null
}

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

test.describe('Case studies — server-rendered content (raw HTML, no JS)', () => {
  test('the hero copy is present in the server HTML', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    expect(html).toMatch(/Long-form district stories/i)
    expect(html).toMatch(/How districts ship/i)
    expect(html).toMatch(/with the metrics and the names/i)
  })

  test('the empty state renders when no case studies are published', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    // Deterministic in this DB (int-test teardown + fresh feature DB leave it empty).
    expect(html).toContain('data-testid="case-studies-empty"')
    expect(html).toMatch(/district stories are on the way/i)
    // The empty state offers a lead-capture path forward.
    expect(html).toContain('href="/request-demo"')
  })
})

// ------------------------------- SEO surface --------------------------------

test.describe('Case studies — SEO metadata (raw HTML, no JS)', () => {
  test('has a unique, flowlyst-branded <title> distinct from the homepage', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    const homeHtml = await fetchHtml(request, '/')
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!).toMatch(/flowlyst/i)
    expect(title!).toMatch(/case stud/i)
    expect(title, 'title must be unique vs the homepage').not.toBe(getTitle(homeHtml))
  })

  test('has a distinct, non-empty <meta description>', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    const desc = getMetaContent(html, 'description')
    expect(desc, '<meta name="description"> must be present').toBeTruthy()
    expect(desc!.length, 'description must be a usable length').toBeGreaterThanOrEqual(50)
    expect(desc).not.toBe(getTitle(html))
  })

  test('has exactly one canonical, absolute, pointing at /case-studies', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    expect(canonical, 'canonical must be an absolute URL with scheme + host').toMatch(
      /^https?:\/\/[^/]+/i,
    )
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    expect(new URL(canonical).pathname, 'canonical path must be "/case-studies"').toBe(
      '/case-studies',
    )
  })

  test('Open Graph and Twitter tags are present and correct', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    expect(getMetaProperty(html, 'og:title'), 'og:title present').toMatch(/flowlyst/i)
    expect(getMetaProperty(html, 'og:description')!.length).toBeGreaterThanOrEqual(50)
    expect(getMetaProperty(html, 'og:type'), 'og:type website').toBe('website')
    expect(getMetaProperty(html, 'og:site_name'), 'og:site_name flowlyst').toBe('flowlyst')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogUrl, 'og:url absolute').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(ogUrl!).pathname, 'og:url path is /case-studies').toBe('/case-studies')
    expect(getMetaContent(html, 'twitter:card'), 'twitter:card').toBe('summary_large_image')
  })
})

// --------------------------- Structured data --------------------------------

test.describe('Case studies index — JSON-LD (site-wide Organization only)', () => {
  test('the layout Organization node is present and parses', async ({ request }) => {
    const html = await fetchCaseStudiesHtml(request)
    // The index carries no Article node (that is on the detail page); only the
    // layout's site-wide Organization should be present here.
    const nodes = collectJsonLdNodes(html) // throws on malformed JSON — parse validity asserted
    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'an Organization JSON-LD node must be present (site-wide)').toBeTruthy()
    expect(
      nodes.find(({ node }) => typeMatches(node, 'Article')),
      'no Article on the index',
    ).toBeFalsy()
    const orgCtx = Array.isArray(org!.context) ? org!.context.join(' ') : String(org!.context ?? '')
    expect(orgCtx, 'Organization @context references schema.org').toMatch(/schema\.org/i)
  })
})

// ------------------------- Accessibility smoke ------------------------------

test.describe('Case studies — accessibility smoke', () => {
  test('has exactly one H1', async ({ page }) => {
    await page.goto('/case-studies')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('page headings have no skipped levels (h1 → h2, no jumps)', async ({ page }) => {
    await page.goto('/case-studies')
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'))
        .map((h) => Number(h.tagName[1]))
        .filter((n) => !Number.isNaN(n)),
    )
    expect(levels.length, 'at least one heading in <main>').toBeGreaterThan(0)
    expect(levels[0], 'the first heading in <main> must be the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i] - levels[i - 1],
        `heading level jumped from h${levels[i - 1]} to h${levels[i]}`,
      ).toBeLessThanOrEqual(1)
    }
  })

  test('every <img> carries an alt attribute', async ({ page }) => {
    await page.goto('/case-studies')
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute`).not.toBeNull()
    }
  })
})

// --------------------------- Reflow (WCAG 1.4.10) ---------------------------

test.describe('Case studies — reflow', () => {
  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/case-studies')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'document must not scroll horizontally at 390px').toBeLessThanOrEqual(390)
  })
})
