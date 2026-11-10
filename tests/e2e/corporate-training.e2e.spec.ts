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
 * Corporate AI Training page (`/solutions/corporate-ai-training`, issue #156): SEO
 * surface, structured data and server-rendered content, read from the raw HTML.
 * Testimonial visibility is proven in tests/int/corporate-training-cms.int.spec.ts.
 */

const PATH = '/solutions/corporate-ai-training'

const ROLES = [
  'Operations',
  'Finance & accounting',
  'HR',
  'Sales & marketing',
  'Executive assistants & admin',
  'Trading & commodity operations',
  'Real estate agents',
]

function decode(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
}

test.describe('Corporate AI Training page — SEO (raw HTML)', () => {
  test('title and description exist and differ from the home and school pages', async ({
    request,
  }) => {
    const [html, home, school] = [
      await fetchHtml(request, PATH),
      await fetchHtml(request, '/'),
      await fetchHtml(request, '/solutions/ai-training'),
    ]
    expect(getTitle(html)).toBeTruthy()
    expect(getMetaContent(html, 'description')).toBeTruthy()
    for (const other of [home, school]) {
      expect(getTitle(html)).not.toBe(getTitle(other))
      expect(getMetaContent(html, 'description')).not.toBe(getMetaContent(other, 'description'))
    }
  })

  test('one absolute canonical for the corporate path, and an og:image', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals).toHaveLength(1)
    expect(canonicals[0]).toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(canonicals[0]).pathname).toBe(PATH)
    expect(getMetaProperty(html, 'og:image')).toBeTruthy()
  })
})

test.describe('Corporate AI Training page — structured data', () => {
  test('exactly one Service naming real estate and trading, US-wide, with no price fields', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const services = collectJsonLdNodes(html).filter(({ node }) => typeMatches(node, 'Service'))
    expect(services).toHaveLength(1)
    const node = services[0].node
    expect(`${node.serviceType} ${node.description}`).toMatch(/real estate/i)
    expect(`${node.serviceType} ${node.description}`).toMatch(/trading/i)
    expect(JSON.stringify(node.areaServed)).toMatch(/United States/)
    expect(JSON.stringify(node)).not.toMatch(
      /"(offers|price|priceCurrency|priceSpecification|priceRange)"\s*:/i,
    )
  })
})

test.describe('Corporate AI Training page — server-rendered content', () => {
  test('names each of the seven roles', async ({ request }) => {
    const text = decode(await fetchHtml(request, PATH))
    for (const role of ROLES) expect(text, `role "${role}"`).toContain(role)
  })

  test('does not write the brand capitalised or make a satisfaction claim', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    expect(html).not.toMatch(/Flowlyst/)
    expect(html).not.toMatch(/satisfaction/i)
  })

  test('the footer on the homepage links to the page', async ({ request }) => {
    const html = await fetchHtml(request, '/')
    expect(html).toContain(`href="${PATH}"`)
  })
})

test.describe('Corporate AI Training page — accessibility smoke', () => {
  test('exactly one H1, heading levels never skip, every img has alt', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('h1')).toHaveCount(1)
    const levels = await page.$$eval('#main-content :is(h1,h2,h3,h4,h5,h6)', (els) =>
      els.map((el) => Number(el.tagName.slice(1))),
    )
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `h${levels[i - 1]} → h${levels[i]}`).toBeLessThanOrEqual(1)
    }
    const imgs = page.locator('img')
    for (let i = 0; i < (await imgs.count()); i++) {
      expect(await imgs.nth(i).getAttribute('alt')).not.toBeNull()
    }
  })

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(390)
  })
})
