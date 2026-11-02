import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import {
  BLUE,
  GREEN,
  RED,
  centreColour,
  chooseExisting,
  closeDrawer,
  createNewInDrawer,
  editImageInDrawer,
  expectCentre,
  expectNear,
  getCard,
  halfRedHalfBlue,
  openCard,
  pencil,
  replaceInDrawer,
  save,
  solidJpeg,
} from '../helpers/cardAdmin'
import { login } from '../helpers/login'
import { deriveFixtureEmail } from '../helpers/seedUser'

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const ADMIN = {
  email: deriveFixtureEmail({ prefix: 'card-image-change-e2e-admin' }),
  password: 'card-image-change-e2e-password-123',
  name: 'Card Image Change E2E Admin',
  role: 'admin' as const,
}
const tmp = mkdtempSync(path.join(tmpdir(), 'card-image-change-'))
const CROP = { zoom: 2, x: 0.5, y: 0.5, aspect: 1.5 }

const cardIds: (number | string)[] = []
const mediaIds: (number | string)[] = []
let counter = 0

const makeCard = async (
  buf: Buffer,
  crop: typeof CROP | null = CROP,
  aspect = CROP.aspect,
  withHeadshot = true,
) => {
  const payload = await getPayload({ config })
  const n = ++counter
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Image change fixture ${stamp} ${n}` },
    file: {
      data: buf,
      mimetype: 'image/jpeg',
      name: `card-image-change-${stamp}-${n}.jpg`,
      size: buf.length,
    },
  })
  mediaIds.push(media.id)
  const card = await payload.create({
    collection: 'cards',
    data: {
      name: `Image change ${stamp} ${n}`,
      ...(withHeadshot ? { headshot: media.id } : {}),
      ...(crop ? { headshotCrop: { ...crop, aspect } } : {}),
    },
  })
  cardIds.push(card.id)
  return {
    cardId: card.id,
    slug: card.slug as string,
    mediaId: media.id,
    filename: media.filename as string,
  }
}

const jpegFile = (name: string, buf: Buffer) => {
  const file = path.join(tmp, `card-image-change-${stamp}-${name}`)
  writeFileSync(file, buf)
  return file
}

const img = (page: Page) => page.getByTestId('headshot-crop-img')
const stage = (page: Page) => page.getByTestId('headshot-crop-stage')
const zoom = (page: Page) => page.getByTestId('headshot-crop-zoom')
const unsaved = (page: Page) => page.getByTestId('headshot-crop-unsaved')
const topSave = (page: Page) => page.locator('#action-save').first()

// Collects the field's own refetches, so a test can tell whether the drawer's save reached it.
const trackFieldFetches = (page: Page, mediaId: number | string) => {
  const urls: string[] = []
  const pattern = new RegExp(`/api/media/${mediaId}\\?depth=0$`)
  page.on('request', (r) => {
    if (r.method() === 'GET' && pattern.test(r.url())) urls.push(r.url())
  })
  return urls
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.create({ collection: 'users', data: ADMIN })
})

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  for (const id of cardIds) await payload.delete({ collection: 'cards', id }).catch(() => {})
  for (const id of mediaIds) await payload.delete({ collection: 'media', id }).catch(() => {})
  await payload.delete({
    collection: 'media',
    where: { filename: { like: `card-image-change-${stamp}` } },
  })
})

test('E1 pencil replace on a stored crop refreshes the diamond and resets the zoom', async ({
  page,
}) => {
  const { cardId, slug, mediaId } = await makeCard(await solidJpeg(RED, 1200, 800))
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await expectCentre(stage(page), RED)
  await expect(zoom(page)).toHaveValue('2')
  const srcBefore = await img(page).getAttribute('src')
  const fetches = trackFieldFetches(page, mediaId)

  const file = jpegFile('green.jpg', await solidJpeg(GREEN, 900, 600))
  expect(await replaceInDrawer(page, file)).toBe(200)

  // Probe: the drawer is still open here. Without this fetch the event does not fire from the drawer.
  await expect.poll(() => fetches.length, { timeout: 10_000 }).toBeGreaterThan(0)
  await closeDrawer(page)

  await expect(img(page)).not.toHaveAttribute('src', srcBefore!)
  expect(await img(page).getAttribute('src')).toContain('v=')
  await expectCentre(stage(page), GREEN)
  expect(await img(page).evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(900)
  await expect(zoom(page)).toHaveValue('1')
  await expect(topSave(page)).toBeEnabled()
  await expect(unsaved(page)).toHaveText('')
  expect((await getCard(cardId)).headshotCrop?.zoom).toBe(2)

  // The drawer's own success toast may still be showing, so wait on the stored value instead.
  await save(page)
  await expect.poll(async () => (await getCard(cardId)).headshotCrop?.zoom ?? null).toBeNull()
  expect((await getCard(cardId)).headshotCrop).toMatchObject({ x: null, y: null, aspect: null })
  await page.goto(`/card/${slug}`)
  await expect(page.locator('.card__headshot')).toHaveCount(1)
  await expect(page.locator('.card__headshot-crop')).toHaveCount(0)
})

const altOnlyEdit = async (page: Page, mediaId: number | string) => {
  const fetches = trackFieldFetches(page, mediaId)
  const dr = await pencil(page)
  await dr.locator('#field-alt').fill(`Edited alt ${Date.now()}`)
  const [res] = await Promise.all([
    page.waitForResponse((r) => /\/api\/media\//.test(r.url()) && r.request().method() === 'PATCH'),
    dr.locator('#action-save').click(),
  ])
  expect(res.status()).toBe(200)
  await expect.poll(() => fetches.length, { timeout: 10_000 }).toBeGreaterThan(0)
  await closeDrawer(page)
}

test('E2 an alt-only pencil edit keeps the crop and leaves Save disabled', async ({ page }) => {
  const { cardId, mediaId } = await makeCard(await solidJpeg(RED, 1200, 800))
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await expect(zoom(page)).toHaveValue('2')
  const before = await centreColour(stage(page))

  await altOnlyEdit(page, mediaId)

  await expect(zoom(page)).toHaveValue('2')
  await expect(topSave(page)).toBeDisabled()
  expect((await getCard(cardId)).headshotCrop?.zoom).toBe(2)
  expectNear(await centreColour(stage(page)), before, 8)
})

test('E3 Edit Image in the drawer crops the diamond and resets the zoom', async ({ page }) => {
  const { cardId, mediaId } = await makeCard(await halfRedHalfBlue(1200, 1600), CROP, 0.75)
  const payload = await getPayload({ config })
  const before = await payload.findByID({ collection: 'media', id: mediaId, depth: 0 })
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await expect(zoom(page)).toHaveValue('2')

  expect(await editImageInDrawer(page)).toBe(200)
  await closeDrawer(page)

  const after = await payload.findByID({ collection: 'media', id: mediaId, depth: 0 })
  expect(after.filename).toBe(before.filename)
  expect(after.width).toBeLessThan(before.width!)
  await expect
    .poll(() => img(page).evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(after.width)
  await expectCentre(stage(page), BLUE)
  await expect(zoom(page)).toHaveValue('1')
  await expect(topSave(page)).toBeEnabled()
})

test('E4 a stale media event does not reset a saved crop on return or reload', async ({ page }) => {
  const { cardId, mediaId } = await makeCard(await solidJpeg(RED, 1200, 800))
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await altOnlyEdit(page, mediaId)
  await expect(zoom(page)).toHaveValue('2')

  await page.locator('.step-nav a[href="/admin/collections/cards"]').first().click()
  await expect(page).toHaveURL(/\/admin\/collections\/cards(\?.*)?$/)
  await page.locator(`a[href="/admin/collections/cards/${cardId}"]`).first().click()
  await expect(page.getByTestId('headshot-crop')).toBeVisible({ timeout: 30_000 })
  await expect(zoom(page)).toBeEnabled({ timeout: 30_000 })
  await expect(zoom(page)).toHaveValue('2')
  await expect(topSave(page)).toBeDisabled()

  await page.reload()
  await expect(zoom(page)).toBeEnabled({ timeout: 30_000 })
  await expect(zoom(page)).toHaveValue('2')
  await expect(topSave(page)).toBeDisabled()
  expect((await getCard(cardId)).headshotCrop?.zoom).toBe(2)
})

const NOT_SAVED = 'Not saved yet: the card still shows the previous photo. Click Save at the top.'
const NOT_SAVED_FIRST = 'Not saved yet: the card has no photo until you click Save at the top.'
const removePhoto = (page: Page) =>
  page.locator('.field-type.upload .upload-relationship-details__remove').click()

test('E5 a clean load has an empty, rendered message', async ({ page }) => {
  const { cardId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await expect(unsaved(page)).toHaveText('')
  expect(await unsaved(page).evaluate((el) => getComputedStyle(el).display)).not.toBe('none')
})

test('E6 an unrelated edit leaves the message empty', async ({ page }) => {
  const { cardId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await page.fill('#field-title', 'Some other title')
  await expect(topSave(page)).toBeEnabled()
  await expect(unsaved(page)).toHaveText('')
})

test('E7 X then Create New shows the message until the card is saved', async ({ page }) => {
  const { cardId, mediaId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await unsaved(page).evaluate((el) => {
    el.dataset.probe = '1'
  })

  await removePhoto(page)
  await expect(page.getByTestId('headshot-crop')).toHaveCount(0)
  await expect(unsaved(page)).toHaveText(NOT_SAVED)

  const file = jpegFile('e7-green.jpg', await solidJpeg(GREEN, 900, 600))
  expect(await createNewInDrawer(page, file)).toBe(201)
  await expect(unsaved(page)).toHaveText(NOT_SAVED)
  await expect(unsaved(page)).toHaveAttribute('role', 'status')
  await expect(unsaved(page)).toHaveAttribute('data-probe', '1')
  expect((await getCard(cardId)).headshot).toBe(mediaId)

  await save(page)
  await expect(unsaved(page)).toHaveText('')
  expect((await getCard(cardId)).headshot).not.toBe(mediaId)
  await expect(zoom(page)).toBeEnabled({ timeout: 30_000 })
  await zoom(page).fill('2')
  await expect(unsaved(page)).toHaveText('')
  await page.reload()
  await expect(page.getByTestId('headshot-crop')).toBeVisible({ timeout: 30_000 })
  await expect(unsaved(page)).toHaveText('')
})

test('E7b a refused Save keeps the message', async ({ page }) => {
  const { cardId, mediaId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await removePhoto(page)
  const file = jpegFile('e7b-green.jpg', await solidJpeg(GREEN, 900, 600))
  expect(await createNewInDrawer(page, file)).toBe(201)

  let refused = false
  await page.route(`**/api/cards/${cardId}*`, (route) => {
    if (route.request().method() === 'PATCH' && !refused) {
      refused = true
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Something went wrong.' }] }),
      })
    }
    return route.continue()
  })
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/cards/${cardId}`) && r.request().method() === 'PATCH',
    ),
    topSave(page).click(),
  ])
  expect(res.status()).toBe(500)
  await expect(unsaved(page)).toHaveText(NOT_SAVED)
  expect((await getCard(cardId)).headshot).toBe(mediaId)
})

