import { test, expect } from '@playwright/test'

/**
 * "flowlyst" is always lowercase as the reader sees it (issue #157): neither the raw
 * server HTML nor the rendered text (CSS text-transform included) may show
 * "Flowlyst" or "FLOWLYST". /solutions/ai-training and the corporate training page
 * belong to #156 and join this list when that lands.
 */

const PATHS = [
  '/',
  '/about',
  '/solutions/budget-software',
  '/solutions/consulting',
  '/solutions/keynotes',
  '/contact',
  '/request-demo',
  '/blog',
  '/case-studies',
  '/testimonials',
  '/privacy',
  '/terms',
  '/cookies',
  '/this-page-does-not-exist-157',
]

for (const path of PATHS) {
  test(`flowlyst is lowercase on ${path}`, async ({ page, request }) => {
    const res = await request.get(path)
    const html = await res.text()
    expect(html).not.toContain('Flowlyst')
    expect(html).not.toContain('FLOWLYST')
    expect(html, 'page is not empty').toContain('flowlyst')

    await page.goto(path)
    const text = await page.locator('body').innerText()
    expect(text).not.toContain('FLOWLYST')
    expect(text).not.toContain('Flowlyst')

    const alts = await page
      .locator('img[alt]')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt') ?? ''))
    for (const alt of alts) expect(alt).not.toMatch(/Flowlyst|FLOWLYST/)
  })
}
