// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mediaRead } from '@/access'
import { readMediaBytes } from '@/utilities/cardPhoto'
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
    data: { name: `MP Author ${stamp}`, slug: `mp-author-${stamp}`, photo: media.id },
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
    expect(mediaRead(args(true))).toEqual({ id: { exists: true } })
    expect(mediaRead(args(false))).toBe(false)
  })
})

describe('uploads drop camera metadata', () => {
  const MAKE = 'ThrowawayCam152'
  const MODEL = 'TestModel152'

  it('strips EXIF from the original and every size', async () => {
    const f1 = await jpeg(1600, 900)
      .withExif({
        IFD0: { Make: MAKE, Model: MODEL },
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '41/1 52/1 0/1',
          GPSLongitudeRef: 'W',
          GPSLongitude: '87/1 37/1 0/1',
        },
      })
      .jpeg()
      .toBuffer()
    expect((await sharp(f1).metadata()).exif).toBeDefined()
    expect(f1.includes(MAKE)).toBe(true)
    expect(f1.includes(MODEL)).toBe(true)

    const doc = await uploadMedia(`exif-${stamp}.jpg`, f1, 'image/jpeg')
    const original = await readMediaBytes(payload, doc)
    expect((await sharp(original).metadata()).exif).toBeUndefined()
    expect(original.includes(MAKE)).toBe(false)
    expect(original.includes(MODEL)).toBe(false)
    expect(doc.mimeType).toBe('image/jpeg')
    expect((await sharp(original).metadata()).format).toBe('jpeg')
    expect(doc.width).toBe(1600)
    expect(doc.height).toBe(900)

    expect(doc.sizes?.thumbnail?.filename).toBeTruthy()
    expect(doc.sizes?.og?.filename).toBeTruthy()
    for (const size of Object.values(doc.sizes ?? {})) {
      if (!size?.filename) continue
      const bytes = await readMediaBytes(payload, { ...doc, filename: size.filename })
      expect((await sharp(bytes).metadata()).exif).toBeUndefined()
      expect(bytes.includes(MAKE)).toBe(false)
    }
  })

  it('bakes the orientation into the pixels', async () => {
    const f2 = await jpeg(300, 200).withMetadata({ orientation: 6 }).jpeg().toBuffer()
    expect((await sharp(f2).metadata()).orientation).toBe(6)

    const doc = await uploadMedia(`rotated-${stamp}.jpg`, f2, 'image/jpeg')
    expect(doc.width).toBe(200)
    expect(doc.height).toBe(300)
    const meta = await sharp(await readMediaBytes(payload, doc)).metadata()
    expect(meta.orientation).toBeUndefined()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(300)
  })

  it('keeps a PNG a PNG', async () => {
    const f3 = await jpeg(300, 200).png().toBuffer()
    const doc = await uploadMedia(`plain-${stamp}.png`, f3, 'image/png')
    expect(doc.mimeType).toBe('image/png')
    expect((await sharp(await readMediaBytes(payload, doc)).metadata()).format).toBe('png')
  })
})

describe('allowed upload types', () => {
  it('refuses a HEIC upload', async () => {
    const bytes = Buffer.from('not really a heic file')
    await expect(uploadMedia(`photo-${stamp}.heic`, bytes, 'image/heic')).rejects.toThrow()
  })

  it('accepts a JPEG upload', async () => {
    const bytes = await jpeg(100, 100).jpeg().toBuffer()
    const doc = await uploadMedia(`allowed-${stamp}.jpg`, bytes, 'image/jpeg')
    expect(doc.mimeType).toBe('image/jpeg')
  })
})
