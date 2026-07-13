import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Homepage — server-rendering, SEO surface, and accessibility smoke (issue #6).
 *
 * The SSR/SEO assertions read the *raw* server HTML via the APIRequestContext
 * (a plain HTTP GET, no browser, no JS execution). If content only appears after
 * client hydration these fail — which is exactly the point: PRD §10.1 requires
 * public pages to be server-rendered so Google and AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, Google-Extended) get crawlable HTML.
 *
 * The static design content (hero, four offerings, "many tools / one platform",
 * stat strip) is hardcoded per design/site/home.jsx — not CMS-driven — so these
 * tests need no database seeding. The CMS-driven sections (testimonials, blog
 * teaser) are proven separately in tests/int/home-cms.int.spec.ts, where the DB
 * can be controlled deterministically.
 */

// ---------- raw-HTML helpers (dependency-free head/JSON-LD parsing) ----------

async function fetchHomeHtml(request: APIRequestContext): Promise<string> {
  const res = await request.get('/')
  expect(res.status(), 'GET / must return 200').toBe(200)
  const ct = res.headers()['content-type'] ?? ''
  expect(ct, 'GET / must serve HTML').toMatch(/text\/html/i)
  return res.text()
}

/** Extract the text of the first <title>. */
function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : null
}

/** Value of a named <meta name="..." content="..."> (attribute order agnostic). */
function getMetaContent(html: string, name: string): string | null {
  // Match any <meta ...> tag, then require it carries the requested name and pull content.
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

/**
 * Parse every <script type="application/ld+json"> block and flatten into a list
 * of nodes, each tagged with the effective @context inherited from its wrapper
 * (a node inside an @graph or array does not repeat @context).
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

test.describe('Homepage — server-rendered content (raw HTML, no JS)', () => {
  test('hero is present in the server HTML', async ({ request }) => {
    const html = await fetchHomeHtml(request)
    // Core positioning headline: "Many tools. One platform." (design/site/home.jsx).
    expect(html).toMatch(/Many tools/i)
    expect(html).toMatch(/One platform/i)
    // Hero primary CTA.
    expect(html).toMatch(/Request a demo/i)
  })

  test('the four offerings are present in the server HTML', async ({ request }) => {
    const html = await fetchHomeHtml(request)
    for (const offering of ['Budget Software', 'AI Training', 'Consulting', 'Keynotes']) {
      expect(html, `offering "${offering}" must be server-rendered`).toContain(offering)
    }
    // The offerings framing copy ("One vendor. Four ways to work with us.").
    expect(html).toMatch(/Four ways/i)
  })

  test('the stat strip is present in the server HTML', async ({ request }) => {
    const html = await fetchHomeHtml(request)
    // Brand stats from the manifesto band.
    expect(html).toMatch(/100%/)
    expect(html).toMatch(/2,?000\+/)
    expect(html).toMatch(/500\+/)
    // At least one of the stat labels, so we prove it's the stat strip, not a
    // stray number elsewhere.
    expect(html).toMatch(/satisfaction|trained|hours saved/i)
  })
})

// ------------------------------- SEO surface --------------------------------

test.describe('Homepage — SEO metadata (raw HTML, no JS)', () => {
  test('has a non-empty, flowlyst-branded <title>', async ({ request }) => {
    const html = await fetchHomeHtml(request)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!.length).toBeGreaterThan(0)
    expect(title!).toMatch(/flowlyst/i)
  })

  test('has a distinct, non-empty <meta description>', async ({ request }) => {
    const html = await fetchHomeHtml(request)
    const description = getMetaContent(html, 'description')
    const title = getTitle(html)
    expect(description, '<meta name="description"> must be present').toBeTruthy()
    // A usable SEO description — present and of sane length, not a stub.
    expect(description!.length).toBeGreaterThanOrEqual(50)
    // Title and description must not be identical (they serve different roles).
    expect(description).not.toBe(title)
  })

  test('exactly one canonical link, absolute, pointing at the site root', async ({ request }) => {
    const html = await fetchHomeHtml(request)
    const canonicals = getCanonicals(html)
    // A duplicate canonical is itself an SEO defect.
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // The high-value assertion: a missing/misconfigured Next `metadataBase` renders
    // canonical as a relative path — this fails loudly on that. It must be a full
    // scheme+host URL, not a bare path.
    expect(canonical, 'canonical must be an absolute URL with scheme + host').toMatch(
      /^https?:\/\/[^/]+/i,
    )
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    // The homepage canonical must resolve to the site root, not some other path.
    expect(new URL(canonical).pathname, 'homepage canonical path must be "/"').toBe('/')
  })
})

// --------------------------- Structured data --------------------------------

test.describe('Homepage — Organization JSON-LD', () => {
  test('embeds a schema.org Organization node that parses and is shape-valid', async ({
    request,
  }) => {
    const html = await fetchHomeHtml(request)
    // Every ld+json block must parse (collectJsonLdNodes throws on malformed JSON).
    const nodes = collectJsonLdNodes(html)
    expect(nodes.length, 'at least one application/ld+json block').toBeGreaterThan(0)

    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'an Organization JSON-LD node must be present').toBeTruthy()

    // schema.org context (top-level or inherited from the wrapper/@graph).
    const context = org!.context
    const contextStr = Array.isArray(context) ? context.join(' ') : String(context ?? '')
    expect(contextStr, '@context must reference schema.org').toMatch(/schema\.org/i)

    // Required shape: strict on the essentials, tolerant of optional props.
    const node = org!.node
    expect(typeof node.name, 'Organization.name must be a string').toBe('string')
    expect((node.name as string).length, 'Organization.name non-empty').toBeGreaterThan(0)
    expect(typeof node.url, 'Organization.url must be a string').toBe('string')
    expect(node.url as string, 'Organization.url must be absolute').toMatch(/^https?:\/\/[^/]+/i)
  })
})

// ------------------------- Accessibility smoke ------------------------------

test.describe('Homepage — accessibility smoke', () => {
  test('has exactly one H1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('every <img> carries an alt attribute', async ({ page }) => {
    await page.goto('/')
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      // alt may be "" for decorative images — the attribute must be PRESENT.
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute (present, may be empty)`).not.toBeNull()
    }
  })

  test('the hero primary CTA is keyboard-focusable (reachable)', async ({ page }) => {
    await page.goto('/')
    // Scope to the hero section — "Request a demo" also appears in the nav and the
    // offerings list. Native anchors are focusable; prove the hero CTA can actually
    // take focus (not removed from the tab order via tabindex=-1 or aria-hidden).
    const cta = page
      .locator('[data-testid="home-hero"]')
      .getByRole('link', { name: /request a demo/i })
    await cta.focus()
    await expect(cta).toBeFocused()
  })
})
