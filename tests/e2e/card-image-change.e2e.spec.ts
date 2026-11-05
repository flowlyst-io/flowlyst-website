import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
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
  email: deriveFixtureEmail({ prefix: `card-image-change-e2e-admin-${stamp}` }),
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

// Waits on the card's own PATCH: the shared toast check trips when a drawer toast is still up.
const saveCard = async (page: Page, cardId: number | string) => {
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/cards/${cardId}`) && r.request().method() === 'PATCH',
    ),
    topSave(page).click(),
  ])
  expect(res.status()).toBe(200)
}

const publicImg = (page: Page) => page.locator('.card__diamond img').first()

const visitPublic = async (page: Page, slug: string) => {
  await page.goto(`/card/${slug}`, { waitUntil: 'networkidle' })
  await expect
    .poll(() => publicImg(page).evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  return {
    src: (await publicImg(page).getAttribute('src'))!,
    colour: await centreColour(page.locator('.card__diamond')),
  }
}

test('E11 Edit Image keeps the file name and the public card still shows the new photo', async ({
  page,
  request,
}) => {
  const { cardId, slug, filename, mediaId } = await makeCard(
    await halfRedHalfBlue(1200, 1600, 640),
    null,
  )
  await login({ page, user: ADMIN })
  const before = await visitPublic(page, slug)
  expectNear(before.colour, RED)

  await openCard(page, cardId)
  expect(await editImageInDrawer(page)).toBe(200)
  await closeDrawer(page)

  const payload = await getPayload({ config })
  const media = await payload.findByID({ collection: 'media', id: mediaId, depth: 0 })
  expect(media.filename).toBe(filename)
  expect(media.width).toBeLessThan(1200)
  const after = await visitPublic(page, slug)
  const prefix = `/api/media/file/${filename}?v=`
  expect(decodeURIComponent(before.src)).toContain(prefix)
  expect(decodeURIComponent(after.src)).toContain(prefix)
  expect(after.src).not.toBe(before.src)
  expectNear(after.colour, BLUE)

  const optimised = await request.get(after.src)
  expect(optimised.status()).toBe(200)
  expect(optimised.headers()['content-type']).toMatch(/^image\//)
  const file = await request.get(
    `/api/media/file/${filename}?v=${encodeURIComponent(media.updatedAt)}`,
  )
  expect(file.status()).toBe(200)
})

test('E12 deleting the photo and uploading the same file name shows the new photo', async ({
  page,
}) => {
  const { cardId, slug, filename, mediaId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  const before = await visitPublic(page, slug)
  expectNear(before.colour, RED)

  await openCard(page, cardId)
  await removePhoto(page)
  await saveCard(page, cardId)
  await expect.poll(async () => (await getCard(cardId)).headshot ?? null).toBeNull()
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'media', id: mediaId })

  const dir = path.join(tmp, `reupload-${counter}`)
  mkdirSync(dir)
  const file = path.join(dir, filename)
  writeFileSync(file, await solidJpeg(GREEN, 900, 600))
  expect(await createNewInDrawer(page, file)).toBe(201)
  await saveCard(page, cardId)
  await expect.poll(async () => (await getCard(cardId)).headshot ?? null).not.toBeNull()
  const media = await payload.findByID({
    collection: 'media',
    id: (await getCard(cardId)).headshot as number,
    depth: 0,
  })
  expect(media.filename).toBe(filename)

  const after = await visitPublic(page, slug)
  expect(decodeURIComponent(after.src)).toContain(`/api/media/file/${filename}?v=`)
  expect(after.src).not.toBe(before.src)
  expectNear(after.colour, GREEN)
})

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

// Picks a new photo through Create New and returns its media id.
const pickNewPhoto = async (page: Page, name: string) => {
  const alt = `Pending photo ${stamp} ${name} ${Date.now()}`
  const file = jpegFile(`${name}.jpg`, await solidJpeg(GREEN, 900, 600))
  expect(await createNewInDrawer(page, file, alt)).toBe(201)
  const payload = await getPayload({ config })
  const found = await payload.find({ collection: 'media', where: { alt: { equals: alt } } })
  expect(found.docs).toHaveLength(1)
  return found.docs[0].id
}

const saveRefused = async (page: Page, cardId: number | string) => {
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/cards/${cardId}`) && r.request().method() === 'PATCH',
    ),
    topSave(page).click(),
  ])
  return res.status()
}

const gone = (page: Page) => page.getByTestId('headshot-crop-gone')
const GONE_SAVED =
  'That photo was deleted. Choose another photo. If you click Save now, the card will have no photo.'
const GONE_SHORT = 'That photo was deleted. Choose another photo.'
const pencils = (page: Page) =>
  page.locator('.field-type.upload .upload-relationship-details__edit')

