// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import { GET } from '@/app/(card)/card/[slug]/vcard/route'
import { parseVcf } from '../helpers/parseVcf'

let payload: Payload
const stamp = Date.now()
const cardIds: number[] = []
const mediaIds: number[] = []

async function upload(name: string, png: Buffer) {
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Photo test' },
    file: { data: png, mimetype: 'image/png', name, size: png.length },
  })
  mediaIds.push(media.id)
  return media
}

async function makeCard(data: Record<string, unknown>) {
  const card = await payload.create({
    collection: 'cards',
    data: { name: 'Photo Test', ...data } as never,
  })
  cardIds.push(card.id)
  return card
}

const call = (slug: string) =>
  GET(new Request('http://localhost/x'), { params: Promise.resolve({ slug }) })

const storedPath = (filename: string) => path.resolve('media', filename)

let png: Buffer

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  png = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 30, g: 120, b: 90 } },
  })
    .png()
    .toBuffer()
})

afterAll(async () => {
  await payload.delete({ collection: 'cards', where: { id: { in: cardIds } } })
  for (const id of mediaIds) await payload.delete({ collection: 'media', id }).catch(() => {})
})

describe('GET /card/[slug]/vcard photo', () => {
  it('embeds the cropped square with the route headers intact', async () => {
    const media = await upload(`photo-a-${stamp}.png`, png)
    const card = await makeCard({
      headshot: media.id,
      headshotCrop: { zoom: 2, x: 0.5, y: 0.5, aspect: 1.5 },
    })
    const before = createHash('sha256')
      .update(await readFile(storedPath(media.filename!)))
      .digest('hex')
    const res = await call(card.slug as string)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/vcard; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
    expect(res.headers.get('content-disposition')).toMatch(/\.vcf"$/)
    const text = await res.text()
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(170_000)
    const { photo } = parseVcf(text)
    expect(photo!.subarray(0, 2).toString('hex')).toBe('ffd8')
    const meta = await sharp(photo!).metadata()
    expect([meta.width, meta.height]).toEqual([400, 400])
    const after = createHash('sha256')
      .update(await readFile(storedPath(media.filename!)))
      .digest('hex')
    expect(after).toBe(before)
  })

  it('uses the centred square when there is no crop', async () => {
    const media = await upload(`photo-b-${stamp}.png`, png)
    const card = await makeCard({ headshot: media.id })
    const { photo } = parseVcf(await (await call(card.slug as string)).text())
    const meta = await sharp(photo!).metadata()
    expect([meta.width, meta.height]).toEqual([512, 512])
  })

  it('has no PHOTO without a headshot', async () => {
    const card = await makeCard({})
    const { lines, photo } = parseVcf(await (await call(card.slug as string)).text())
    expect(photo).toBeNull()
    expect(lines.some((l) => l.startsWith('FN:'))).toBe(true)
  })

  it('still gives a valid vCard when the stored file is garbage', async () => {
    const media = await upload(`photo-c-${stamp}.png`, png)
    const card = await makeCard({ headshot: media.id })
    await writeFile(storedPath(media.filename!), 'garbage')
    const spy = vi.spyOn(payload.logger, 'error').mockImplementation(() => undefined)
    const res = await call(card.slug as string)
    expect(res.status).toBe(200)
    expect(parseVcf(await res.text()).photo).toBeNull()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('still gives a valid vCard when the stored file is gone', async () => {
    const media = await upload(`photo-d-${stamp}.png`, png)
    const card = await makeCard({ headshot: media.id })
    await rm(storedPath(media.filename!))
    const spy = vi.spyOn(payload.logger, 'error').mockImplementation(() => undefined)
    const res = await call(card.slug as string)
    expect(res.status).toBe(200)
    expect(parseVcf(await res.text()).photo).toBeNull()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('returns 404 for an unknown slug', async () => {
    expect((await call('no-such-card-zzzzzz')).status).toBe(404)
  })

  it('refuses a headshot whose photo was deleted, and still saves a valid or empty one', async () => {
    const media = await upload(`photo-e-${stamp}.png`, png)
    const card = await makeCard({ headshot: media.id })
    const gone = await upload(`photo-f-${stamp}.png`, png)
    await payload.delete({ collection: 'media', id: gone.id })

    const update = (headshot: number | null) =>
      payload.update({ collection: 'cards', id: card.id, data: { headshot }, depth: 0 })

    await expect(update(gone.id)).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: 'headshot',
            message: 'This photo was deleted. Remove it and choose another.',
          },
        ],
      },
    })
    expect((await update(media.id)).headshot).toBe(media.id)
    expect((await update(null)).headshot ?? null).toBeNull()
  })
})
