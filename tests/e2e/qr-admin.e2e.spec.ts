import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { decodeQr } from '../helpers/decodeQr'
import { login } from '../helpers/login'
import { getServerURL } from '../../src/utilities/serverURL'
import { deriveFixtureEmail } from '../helpers/seedUser'

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const ADMIN = {
  email: deriveFixtureEmail({ prefix: 'qr-e2e-admin' }),
  password: 'qr-e2e-password-123',
  name: 'QR E2E Admin',
  role: 'admin' as const,
}

let cardId: number | string | undefined

test.beforeAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.create({ collection: 'users', data: ADMIN })
  const card = await payload.create({
    collection: 'cards',
    data: { name: `QR Card ${stamp}` },
  })
  cardId = card.id
})

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.delete({ collection: 'links', where: { name: { like: `QR link ${stamp}` } } })
  if (cardId !== undefined) await payload.delete({ collection: 'cards', id: cardId })
})

test('a new unsaved link shows the save prompt', async ({ page }) => {
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/links/create')
  await expect(page.getByText('Save to generate the QR code.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download SVG' })).toHaveCount(0)
})

test('a saved link shows its URL and both downloads decode to it', async ({ page }) => {
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/links/create')
  await page.fill('#field-name', `QR link ${stamp}`)
  await page.fill('#field-destination', `https://example.org/qr-${stamp}`)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('qr-panel')).toBeVisible({ timeout: 30_000 })

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'links',
    where: { name: { equals: `QR link ${stamp}` } },
    limit: 1,
  })
  const code = found.docs[0]?.code as string
  expect(code).toMatch(/^[a-z0-9]{6}$/)
  const url = `${getServerURL()}/go/${code}`
  await expect(page.getByTestId('qr-url').first()).toHaveText(url)

  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download SVG' }).click()
  const svg = await svgDownload
  expect(svg.suggestedFilename()).toBe(`flowlyst-go-${code}.svg`)
  expect(await decodeQr(await readFile((await svg.path()) as string))).toBe(url)

  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const png = await pngDownload
  expect(png.suggestedFilename()).toMatch(/\.png$/)
  const pngBuf = await readFile((await png.path()) as string)
  expect((await sharp(pngBuf).metadata()).width).toBe(2048)
  expect(await decodeQr(pngBuf)).toBe(url)
})

test('a card shows its URL, the Link note, and a PNG that decodes', async ({ page }) => {
  const payload = await getPayload({ config })
  const card = await payload.findByID({ collection: 'cards', id: cardId as number })
  await login({ page, user: ADMIN })
  await page.goto(`/admin/collections/cards/${cardId}`)
  const url = `${getServerURL()}/card/${card.slug}`
  await expect(page.getByTestId('qr-url')).toHaveText(url)
  await expect(page.getByText('Create a Link')).toBeVisible()

  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const png = await pngDownload
  expect(png.suggestedFilename()).toBe(`flowlyst-card-${card.slug}.png`)
  expect(await decodeQr(await readFile((await png.path()) as string))).toBe(url)
})
