import { test, expect } from '@playwright/test'

/**
 * SEO / AI-discoverability surface (issue #21, PRD §10.1 / §11; review invariant a) —
 * the SERVED output over plain HTTP (no browser, no JS): `/sitemap.xml`, `/robots.txt`,
 * and the legacy `/resources/case-studies` 301.
 *
 * Scope split (retro #02): this spec asserts the STATIC surface — the routes that are
 * always present regardless of DB content — so it never depends on a cross-process
 * seed reaching the web server. The DYNAMIC sitemap contract (published posts/cases in,
 * drafts out) is proven in tests/int/sitemap.int.spec.ts, which calls `sitemap()`
 * directly against a seeded DB.
 */

const STATIC_PATHS = [
  '/about',
  '/solutions/budget-software',
  '/solutions/ai-training',
  '/solutions/consulting',
  '/solutions/keynotes',
  '/request-demo',
  '/contact',
  '/blog',
  '/testimonials',
  '/case-studies',
  '/privacy',
  '/terms',
  '/cookies',
]

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * The robots.txt group (block of lines between blank lines) that names `agent`. A
 * crawler obeys only its single matching group, so asserting the AI group in isolation
 * proves it is not accidentally root-disallowed.
 */
function robotsBlockFor(body: string, agent: string): string {
  const block = body.split(/\n\s*\n/).find((b) => b.includes(agent))
  expect(block, `robots.txt has a group naming ${agent}`).toBeTruthy()
  return block as string
}

test.describe('SEO surface — /sitemap.xml', () => {
  test('is 200 XML with a urlset and every static route as an absolute <loc>', async ({
    request,
  }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status(), 'GET /sitemap.xml is 200').toBe(200)
    expect(res.headers()['content-type'] ?? '', 'served as XML').toMatch(/xml/i)

    const xml = await res.text()
    expect(xml, 'is a urlset').toContain('<urlset')

    // The homepage as an absolute root URL.
    expect(xml, 'lists the homepage').toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/i)

    for (const path of STATIC_PATHS) {
      expect(xml, `lists ${path} as an absolute loc`).toMatch(
        new RegExp(`<loc>https?://[^<]*${escapeRegExp(path)}</loc>`, 'i'),
      )
    }

    // No relative locs leaked (every URL must be absolute for crawlers).
    expect(xml, 'no relative <loc>').not.toMatch(/<loc>\/[^<]/i)
  })
})

test.describe('SEO surface — /robots.txt', () => {
  test('is 200, references the sitemap, blocks /admin, and explicitly allows AI crawlers', async ({
    request,
  }) => {
    const res = await request.get('/robots.txt')
    expect(res.status(), 'GET /robots.txt is 200').toBe(200)
    const body = await res.text()

    // Baseline `*` group + sitemap reference + admin/api/preview blocked.
    expect(body, 'has a wildcard user-agent group').toMatch(/User-Agent:\s*\*/i)
    expect(body, 'references the sitemap (absolute)').toMatch(
      /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i,
    )
    expect(body, 'blocks the admin').toMatch(/Disallow:\s*\/admin/i)
    expect(body, 'blocks the API').toMatch(/Disallow:\s*\/api/i)
    expect(body, 'blocks the preview route').toMatch(/Disallow:\s*\/preview/i)

    // The AI crawlers (PRD §10.1 hard invariant) are named AND allowed. Because a
    // crawler obeys only its own most-specific group, assert the group each names is
    // allowed at root and NOT root-disallowed.
    for (const bot of AI_CRAWLERS) {
      expect(body, `${bot} is named`).toContain(bot)
    }
    const aiBlock = robotsBlockFor(body, 'GPTBot')
    for (const bot of AI_CRAWLERS) {
      expect(aiBlock, `${bot} shares the AI allow group`).toContain(bot)
    }
    expect(aiBlock, 'AI crawlers are allowed at root').toMatch(/Allow:\s*\//i)
    expect(aiBlock, 'AI crawlers are NOT root-disallowed').not.toMatch(/Disallow:\s*\/\s*$/im)
    // …but every non-content surface is still off-limits to them (the disallows are
    // repeated in the AI group, since a crawler ignores the `*` group's rules).
    for (const path of ['/admin', '/api', '/preview']) {
      expect(aiBlock, `AI crawlers still blocked from ${path}`).toMatch(
        new RegExp(`Disallow:\\s*${path}`, 'i'),
      )
    }
  })
})

test.describe('SEO surface — legacy 301', () => {
  test('/resources/case-studies 301-redirects to /case-studies', async ({ request }) => {
    // maxRedirects: 0 — Playwright follows redirects by default, which would surface the
    // final 200 and hide the 301. We assert the redirect itself.
    const res = await request.get('/resources/case-studies', { maxRedirects: 0 })
    expect(res.status(), 'is a 301 (not 308 / not a followed 200)').toBe(301)
    expect(res.headers()['location'] ?? '', 'redirects to /case-studies').toMatch(/\/case-studies$/)
  })
})
