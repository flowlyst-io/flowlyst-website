import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'
import config from '../../src/payload.config.js'
import { cropPlacement } from '../../src/utilities/headshotCropShared'
import { getCard, openCard, quadrants, save, styleOf } from '../helpers/cardAdmin'
import { login } from '../helpers/login'
import { parseVcf } from '../helpers/parseVcf'
import { deriveFixtureEmail } from '../helpers/seedUser'

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const NAME = `Crop E2E ${stamp}`
const NEW_NAME = `Crop E2E new ${stamp}`
const ADMIN = {
  email: deriveFixtureEmail({ prefix: 'card-crop-e2e-admin' }),
  password: 'card-crop-e2e-password-123',
  name: 'Card Crop E2E Admin',
  role: 'admin' as const,
}

let mediaId: number | string = ''
let mediaFilename = ''
let cardId: number
let slug = ''
let adminCentre: number[] = []

test.beforeAll(async () => {
  test.setTimeout(120_000)
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.create({ collection: 'users', data: ADMIN })
  const buf = await quadrants()
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Crop fixture ${stamp}` },
    file: { data: buf, mimetype: 'image/jpeg', name: `card-crop-${stamp}.jpg`, size: buf.length },
  })
  mediaId = media.id
  mediaFilename = media.filename as string
  const card = await payload.create({
    collection: 'cards',
    data: { name: NAME, headshot: media.id },
  })
  cardId = card.id
  slug = card.slug as string
})

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.delete({ collection: 'cards', where: { name: { in: [NAME, NEW_NAME] } } })
  if (mediaId) await payload.delete({ collection: 'media', id: mediaId }).catch(() => {})
})

test('1 untouched: control shows zoom 1, nothing is written, public card is unchanged', async ({
  page,
}) => {
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await expect(page.getByTestId('headshot-crop-zoom')).toHaveValue('1')
  const card = await getCard(cardId)
  expect(card.headshotCrop).toMatchObject({ zoom: null, x: null, y: null, aspect: null })
  await page.goto(`/card/${slug}`)
  await expect(page.locator('.card__headshot')).toHaveCount(1)
  await expect(page.locator('.card__headshot-crop')).toHaveCount(0)
})

test('2 zoom and drag persist', async ({ page }) => {
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await page.getByTestId('headshot-crop-zoom').fill('2')
  const stage = page.getByTestId('headshot-crop-stage')
  const box = (await stage.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 20, cy + 10, { steps: 4 })
  await page.mouse.move(cx + 40, cy + 20, { steps: 4 })
  await page.mouse.up()

  const aspect = 1.5
  const expected = cropPlacement({ zoom: 2, x: 0.5 - 40 / 528, y: 0.5 - 20 / 352, aspect }, aspect)
  const before = await styleOf(page, '[data-testid=headshot-crop-img]')
  expect(before.width).toBeCloseTo(528, 0)
  expect(before.left).toBeCloseTo(expected.left, 0)
  expect(before.top).toBeCloseTo(expected.top, 0)

  await save(page)
  await page.reload()
  await expect(page.getByTestId('headshot-crop-zoom')).toBeEnabled({ timeout: 30_000 })
  await expect(page.getByTestId('headshot-crop-zoom')).toHaveValue('2')
  const after = await styleOf(page, '[data-testid=headshot-crop-img]')
  expect(after).toEqual(before)

  const card = await getCard(cardId)
  const crop = card.headshotCrop!
  expect(crop.zoom).toBe(2)
  expect(crop.x!).toBeLessThan(0.5)
  expect(crop.y!).toBeLessThan(0.5)
  expect(Math.abs(crop.aspect! - 1.5)).toBeLessThan(0.01)
})

test('3 public card matches the admin stage', async ({ page, request }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number }
    w.__cls = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number
        hadRecentInput: boolean
      }[]) {
        if (!e.hadRecentInput) w.__cls += e.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })

  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  const adminStyle = await styleOf(page, '[data-testid=headshot-crop-img]')
  const adminShot = await page.getByTestId('headshot-crop-stage').screenshot()

  await page.goto(`/card/${slug}`, { waitUntil: 'networkidle' })
  const publicImg = page.locator('.card__headshot-crop img')
  const publicStyle = await styleOf(page, '.card__headshot-crop img')
  expect(publicStyle).toEqual(adminStyle)
  expect(await publicImg.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await publicImg.getAttribute('loading')).not.toBe('lazy')
  const html = await (await request.get(`/card/${slug}`)).text()
  expect(html).toContain('card__headshot-crop')
  expect(html).toMatch(/<link rel="preload" as="image"/)

  const diamond = page.locator('.card__diamond')
  const box = (await diamond.boundingBox())!
  expect(Math.round(box.width)).toBe(176)
  expect(Math.round(box.height)).toBe(176)
  const publicShot = await diamond.screenshot()
  const [a, b] = await Promise.all([
    sharp(adminShot).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(publicShot).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  const px = (img: typeof a, x: number, y: number) => {
    const i = (y * img.info.width + x) * img.info.channels
    return [img.data[i], img.data[i + 1], img.data[i + 2]]
  }
  for (const [x, y] of [
    [88, 88],
    [88, 40],
    [88, 136],
    [40, 88],
    [136, 88],
  ]) {
    const pa = px(a, x, y)
    const pb = px(b, x, y)
    for (let c = 0; c < 3; c++) {
      expect(
        Math.abs(pa[c] - pb[c]),
        `(${x},${y}) channel ${c}: ${pa} vs ${pb}`,
      ).toBeLessThanOrEqual(24)
    }
  }
  adminCentre = px(a, 88, 88)

  await page.waitForTimeout(500)
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
  expect(cls).toBeLessThan(0.1)
})

test('4 vCard matches the admin centre', async ({ request }) => {
  const res = await request.get(`/card/${slug}/vcard`)
  expect(res.status()).toBe(200)
  const { photo } = parseVcf(await res.text())
  expect(photo).not.toBeNull()
  const meta = await sharp(photo!).metadata()
  expect(meta.format).toBe('jpeg')
  expect([meta.width, meta.height]).toEqual([400, 400])
  const raw = await sharp(photo!).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const i = (200 * raw.info.width + 200) * raw.info.channels
  for (let c = 0; c < 3; c++) {
    expect(Math.abs(raw.data[i + c] - adminCentre[c])).toBeLessThanOrEqual(24)
  }
})

test('5 keyboard operation', async ({ page }) => {
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  const stage = page.getByTestId('headshot-crop-stage')
  const slider = page.getByTestId('headshot-crop-zoom')
  await expect(page.getByLabel('Zoom')).toBeVisible()
  await expect(page.getByRole('group', { name: /Photo position/ })).toBeVisible()

  const focusedTestId = () =>
    page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')
  await page.locator('#field-name').focus()
  let reached = false
  for (let i = 0; i < 30 && !reached; i++) {
    await page.keyboard.press('Tab')
    reached = (await focusedTestId()) === 'headshot-crop-stage'
  }
  expect(reached, 'stage reachable by Tab').toBe(true)
  expect(await stage.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')

  const start = await styleOf(page, '[data-testid=headshot-crop-img]')
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
  await expect
    .poll(async () => (await styleOf(page, '[data-testid=headshot-crop-img]')).left - start.left)
    .toBeCloseTo(-20, 0)
  const mid = await styleOf(page, '[data-testid=headshot-crop-img]')
  expect(Math.abs(mid.left - start.left + 20)).toBeLessThanOrEqual(0.5)
  await page.keyboard.press('Shift+ArrowUp')
  await expect
    .poll(async () => (await styleOf(page, '[data-testid=headshot-crop-img]')).top - mid.top)
    .toBeCloseTo(-16, 0)

  await page.keyboard.press('Tab')
  expect(await focusedTestId()).toBe('headshot-crop-zoom')
  const zoomBefore = Number(await slider.inputValue())
  await page.keyboard.press('ArrowRight')
  expect(Number(await slider.inputValue())).toBeGreaterThan(zoomBefore)

  await save(page)
})

test('6 reset returns to the stock look', async ({ page }) => {
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await page.getByTestId('headshot-crop-reset').getByRole('button', { name: 'Reset' }).click()
  await save(page)
  await page.reload()
  await expect(page.getByTestId('headshot-crop-zoom')).toBeEnabled({ timeout: 30_000 })
  await expect(page.getByTestId('headshot-crop-zoom')).toHaveValue('1')
  const card = await getCard(cardId)
  expect(card.headshotCrop).toMatchObject({ zoom: null, x: null, y: null, aspect: null })
  await page.goto(`/card/${slug}`)
  await expect(page.locator('.card__headshot')).toHaveCount(1)
  await expect(page.locator('.card__headshot-crop')).toHaveCount(0)
})

test('7 a photo picked on an unsaved card can be adjusted before the first save', async ({
  page,
}) => {
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/cards/create')
  await expect(page.getByTestId('headshot-crop')).toHaveCount(0)
  await page.getByRole('button', { name: 'Choose from existing' }).click()
  await page.getByText(mediaFilename).first().click()
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  await expect(page.getByTestId('headshot-crop-zoom')).toBeEnabled({ timeout: 30_000 })
  const natural = await page
    .getByTestId('headshot-crop-img')
    .evaluate((el) => (el as HTMLImageElement).naturalWidth)
  expect(natural).toBeGreaterThan(0)
  await page.getByTestId('headshot-crop-zoom').fill('3')
  await page.fill('#field-name', NEW_NAME)
  await page.getByRole('button', { name: 'Save' }).first().click()
  await expect(page).toHaveURL(/\/admin\/collections\/cards\/(?!create)[^/]+$/, { timeout: 30_000 })

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'cards',
    where: { name: { equals: NEW_NAME } },
    limit: 1,
    depth: 0,
  })
  expect(found.docs[0].headshotCrop?.zoom).toBe(3)
  await page.goto(`/card/${found.docs[0].slug}`)
  const img = page.locator('.card__headshot-crop img')
  await expect(img).toHaveCount(1)
  expect((await styleOf(page, '.card__headshot-crop img')).width).toBeCloseTo(792, 0)
})

test('8 removing the photo hides the control and clears the crop', async ({ page }) => {
  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'cards',
    where: { name: { equals: NEW_NAME } },
    limit: 1,
    depth: 0,
  })
  const id = found.docs[0].id
  await login({ page, user: ADMIN })
  await openCard(page, id)
  await page.locator('.upload-relationship-details__remove').click()
  await expect(page.getByTestId('headshot-crop')).toHaveCount(0)
  await save(page)
  const card = await getCard(id)
  expect(card.headshot).toBeNull()
  expect(card.headshotCrop).toMatchObject({ zoom: null, x: null, y: null, aspect: null })
})
