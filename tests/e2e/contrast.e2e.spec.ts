import { test, expect, type Page } from '@playwright/test'

/**
 * WCAG 1.4.3 colour fixes decided on #10: the `--c-ink-3` grey, the green heading
 * accent, and the primary button. Contrast is computed from resolved CSS values with
 * the WCAG relative-luminance formula (axe is not a dependency).
 */

const SURFACES = ['--c-paper', '--c-cream', '--c-cream-2', '--c-sage', '--c-sage-2']

function channel(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function rgbOf(color: string): [number, number, number] {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    const n = parseInt(full, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!rgb) throw new Error(`Cannot parse colour: ${color}`)
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}

function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = rgbOf(c)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl)
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

async function rootVars(page: Page, names: string[]): Promise<Record<string, string>> {
  return page.evaluate(
    (n) =>
      Object.fromEntries(
        n.map((k) => [k, getComputedStyle(document.documentElement).getPropertyValue(k).trim()]),
      ),
    names,
  )
}

test.describe('#10 contrast fixes', () => {
  test('C1 ink-3 token is #666667', async ({ page }) => {
    await page.goto('/')
    const v = await rootVars(page, ['--c-ink-3'])
    expect(v['--c-ink-3'].toLowerCase()).toBe('#666667')
  })

  test('C2 ink-3 clears 4.5:1 on every light surface token', async ({ page }) => {
    await page.goto('/')
    const v = await rootVars(page, ['--c-ink-3', ...SURFACES])
    for (const s of SURFACES) {
      expect(v[s], `${s} must be read`).not.toBe('')
      expect(contrast(v['--c-ink-3'], v[s]), `ink-3 on ${s}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('C3 a rendered ink-3 label resolves to the new grey', async ({ page }) => {
    await page.goto('/solutions/budget-software')
    const label = page.getByText('flowlyst adds', { exact: true })
    await expect(label).toHaveCount(1)
    await expect(label).toHaveCSS('color', 'rgb(102, 102, 103)')
  })

  test('C4 heading em accent is green-600', async ({ page }) => {
    const targets: [string, string][] = [
      ['/about', 'h1 em'],
      ['/solutions/consulting', 'h1 em'],
      ['/', 'blockquote.pull em'],
    ]
    for (const [path, selector] of targets) {
      await page.goto(path)
      const em = page.locator(selector).first()
      await expect(em, `${selector} on ${path}`).toBeVisible()
      await expect(em, `${selector} on ${path}`).toHaveCSS('color', 'rgb(0, 139, 88)')
    }
  })

  test('C5 green-600 clears 3:1 on every surface token', async ({ page }) => {
    await page.goto('/')
    const v = await rootVars(page, ['--fl-green-600', '--c-forest', ...SURFACES])
    for (const s of [...SURFACES, '--c-forest']) {
      expect(v[s], `${s} must be read`).not.toBe('')
      expect(contrast(v['--fl-green-600'], v[s]), `green-600 on ${s}`).toBeGreaterThanOrEqual(3)
    }
  })

  test('C6 primary button resting colours', async ({ page }) => {
    await page.goto('/')
    const buttons = [
      page.locator('[data-testid="home-hero"]').getByRole('link', { name: /request a demo/i }),
      page.locator('header a.btn--primary:visible').first(),
    ]
    for (const btn of buttons) {
      await expect(btn).toBeVisible()
      await expect(btn).toHaveCSS('background-color', 'rgb(0, 113, 71)')
      await expect(btn).toHaveCSS('color', 'rgb(255, 255, 255)')
      expect(contrast('rgb(255, 255, 255)', 'rgb(0, 113, 71)')).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('C7 primary button hover', async ({ page }) => {
    await page.goto('/')
    const cta = page
      .locator('[data-testid="home-hero"]')
      .getByRole('link', { name: /request a demo/i })
    await cta.hover()
    await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none')
    const s = await cta.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { bg: cs.backgroundColor, color: cs.color, deco: cs.textDecorationLine }
    })
    expect(s.bg).toBe('rgb(0, 113, 71)')
    expect(s.color).toBe('rgb(255, 255, 255)')
    expect(s.deco).toBe('none')
    expect(contrast(s.color, s.bg)).toBeGreaterThanOrEqual(4.5)
  })
})
