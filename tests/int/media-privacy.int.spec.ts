// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mediaRead } from '@/access'
import config from '@/payload.config'
import type { Media, User } from '@/payload-types'

let payload: Payload
let admin: User
let editor: User
let media: Media
let authorId: number
const stamp = Date.now()
const mediaIds: number[] = []
const pw = 'test-password-123'
const DENIED = /not allowed|forbidden/i
// Payload mutates the req it is given (it sets req.user), so each call needs its own.
const rest = () => ({ payloadAPI: 'REST' }) as never
const graphql = () => ({ payloadAPI: 'GraphQL' }) as never

async function uploadMedia(name: string, data: Buffer, mimetype: string) {
  const doc = await payload.create({
    collection: 'media',
    data: { alt: 'Media privacy test' },
    file: { data, mimetype, name, size: data.length },
  })
  mediaIds.push(doc.id)
  return doc
}

const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 90 } } })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  admin = await payload.create({
    collection: 'users',
    data: {
      email: `mp-admin-${stamp}@flowlyst.test`,
      password: pw,
      name: 'MP Admin',
      role: 'admin',
    },
  })
  editor = await payload.create({
    collection: 'users',
    data: {
      email: `mp-editor-${stamp}@flowlyst.test`,
      password: pw,
      name: 'MP Editor',
      role: 'editor',
    },
  })
  const buf = await jpeg(300, 200).jpeg().toBuffer()
  media = await uploadMedia(`media-privacy-${stamp}.jpg`, buf, 'image/jpeg')
  const author = await payload.create({
    collection: 'authors',
    data: { name: `MP Author ${stamp}`, photo: media.id },
  })
  authorId = author.id
})

afterAll(async () => {
  await payload.delete({ collection: 'authors', where: { id: { equals: authorId } } })
  for (const id of mediaIds) await payload.delete({ collection: 'media', id }).catch(() => {})
  await payload.delete({ collection: 'users', where: { email: { contains: `mp-` } } })
})

describe('media access', () => {
  it('refuses an anonymous REST list', async () => {
    await expect(
      payload.find({ collection: 'media', overrideAccess: false, req: rest() }),
    ).rejects.toThrow(DENIED)
  })

  it('refuses an anonymous GraphQL list', async () => {
    await expect(
      payload.find({ collection: 'media', overrideAccess: false, req: graphql() }),
    ).rejects.toThrow(DENIED)
  })

  it('refuses an anonymous fetch by id', async () => {
    await expect(
      payload.findByID({ collection: 'media', id: media.id, overrideAccess: false, req: rest() }),
    ).rejects.toThrow(DENIED)
  })

  it('refuses an anonymous count', async () => {
    await expect(
      payload.count({ collection: 'media', overrideAccess: false, req: rest() }),
    ).rejects.toThrow(DENIED)
  })

  it.each([
    ['editor', () => editor],
    ['admin', () => admin],
  ])('lets the %s list media over REST', async (_role, getUser) => {
    const res = await payload.find({
      collection: 'media',
      where: { id: { equals: media.id } },
      user: getUser(),
      overrideAccess: false,
      req: rest(),
    })
    expect(res.docs[0].id).toBe(media.id)
  })

  it('still populates the author photo for a server-rendered page', async () => {
    const res = await payload.find({
      collection: 'authors',
      where: { id: { equals: authorId } },
      depth: 1,
      overrideAccess: false,
    })
    const photo = res.docs[0].photo as Media
    expect(typeof photo).toBe('object')
    expect(photo.url).toContain('/api/media/file/')
  })

  it('returns the author photo as a bare id over REST', async () => {
    const res = await payload.find({
      collection: 'authors',
      where: { id: { equals: authorId } },
      depth: 1,
      overrideAccess: false,
      req: rest(),
    })
    expect(res.docs[0].photo).toBe(media.id)
  })

  it('serves static files to anyone and nothing else', () => {
    const args = (isReadingStaticFile: boolean) =>
      ({ req: { user: null, payloadAPI: 'REST' }, isReadingStaticFile }) as never
    expect(mediaRead(args(true))).toBe(true)
    expect(mediaRead(args(false))).toBe(false)
  })
})
