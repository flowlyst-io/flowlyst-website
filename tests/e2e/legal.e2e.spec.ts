import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Legal pages — /privacy, /terms, /cookies (issue #22).
 *
 * Mirrors tests/e2e/about.e2e.spec.ts: the SSR/SEO/JSON-LD assertions read the *raw*
 * server HTML via APIRequestContext (a plain HTTP GET — no browser, no JS), so anything
 * only present after hydration fails. PRD §10.1 requires these public pages to be
 * server-rendered so every legal word reaches Google and the AI crawlers.
 *
 * The pages are fully static (content authored in src/content/legal/*, rendered by the
 * LegalPage shell), so no DB seeding is required. The layout owns Nav/Footer and the
 * site-wide Organization JSON-LD; each legal page adds NO page-specific structured data,
 * so exactly one ld+json block (Organization) must appear.
 */

// ---------- raw-HTML helpers (dependency-free head parsing) ----------

async function fetchHtml(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path)
  expect(res.status(), `GET ${path} must return 200`).toBe(200)
  const ct = res.headers()['content-type'] ?? ''
  expect(ct, `GET ${path} must serve HTML`).toMatch(/text\/html/i)
  return res.text()
}

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

type JsonLdNode = Record<string, unknown> & { '@type'?: string | string[] }

function countJsonLdBlocks(html: string): number {
  const blockRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  return (html.match(blockRe) ?? []).length
}

function collectJsonLdNodes(html: string): JsonLdNode[] {
  const blockRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const out: JsonLdNode[] = []
  for (const m of html.matchAll(blockRe)) {
    const parsed = JSON.parse(m[1].trim())
    const roots = Array.isArray(parsed) ? parsed : [parsed]
    for (const root of roots) out.push(root as JsonLdNode)
  }
  return out
}

function typeMatches(node: JsonLdNode, type: string): boolean {
  const t = node['@type']
  return Array.isArray(t) ? t.includes(type) : t === type
}

// Per-doc expectations: path, H1, a distinctive section heading, and a marker that a
// [FOR TURAL] flag rendered (privacy/terms/cookies all carry at least one).
const PAGES = [
  {
    path: '/privacy',
    h1: 'Privacy policy',
    heading: 'Information we collect',
    body: 'Vercel',
    hasFlag: true,
  },
  {
    path: '/terms',
    h1: 'Terms of service',
    heading: 'Intellectual property',
    body: 'as is',
    hasFlag: true,
  },
  {
    path: '/cookies',
    h1: 'Cookie policy',
    heading: 'Cookies we use',
    body: 'fl_cookie_consent',
    hasFlag: true,
  },
] as const

// ------------------------------- SSR content --------------------------------

test.describe('Legal pages — server-rendered content (raw HTML, no JS)', () => {
  for (const p of PAGES) {
    test(`${p.path} renders its title, a section heading, and real copy in the server HTML`, async ({
      request,
    }) => {
      const html = await fetchHtml(request, p.path)
      expect(html, `${p.path} H1 present`).toContain(p.h1)
      expect(html, `${p.path} section "${p.heading}" present`).toContain(p.heading)
      expect(html, `${p.path} real body copy present`).toContain(p.body)
    })

    test(`${p.path} shows the draft notice and a "Needs Tural's input" gap flag`, async ({
      request,
    }) => {
      const html = await fetchHtml(request, p.path)
      expect(html, 'draft notice must be visible on the page').toContain(
        'Draft — pending legal review',
      )
      // Every legal draft has at least one [FOR TURAL] gap flag (see PR body list).
      expect(html, `${p.path} must render a visible gap flag`).toContain('Needs Tural’s input')
    })
  }
})

// ------------------------------- SEO surface --------------------------------

test.describe('Legal pages — SEO metadata (raw HTML, no JS)', () => {
  test('each has a unique, flowlyst-branded <title> distinct from the others and home', async ({
    request,
  }) => {
    const homeTitle = getTitle(await fetchHtml(request, '/'))
    const titles = new Map<string, string | null>()
    for (const p of PAGES) titles.set(p.path, getTitle(await fetchHtml(request, p.path)))

    for (const [path, title] of titles) {
      expect(title, `${path} <title> present`).toBeTruthy()
      expect(title!).toMatch(/flowlyst/i)
      expect(title, `${path} <title> unique vs homepage`).not.toBe(homeTitle)
    }
    // Unique across the three legal pages.
    const values = [...titles.values()]
    expect(new Set(values).size, 'all three legal titles are distinct').toBe(values.length)
  })

  test('each has a distinct, non-trivial <meta description>', async ({ request }) => {
    const homeDesc = getMetaContent(await fetchHtml(request, '/'), 'description')
    const descs: string[] = []
    for (const p of PAGES) {
      const html = await fetchHtml(request, p.path)
      const desc = getMetaContent(html, 'description')
      expect(desc, `${p.path} description present`).toBeTruthy()
      expect(desc!.length, `${p.path} description is a usable length`).toBeGreaterThanOrEqual(50)
      expect(desc, `${p.path} description unique vs homepage`).not.toBe(homeDesc)
      descs.push(desc!)
    }
    expect(new Set(descs).size, 'all three legal descriptions are distinct').toBe(descs.length)
  })

  test('each has exactly one canonical, absolute, pointing at its own path', async ({
    request,
  }) => {
    for (const p of PAGES) {
      const html = await fetchHtml(request, p.path)
      const canonicals = getCanonicals(html)
      expect(canonicals.length, `${p.path} exactly one canonical`).toBe(1)
      const canonical = canonicals[0]
      expect(canonical, `${p.path} canonical is absolute`).toMatch(/^https?:\/\/[^/]+/i)
      expect(new URL(canonical).pathname, `${p.path} canonical path`).toBe(p.path)
    }
  })
})

// --------------------------- Structured data --------------------------------

test.describe('Legal pages — JSON-LD (Organization only, from the layout)', () => {
  for (const p of PAGES) {
    test(`${p.path} emits exactly one ld+json block: the site-wide Organization`, async ({
      request,
    }) => {
      const html = await fetchHtml(request, p.path)
      // Legal pages add NO page-specific structured data; only the layout's Organization.
      expect(countJsonLdBlocks(html), `${p.path} has exactly one ld+json block`).toBe(1)
      const nodes = collectJsonLdNodes(html) // throws on malformed JSON — parse validity asserted
      expect(nodes.length, `${p.path} exactly one JSON-LD node`).toBe(1)
      expect(typeMatches(nodes[0], 'Organization'), `${p.path} node is an Organization`).toBe(true)
    })
  }
})

// ------------------------- Accessibility + navigation ------------------------

test.describe('Legal pages — accessibility and cross-navigation', () => {
  for (const p of PAGES) {
    test(`${p.path} has exactly one H1 and no skipped heading levels`, async ({ page }) => {
      await page.goto(p.path)
      await expect(page.locator('h1')).toHaveCount(1)

      const levels = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'),
        )
          .map((h) => Number(h.tagName[1]))
          .filter((n) => !Number.isNaN(n)),
      )
      expect(levels.length, 'at least one heading in <main>').toBeGreaterThan(0)
      expect(levels[0], 'first heading in <main> is the H1').toBe(1)
      for (let i = 1; i < levels.length; i++) {
        expect(
          levels[i] - levels[i - 1],
          `heading jumped from h${levels[i - 1]} to h${levels[i]}`,
        ).toBeLessThanOrEqual(1)
      }
    })

    test(`${p.path} sidebar links to all three legal docs and marks the current one`, async ({
      page,
    }) => {
      await page.goto(p.path)
      const toc = page.locator('.legal__nav')
      // Match by href (the link labels are "Privacy policy" / "Terms of service" /
      // "Cookie policy", so a path-derived name regex would miss them).
      for (const href of ['/privacy', '/terms', '/cookies']) {
        await expect(toc.locator(`a[href="${href}"]`)).toHaveCount(1)
      }
      // The current doc is marked aria-current="page".
      await expect(toc.locator('[aria-current="page"]')).toHaveCount(1)
      await expect(toc.locator('[aria-current="page"]')).toHaveAttribute('href', p.path)
    })

    test(`${p.path} footer links to the three legal pages (shared chrome)`, async ({ page }) => {
      await page.goto(p.path)
      const footer = page.locator('footer')
      await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
        'href',
        '/privacy',
      )
      await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
      await expect(footer.getByRole('link', { name: 'Cookies' })).toHaveAttribute(
        'href',
        '/cookies',
      )
    })

    test(`${p.path} has no horizontal overflow at 390px (WCAG 1.4.10 reflow)`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(p.path)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth, `${p.path} must not scroll horizontally at 390px`).toBeLessThanOrEqual(
        390,
      )
    })
  }
})