test('E8 X then picking the saved photo again clears the message', async ({ page }) => {
  const { cardId, filename } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await removePhoto(page)
  await expect(unsaved(page)).toHaveText(NOT_SAVED)
  await chooseExisting(page, filename)
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  await expect(unsaved(page)).toHaveText('')
})

test('E9 a card with no photo before gets the no-photo wording until it is saved', async ({
  page,
}) => {
  const { cardId } = await makeCard(await solidJpeg(RED), null, 1.5, false)
  const { filename } = await makeCard(await solidJpeg(GREEN), null)
  await login({ page, user: ADMIN })
  await page.goto(`/admin/collections/cards/${cardId}`)
  await expect(page.getByRole('button', { name: 'Choose from existing' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByTestId('headshot-crop')).toHaveCount(0)
  await expect(unsaved(page)).toHaveText('')

  await chooseExisting(page, filename)
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  await expect(unsaved(page)).toHaveText(NOT_SAVED_FIRST)
  await save(page)
  await expect(unsaved(page)).toHaveText('')
  expect((await getCard(cardId)).headshot).toBeTruthy()
})

test('E10 the create screen shows no message after a photo is picked', async ({ page }) => {
  const { filename } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/cards/create')
  await expect(page.getByRole('button', { name: 'Choose from existing' })).toBeVisible({
    timeout: 30_000,
  })
  await chooseExisting(page, filename)
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  await expect(unsaved(page)).toHaveText('')
})
