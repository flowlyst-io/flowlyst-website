import { test, expect } from '@playwright/test'

/**
 * Issue #10 (mobile LCP). A `Critical-CH` response header makes Chrome restart the
 * navigation (a same-URL "307 Internal Redirect" with no server response), which
 * Lighthouse prices as an extra round trip on every page's first load.
 */
test.describe('#10 no client-hint navigation restart', () => {
  test('C1 a first browser navigation to / is not restarted', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.enable')
    const restarts: string[] = []
    cdp.on('Network.requestWillBeSent', (e) => {
      if (e.redirectResponse) restarts.push(`${e.redirectResponse.status} ${e.request.url}`)
    })
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)
    expect(restarts).toEqual([])
  })

  test('C2 public pages send no Critical-CH, the admin keeps it', async ({ request }) => {
    for (const path of ['/', '/solutions/budget-software', '/blog']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(200)
      expect(res.headers()['critical-ch'], path).toBeUndefined()
    }
    const admin = await request.get('/admin', { maxRedirects: 0 })
    expect(admin.headers()['critical-ch']).toBe('Sec-CH-Prefers-Color-Scheme')
  })
})
