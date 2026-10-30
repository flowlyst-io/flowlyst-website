import { test, expect } from '@playwright/test'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const SLUG = `go-e2e-${stamp}`
let id: number
let code: string
let offCode: string
let httpId: number
let httpCode: string

const hit = async (request: import('@playwright/test').APIRequestContext, key: string) =>
  request.get(`/go/${key}`, { maxRedirects: 0 })

test.beforeAll(async () => {
  const payload = await getPayload({ config })
  const link = await payload.create({
    collection: 'links',
    data: { name: `Go e2e ${stamp}`, destination: `https://example.org/a-${stamp}`, slug: SLUG },
  })
  id = link.id
  code = link.code as string
  const off = await payload.create({
    collection: 'links',
    data: { name: `Go e2e off ${stamp}`, destination: 'https://example.org/off', active: false },
  })
  offCode = off.code as string
  const http = await payload.create({
    collection: 'links',
    data: { name: `Go e2e http ${stamp}`, destination: 'https://example.org/http' },
  })
  httpId = http.id
  httpCode = http.code as string
  await payload.db.drizzle.execute(
    sql`UPDATE "links" SET "destination" = 'http://example.org/insecure' WHERE "id" = ${httpId}`,
  )
})

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'links', where: { name: { like: `Go e2e` } } })
})

test('code, slug and uppercase slug all give a no-store, noindex 307 to the destination', async ({
  request,
}) => {
  for (const key of [code, SLUG, SLUG.toUpperCase()]) {
    const res = await hit(request, key)
    expect(res.status(), `/go/${key} status`).toBe(307)
    expect(res.headers()['location']).toBe(`https://example.org/a-${stamp}`)
    // CI runs a production server (no-store); `next dev` only sends no-cache.
    const cacheControl = res.headers()['cache-control'] ?? ''
    if (process.env.CI) expect(cacheControl).toContain('no-store')
    else expect(cacheControl).toMatch(/no-store|no-cache/)
    expect(res.headers()['x-robots-tag']).toContain('noindex')
  }
})

test('inactive and unknown links show the branded 404', async ({ page }) => {
  for (const key of [offCode, `unknown-${stamp}`]) {
    const res = await page.goto(`/go/${key}`)
    expect(res?.status(), `/go/${key} status`).toBe(404)
    await expect(page.getByTestId('not-found')).toBeVisible()
  }
})

test('two hits add exactly 2 to the scan count', async ({ request }) => {
  const payload = await getPayload({ config })
  const before = (await payload.findByID({ collection: 'links', id })).scanCount ?? 0
  await hit(request, code)
  await hit(request, SLUG)
  const after = await payload.findByID({ collection: 'links', id })
  expect((after.scanCount ?? 0) - before).toBe(2)
  expect(after.lastScannedAt).toBeTruthy()
})

test('repointing the destination changes where the next scan goes', async ({ request }) => {
  const payload = await getPayload({ config })
  const next = `https://example.org/new-${stamp}`
  await payload.update({ collection: 'links', id, data: { destination: next } })
  for (const key of [code, SLUG]) {
    const res = await hit(request, key)
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toBe(next)
  }
})

test('a stored http destination is refused with a 404', async ({ page }) => {
  const res = await page.goto(`/go/${httpCode}`)
  expect(res?.status()).toBe(404)
  await expect(page.getByTestId('not-found')).toBeVisible()
})

test('robots.txt disallows /go/', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()
  expect(body).toMatch(/Disallow:\s*\/go\//)
})
