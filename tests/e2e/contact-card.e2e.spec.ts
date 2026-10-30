import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'
import config from '../../src/payload.config.js'
import { collectJsonLdNodes, typeMatches } from '../helpers/rawHtml'

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const NAME = `Card E2E ${stamp}`
let slug = ''
let cardId: number
let mediaId: number | string = ''

test.beforeAll(async () => {
  test.setTimeout(120_000)
  const payload = await getPayload({ config })
  const buf = await sharp({
    create: { width: 600, height: 600, channels: 3, background: { r: 18, g: 120, b: 92 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Headshot of ${NAME}` },
    file: { data: buf, mimetype: 'image/jpeg', name: `card-e2e-${stamp}.jpg`, size: buf.length },
  })
  mediaId = media.id
  const card = await payload.create({
    collection: 'cards',
    data: {
      name: NAME,
      title: 'Founder & CEO',
      headshot: media.id,
      phone: '+1 (312) 555-0100',
      email: 'card-e2e@example.com',
      linkedIn: 'https://www.linkedin.com/in/example',
    },
  })
  cardId = card.id
  slug = card.slug as string
})

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'cards', id: cardId }).catch(() => {})
  if (mediaId) await payload.delete({ collection: 'media', id: mediaId }).catch(() => {})
})

test('card page is noindex, chrome-free, has no Person schema and a working headshot', async ({
  page,
  request,
}) => {
  const res = await page.goto(`/card/${slug}`, { waitUntil: 'networkidle' })
  expect(res?.status()).toBe(200)
  expect(res?.headers()['x-robots-tag']).toContain('noindex')

  const robots = (await page.locator('meta[name=robots]').first().getAttribute('content')) ?? ''
  expect(robots).toContain('noindex')
  expect(robots).toContain('nofollow')

  expect(await page.locator('nav').count()).toBe(0)
  expect(await page.locator('footer').count()).toBe(0)
  await expect(page.locator('h1')).toHaveText(NAME)
  await expect(page).toHaveTitle(`${NAME} · flowlyst`)

  const html = await (await request.get(`/card/${slug}`)).text()
  const nodes = collectJsonLdNodes(html)
  expect(nodes.some(({ node }) => typeMatches(node, 'Person'))).toBe(false)
  expect(html).not.toContain('googletagmanager')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const img = page.locator('.card__headshot')
  await expect(img).toHaveAttribute('alt', `Headshot of ${NAME}`)
  expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

  const addLink = page.getByRole('link', { name: 'Add to contacts' })
  await expect(addLink).toHaveAttribute('href', `/card/${slug}/vcard`)
  const vcf = await request.get((await addLink.getAttribute('href')) as string)
  expect(vcf.status()).toBe(200)
  expect(vcf.headers()['content-type']).toMatch(/^text\/vcard/)
  expect(vcf.headers()['content-disposition']).toContain('.vcf')
  const body = await vcf.text()
  expect(body).toContain(`FN:${NAME}`)
  expect(body.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true)
})

test('card is not in the sitemap and unknown cards 404', async ({ request, page }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).not.toContain('/card/')
  expect((await request.get(`/card/nope-${stamp}`)).status()).toBe(404)
  expect((await request.get(`/card/nope-${stamp}/vcard`)).status()).toBe(404)
  await page.goto(`/card/nope-${stamp}`)
  await expect(page.getByTestId('not-found')).toBeVisible()
})

test('390x900 screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`/card/${slug}`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'test-results/contact-card-390.png', fullPage: true })
})
