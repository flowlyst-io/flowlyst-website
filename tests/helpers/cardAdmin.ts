import { expect, type Locator, type Page } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'
import config from '../../src/payload.config.js'

export const quadrants = async () => {
  const quad = (r: number, g: number, b: number) =>
    sharp({ create: { width: 600, height: 400, channels: 3, background: { r, g, b } } })
      .png()
      .toBuffer()
  const [a, b, c, d] = await Promise.all([
    quad(220, 30, 30),
    quad(30, 30, 220),
    quad(30, 160, 30),
    quad(230, 200, 20),
  ])
  return sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: 600, top: 0 },
      { input: c, left: 0, top: 400 },
      { input: d, left: 600, top: 400 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer()
}

export type Rgb = [number, number, number]

export const RED: Rgb = [220, 30, 30]
export const GREEN: Rgb = [30, 160, 30]
export const BLUE: Rgb = [30, 60, 230]

export const solidJpeg = (colour: Rgb, width = 1200, height = 800) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: colour[0], g: colour[1], b: colour[2] },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer()

/** Red left half, blue right half; a crop to the right half changes the centre colour. */
export const halfRedHalfBlue = async (width = 1200, height = 1600) => {
  const half = await sharp({
    create: {
      width: width / 2,
      height,
      channels: 3,
      background: { r: BLUE[0], g: BLUE[1], b: BLUE[2] },
    },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width, height, channels: 3, background: { r: RED[0], g: RED[1], b: RED[2] } },
  })
    .composite([{ input: half, left: width / 2, top: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

export const getCard = async (id: number | string) => {
  const payload = await getPayload({ config })
  return payload.findByID({ collection: 'cards', id, depth: 0 })
}

export const styleOf = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const s = (el as HTMLElement).style
    return {
      left: parseFloat(s.left),
      top: parseFloat(s.top),
      width: parseFloat(s.width),
      height: parseFloat(s.height),
    }
  })

export const openCard = async (page: Page, id: number | string) => {
  await page.goto(`/admin/collections/cards/${id}`)
  await expect(page.getByTestId('headshot-crop')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('headshot-crop-zoom')).toBeEnabled({ timeout: 30_000 })
}

export const save = async (page: Page) => {
  await page.getByRole('button', { name: 'Save' }).first().click()
  await expect(
    page.getByText('Updated successfully.').or(page.getByText('successfully')),
  ).toBeVisible({ timeout: 30_000 })
}

export const drawer = (page: Page) => page.locator('.drawer--is-open').last()

/** Opens the pencil drawer for the card's photo. */
export const pencil = async (page: Page) => {
  await page.locator('.field-type.upload .upload-relationship-details__edit').first().click()
  const dr = drawer(page)
  await dr.locator('#field-alt').waitFor({ timeout: 20_000 })
  return dr
}

/** Replaces the file in the open drawer and saves it; resolves with the PATCH status. */
export const replaceInDrawer = async (page: Page, filePath: string) => {
  const dr = await pencil(page)
  await dr.locator('.file-details__remove').click()
  const input = dr.locator('input[type=file]')
  await input.first().waitFor({ state: 'attached', timeout: 10_000 })
  await input.first().setInputFiles(filePath)
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => /\/api\/media\//.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 60_000 },
    ),
    dr.locator('#action-save').click(),
  ])
  return res.status()
}

/** Crops the photo to its right half through Edit Image and saves the drawer. */
export const editImageInDrawer = async (page: Page) => {
  const dr = await pencil(page)
  await dr.getByRole('button', { name: 'Edit Image' }).click()
  const inputs = page.locator('.edit-upload__inputsWrap input')
  await inputs.first().waitFor({ timeout: 20_000 })
  await inputs.nth(0).fill('500')
  const sel = page.locator('.ReactCrop__crop-selection').first()
  const bb = (await sel.boundingBox())!
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await page.mouse.down()
  await page.mouse.move(bb.x + bb.width / 2 + 500, bb.y + bb.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.locator('.edit-upload__save').click()
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => /\/api\/media\//.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 60_000 },
    ),
    drawer(page).locator('#action-save').click(),
  ])
  return res.status()
}

export const closeDrawer = async (page: Page) => {
  await drawer(page).locator('.doc-drawer__header-close').click()
  await expect(page.locator('.drawer--is-open')).toHaveCount(0)
}

/** Colour of the centre pixel of the element, from a screenshot. */
export const centreColour = async (locator: Locator): Promise<Rgb> => {
  const raw = await sharp(await locator.screenshot())
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = raw.info
  const i = (Math.floor(height / 2) * width + Math.floor(width / 2)) * channels
  return [raw.data[i], raw.data[i + 1], raw.data[i + 2]]
}

export const expectNear = (actual: Rgb, expected: Rgb, tolerance = 24) => {
  for (let c = 0; c < 3; c++) {
    expect(
      Math.abs(actual[c] - expected[c]),
      `channel ${c}: ${actual} vs ${expected}`,
    ).toBeLessThanOrEqual(tolerance)
  }
}

/** Waits for the element's centre pixel to reach the colour, so a refresh in flight is not read early. */
export const expectCentre = (locator: Locator, expected: Rgb, tolerance = 24) =>
  expect
    .poll(async () => {
      const actual = await centreColour(locator)
      return Math.max(...actual.map((v, i) => Math.abs(v - expected[i])))
    })
    .toBeLessThanOrEqual(tolerance)
