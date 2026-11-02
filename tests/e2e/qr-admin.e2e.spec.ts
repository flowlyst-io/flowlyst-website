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
  email: deriveFixtureEmail({ prefix: `qr-e2e-admin-${stamp}` }),
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

const VARIANTS = [
  { color: 'black', label: 'Black' },
  { color: 'white', label: 'White' },
  { color: 'violet', label: 'Flowlyst purple' },
].flatMap((c) => [
  { ...c, logo: 'logo', logoLabel: 'With logo' },
  { ...c, logo: 'nologo', logoLabel: 'Without logo' },
])
const bgFor = (color: string) => (color === 'white' ? '#1a1a1a' : '#ffffff')

test('a saved link downloads all six variants as SVG and PNG, transparent and decoding', async ({
  page,
}) => {
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

  for (const v of VARIANTS) {
    await page.getByLabel(v.label, { exact: true }).check()
    await page.getByLabel(v.logoLabel, { exact: true }).check()
    await expect(page.getByTestId('qr-preview')).toHaveAttribute(
      'aria-label',
      new RegExp(`${v.label.toLowerCase()}, ${v.logo === 'logo' ? 'with' : 'without'} logo$`),
    )
    const base = `flowlyst-go-${code}-${v.color}-${v.logo}`

    const svgDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download SVG' }).click()
    const svg = await svgDownload
    expect(svg.suggestedFilename()).toBe(`${base}.svg`)
    expect(
      await decodeQr(await readFile((await svg.path()) as string), 1024, bgFor(v.color)),
      base,
    ).toBe(url)

    const pngDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PNG' }).click()
    const png = await pngDownload
    expect(png.suggestedFilename()).toBe(`${base}.png`)
    const pngBuf = await readFile((await png.path()) as string)
    const meta = await sharp(pngBuf).metadata()
    expect(meta.width).toBe(2048)
    expect(meta.hasAlpha).toBe(true)
    expect(meta.channels).toBe(4)
    const raw = await sharp(pngBuf).ensureAlpha().raw().toBuffer()
    expect(raw[3], `${base} corner alpha`).toBe(0)
    expect(await decodeQr(pngBuf, 1024, bgFor(v.color)), base).toBe(url)
  }
})

test('the preview swatch is dark for white codes and white otherwise', async ({ page }) => {
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/links')
  await page.getByText(`QR link ${stamp}`).first().click()
  await expect(page.getByTestId('qr-panel')).toBeVisible({ timeout: 30_000 })
  const swatch = page.getByTestId('qr-swatch')
  await page.getByLabel('White', { exact: true }).check()
  await expect(swatch).toHaveCSS('background-color', 'rgb(26, 26, 26)')
  await page.getByLabel('Black', { exact: true }).check()
  await expect(swatch).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('a card shows its URL, the Link note, and a purple no-logo PNG that decodes', async ({
  page,
}) => {
  const payload = await getPayload({ config })
  const card = await payload.findByID({ collection: 'cards', id: cardId as number })
  await login({ page, user: ADMIN })
  await page.goto(`/admin/collections/cards/${cardId}`)
  const url = `${getServerURL()}/card/${card.slug}`
  await expect(page.getByTestId('qr-url')).toHaveText(url)
  await expect(page.getByText('Create a Link')).toBeVisible()

  await page.getByLabel('Flowlyst purple', { exact: true }).check()
  await page.getByLabel('Without logo', { exact: true }).check()
  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const png = await pngDownload
  expect(png.suggestedFilename()).toBe(`flowlyst-card-${card.slug}-violet-nologo.png`)
  const pngBuf = await readFile((await png.path()) as string)
  expect((await sharp(pngBuf).metadata()).hasAlpha).toBe(true)
  expect(await decodeQr(pngBuf, 1024, '#ffffff')).toBe(url)
})
