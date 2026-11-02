// @vitest-environment node
// Card headshot crop (#148): storage, clamping in the hook, and that saving a
// crop never touches the media record.
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
let mediaId: number
const stamp = Date.now()
const cardIds: number[] = []

const makeCard = async (data: Record<string, unknown> = {}) => {
  const card = await payload.create({
    collection: 'cards',
    data: { name: 'Crop Test', headshot: mediaId, ...data } as never,
  })
  cardIds.push(card.id)
  return card
}

const cropOf = (card: { headshotCrop?: Record<string, unknown> | null }) => card.headshotCrop

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const png = await sharp({
    create: { width: 300, height: 200, channels: 3, background: { r: 20, g: 90, b: 160 } },
  })
    .png()
    .toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Crop test photo' },
    file: { data: png, mimetype: 'image/png', name: `crop-${stamp}.png`, size: png.length },
  })
  mediaId = media.id
})

afterAll(async () => {
  await payload.delete({ collection: 'cards', where: { id: { in: cardIds } } })
  await payload.delete({ collection: 'media', id: mediaId })
})

describe('Card headshotCrop', () => {
  it('is all null on a fresh card', async () => {
    const card = await makeCard()
    expect(cropOf(card)).toEqual({ zoom: null, x: null, y: null, aspect: null })
  })

  it('clamps out-of-range values and stores numbers', async () => {
    const card = await makeCard()
    const saved = await payload.update({
      collection: 'cards',
      id: card.id,
      data: { headshotCrop: { zoom: 99, x: -1, y: 5, aspect: 1 } },
    })
    const read = await payload.findByID({ collection: 'cards', id: card.id })
    for (const doc of [saved, read]) {
      expect(cropOf(doc)).toEqual({ zoom: 4, x: 0, y: 1, aspect: 1 })
    }
    for (const v of Object.values(read.headshotCrop!)) expect(typeof v).toBe('number')
  })

  it('nulls everything for a non-numeric value without throwing', async () => {
    const card = await makeCard()
    const saved = await payload.update({
      collection: 'cards',
      id: card.id,
      data: { headshotCrop: { zoom: 'abc', x: 0.5, y: 0.5 } as never },
    })
    expect(cropOf(saved)).toEqual({ zoom: null, x: null, y: null, aspect: null })
  })

  it('nulls everything for a partial crop', async () => {
    const card = await makeCard()
    const saved = await payload.update({
      collection: 'cards',
      id: card.id,
      data: { headshotCrop: { zoom: 2 } },
    })
    expect(cropOf(saved)).toEqual({ zoom: null, x: null, y: null, aspect: null })
  })

  it('keeps the crop on a name-only update', async () => {
    const card = await makeCard({ headshotCrop: { zoom: 2, x: 0.3, y: 0.6, aspect: 1.5 } })
    const saved = await payload.update({
      collection: 'cards',
      id: card.id,
      data: { name: 'Renamed' },
    })
    expect(cropOf(saved)).toEqual({ zoom: 2, x: 0.3, y: 0.6, aspect: 1.5 })
  })

  it('clears the crop when the headshot is removed', async () => {
    const card = await makeCard({ headshotCrop: { zoom: 2, x: 0.3, y: 0.6, aspect: 1.5 } })
    const saved = await payload.update({
      collection: 'cards',
      id: card.id,
      data: { headshot: null },
    })
    expect(cropOf(saved)).toEqual({ zoom: null, x: null, y: null, aspect: null })
  })

  it('is copied by duplicate', async () => {
    const card = await makeCard({ headshotCrop: { zoom: 3, x: 0.4, y: 0.4, aspect: 1.5 } })
    const copy = await payload.duplicate({ collection: 'cards', id: card.id })
    cardIds.push(copy.id)
    expect(cropOf(copy)).toEqual({ zoom: 3, x: 0.4, y: 0.4, aspect: 1.5 })
  })

  it('leaves the media record untouched', async () => {
    const before = await payload.findByID({ collection: 'media', id: mediaId })
    const card = await makeCard()
    await payload.update({
      collection: 'cards',
      id: card.id,
      data: { headshotCrop: { zoom: 2, x: 0.5, y: 0.5, aspect: 1.5 } },
    })
    const after = await payload.findByID({ collection: 'media', id: mediaId })
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(after.filename).toBe(before.filename)
  })
})
