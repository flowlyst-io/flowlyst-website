import { test, expect, type Page, type Response } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { RED, drawer, openCard, pencil, solidJpeg } from '../helpers/cardAdmin'
import { login } from '../helpers/login'
import { deriveFixtureEmail } from '../helpers/seedUser'

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const ADMIN = {
  email: deriveFixtureEmail({ prefix: 'media-delete-guard-e2e-admin' }),
  password: 'media-delete-guard-e2e-password-123',
  name: 'Media Delete Guard E2E Admin',
  role: 'admin' as const,
}

const cardIds: (number | string)[] = []
const mediaIds: (number | string)[] = []
let counter = 0

const makeMedia = async () => {
  const payload = await getPayload({ config })
  const buf = await solidJpeg(RED, 600, 400)
  const n = ++counter
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Delete guard fixture ${stamp} ${n}` },
    file: {
      data: buf,
      mimetype: 'image/jpeg',
      name: `delete-guard-${stamp}-${n}.jpg`,
      size: buf.length,
    },
  })
  mediaIds.push(media.id)
  return { id: media.id, filename: media.filename as string }
}

const makeUsed = async () => {
  const payload = await getPayload({ config })
  const media = await makeMedia()
  const name = `Delete guard card ${stamp} ${counter}`
  const card = await payload.create({ collection: 'cards', data: { name, headshot: media.id } })
  cardIds.push(card.id)
  return { ...media, cardId: card.id, cardName: name }
}

const exists = async (id: number | string) => {
  const payload = await getPayload({ config })
  return payload
    .findByID({ collection: 'media', id, depth: 0 })
    .then(() => true)
    .catch(() => false)
}

const isDelete = (r: Response) => r.request().method() === 'DELETE' && /\/api\/media/.test(r.url())

const confirmDelete = async (page: Page, scope = page.locator('body')) => {
  await scope.locator('.doc-controls__popup button, .popup__trigger').first().click()
  const [res] = await Promise.all([
    page.waitForResponse(isDelete, { timeout: 30_000 }),
    (async () => {
      await page.locator('#action-delete:visible').click()
      await page.locator('#confirm-action').click()
    })(),
  ])
  return res
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
})

test('D1 document view refuses to delete a photo a card uses', async ({ page }) => {
  const used = await makeUsed()
  await login({ page, user: ADMIN })
  await page.goto(`/admin/collections/media/${used.id}`)
  await page.locator('#field-alt').waitFor({ timeout: 30_000 })
  const res = await confirmDelete(page)
  expect(res.status()).toBe(400)
  await expect(page.getByText(used.cardName).first()).toBeVisible()
  expect(await exists(used.id)).toBe(true)
})

test('D2 bulk delete from the list removes only the unused photo and names the card', async ({
  page,
}) => {
  const used = await makeUsed()
  const unused = await makeMedia()
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/media')
  const rowFor = (filename: string) => page.locator('tbody tr').filter({ hasText: filename })
  await expect(rowFor(used.filename)).toBeVisible({ timeout: 30_000 })
  await expect(rowFor(unused.filename)).toBeVisible()
  await rowFor(used.filename).locator('input[type=checkbox]').check()
  await rowFor(unused.filename).locator('input[type=checkbox]').check()
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  const [res] = await Promise.all([
    page.waitForResponse(isDelete, { timeout: 30_000 }),
    page.locator('#confirm-action').click(),
  ])
  expect(res.status()).toBe(400)
  await expect(page.getByText(used.cardName).first()).toBeVisible()
  await expect(rowFor(unused.filename)).toHaveCount(0)
  await expect(rowFor(used.filename)).toHaveCount(1)
  expect(await exists(used.id)).toBe(true)
  expect(await exists(unused.id)).toBe(false)
})

test("D3 the pencil drawer's delete is refused and the card keeps its photo", async ({ page }) => {
  const used = await makeUsed()
  await login({ page, user: ADMIN })
  await openCard(page, used.cardId)
  const dr = await pencil(page)
  const res = await confirmDelete(page, dr)
  expect(res.status()).toBe(400)
  await expect(page.getByText(used.cardName).first()).toBeVisible()
  expect(await exists(used.id)).toBe(true)
  await expect(drawer(page).locator('#field-alt')).toBeVisible()
  await expect(page.getByTestId('headshot-crop-img')).toBeVisible()
})

test('D4 an unused photo deletes from the list with a success toast', async ({ page }) => {
  const unused = await makeMedia()
  await login({ page, user: ADMIN })
  await page.goto('/admin/collections/media')
  const row = page.locator('tbody tr').filter({ hasText: unused.filename })
  await expect(row).toBeVisible({ timeout: 30_000 })
  await row.locator('input[type=checkbox]').check()
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  const [res] = await Promise.all([
    page.waitForResponse(isDelete, { timeout: 30_000 }),
    page.locator('#confirm-action').click(),
  ])
  expect(res.status()).toBe(200)
  await expect(page.getByText(/deleted.*successfully|successfully.*deleted/i).first()).toBeVisible()
  await expect(row).toHaveCount(0)
  expect(await exists(unused.id)).toBe(false)
})

test('D5 a refused delete answers 400, never 500', async ({ page }) => {
  const used = await makeUsed()
  await login({ page, user: ADMIN })
  // Payload rejects cookie-authenticated writes that carry no allowed Origin.
  const headers = { Origin: new URL(page.url()).origin }
  const res = await page.request.delete(`/api/media/${used.id}`, { headers })
  expect(res.status()).toBe(400)
  const bulk = await page.request.delete(`/api/media?where[id][equals]=${used.id}`, {
    headers,
  })
  expect(bulk.status()).toBe(400)
  expect(await exists(used.id)).toBe(true)
})
