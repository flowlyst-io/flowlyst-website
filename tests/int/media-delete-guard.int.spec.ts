// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
const stamp = Date.now()
const cardIds: number[] = []
const mediaIds: number[] = []
let png: Buffer
let n = 0

async function upload() {
  const name = `delete-guard-${stamp}-${++n}.png`
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Delete guard test' },
    file: { data: png, mimetype: 'image/png', name, size: png.length },
  })
  mediaIds.push(media.id)
  return media
}

async function makeCard(name: string, headshot: number) {
  const card = await payload.create({ collection: 'cards', data: { name, headshot } })
  cardIds.push(card.id)
  return card
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  png = await sharp({
    create: { width: 300, height: 200, channels: 3, background: { r: 30, g: 120, b: 90 } },
  })
    .png()
    .toBuffer()
})

afterAll(async () => {
  await payload.delete({ collection: 'cards', where: { id: { in: cardIds } } })
  for (const id of mediaIds) await payload.delete({ collection: 'media', id }).catch(() => {})
})

describe('media delete guard', () => {
  it('refuses to delete a photo a card uses, naming the card', async () => {
    const media = await upload()
    const card = await makeCard(`Guard One ${stamp}`, media.id)
    const err = await payload.delete({ collection: 'media', id: media.id }).catch((e) => e)
    expect(err.status).toBe(400)
    expect(err.message).toContain(`"Guard One ${stamp}"`)
    expect((await payload.findByID({ collection: 'media', id: media.id })).id).toBe(media.id)
    const after = await payload.findByID({ collection: 'cards', id: card.id, depth: 0 })
    expect(after.headshot).toBe(media.id)
  })

  it('names every card when several use the photo', async () => {
    const media = await upload()
    await makeCard(`Guard A ${stamp}`, media.id)
    await makeCard(`Guard B ${stamp}`, media.id)
    const err = await payload.delete({ collection: 'media', id: media.id }).catch((e) => e)
    expect(err.status).toBe(400)
    expect(err.message).toContain(`"Guard A ${stamp}"`)
    expect(err.message).toContain(`"Guard B ${stamp}"`)
  })

  it('bulk delete removes the unused photo and reports the used one', async () => {
    const used = await upload()
    const unused = await upload()
    await makeCard(`Guard Bulk ${stamp}`, used.id)
    const res = await payload.delete({
      collection: 'media',
      where: { id: { in: [used.id, unused.id] } },
    })
    expect(res.docs.map((d) => d.id)).toEqual([unused.id])
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].id).toBe(used.id)
    expect(res.errors[0].isPublic).toBe(true)
    expect(res.errors[0].message).toContain(`"Guard Bulk ${stamp}"`)
    await expect(payload.findByID({ collection: 'media', id: unused.id })).rejects.toThrow()
  })

  it('deletes once the card no longer uses the photo', async () => {
    const media = await upload()
    const card = await makeCard(`Guard Unlink ${stamp}`, media.id)
    await payload.update({ collection: 'cards', id: card.id, data: { headshot: null } })
    await payload.delete({ collection: 'media', id: media.id })
    await expect(payload.findByID({ collection: 'media', id: media.id })).rejects.toThrow()
  })

  it('deletes an unused photo', async () => {
    const media = await upload()
    await payload.delete({ collection: 'media', id: media.id })
    await expect(payload.findByID({ collection: 'media', id: media.id })).rejects.toThrow()
  })
})