const deleteInDrawer = async (page: Page) => {
  const dr = await pencil(page)
  const del = page.waitForResponse(
    (r) => r.request().method() === 'DELETE' && /\/api\/media/.test(r.url()),
  )
  await dr.locator('.doc-controls__popup button, .popup__trigger').first().click()
  await page.locator('#action-delete:visible').click()
  await page.locator('#confirm-action').click()
  expect((await del).status()).toBe(200)
  await expect(page.locator('.drawer--is-open')).toHaveCount(0)
}

const expectRecovers = async (page: Page, cardId: number | string, oldMediaId: number | string) => {
  expect(await saveRefused(page, cardId)).toBe(400)
  await expect(gone(page)).toBeVisible()
  await expect(gone(page)).toHaveText(GONE_SAVED)
  await expect(unsaved(page)).toHaveText('')
  expect((await getCard(cardId)).headshot).toBe(oldMediaId)
  await expect(page).toHaveURL(new RegExp(`/admin/collections/cards/${cardId}`))

  await pickNewPhoto(page, `recover-${cardId}`)
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  await saveCard(page, cardId)
  await expect.poll(async () => (await getCard(cardId)).headshot).not.toBe(oldMediaId)
}

test('E13 deleting the just-picked photo in the pencil drawer empties the field and says so', async ({
  page,
}) => {
  const { cardId, mediaId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await removePhoto(page)
  await pickNewPhoto(page, 'e13')

  await deleteInDrawer(page)

  await expect(gone(page)).toBeVisible()
  await expect(gone(page)).toHaveText(GONE_SAVED)
  await expect(unsaved(page)).toHaveText('')
  await expect(pencils(page)).toHaveCount(0)
  await expect(page.getByTestId('headshot-crop')).toHaveCount(0)
  expect((await getCard(cardId)).headshot).toBe(mediaId)

  // Saving the empty field clears the card's photo; picking another then saves it.
  await saveCard(page, cardId)
  await expect.poll(async () => (await getCard(cardId)).headshot ?? null).toBeNull()
  await expect(gone(page)).not.toBeVisible()
  await pickNewPhoto(page, 'e13-again')
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  await expect(gone(page)).toHaveCount(0)
  await saveCard(page, cardId)
  await expect.poll(async () => (await getCard(cardId)).headshot ?? null).not.toBeNull()
})

test('E14 a photo deleted through the API after it was picked is refused at Save, not a 500', async ({
  page,
}) => {
  const { cardId, mediaId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  await removePhoto(page)
  const pickedId = await pickNewPhoto(page, 'e14')
  await expect(page.getByTestId('headshot-crop')).toBeVisible()
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'media', id: pickedId })

  await expectRecovers(page, cardId, mediaId)
})

const typeAndDeletePicked = async (page: Page, name: string) => {
  const title = `Typed before delete ${name}`
  await page.fill('#field-title', title)
  await removePhoto(page)
  await pickNewPhoto(page, name)
  await deleteInDrawer(page)
  return title
}

test('E15 deleting a just-picked photo keeps the unsaved edits and the card screen', async ({
  page,
}) => {
  const { cardId } = await makeCard(await solidJpeg(RED), null)
  await login({ page, user: ADMIN })
  await openCard(page, cardId)
  const title = await typeAndDeletePicked(page, 'e15')

  await expect(gone(page)).toBeVisible()
  await expect(gone(page)).toHaveText(GONE_SAVED)
  await expect(unsaved(page)).toHaveText('')
  await expect(pencils(page)).toHaveCount(0)
  expect(page.url()).not.toContain('notFound')
  await expect(page).toHaveURL(new RegExp(`/admin/collections/cards/${cardId}`))
  await expect(page.locator('#field-title')).toHaveValue(title)

  const newId = await pickNewPhoto(page, 'e15-again')
  await saveCard(page, cardId)
  await expect.poll(async () => (await getCard(cardId)).headshot).toBe(newId)
  expect((await getCard(cardId)).title).toBe(title)
})

test('E16 the same delete on the create screen keeps the typed fields', async ({ page }) => {
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/cards/create')
  await expect(page.getByRole('button', { name: 'Create New' })).toBeVisible({ timeout: 30_000 })
  await page.fill('#field-name', `E16 typed ${stamp}`)
  const title = `Typed on create ${stamp}`
  await page.fill('#field-title', title)
  await pickNewPhoto(page, 'e16')
  await deleteInDrawer(page)

  await expect(gone(page)).toBeVisible()
  await expect(gone(page)).toHaveText(GONE_SHORT)
  await expect(pencils(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/admin\/collections\/cards\/create/)
  await expect(page.locator('#field-title')).toHaveValue(title)
  await expect(page.locator('#field-name')).toHaveValue(`E16 typed ${stamp}`)
})
