// @vitest-environment node
import { getPayload, handleEndpoints, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startFakeBlob, type FakeBlob } from '../helpers/fakeBlob'

/*
 * Runs the real Blob serve path (Payload endpoint, checkFileAccess, the vercel-blob
 * staticHandler, getFilePrefix, @vercel/blob head, file fetch) against a local fake.
 * Local-disk serving never reaches the storage handler, which is how #153 shipped a
 * 500 on every file. The Blob env must be set before the config module is evaluated,
 * so nothing here imports it statically.
 */

const ENV = [
  'BLOB_READ_WRITE_TOKEN',
  'STORAGE_VERCEL_BLOB_BASE_URL',
  'VERCEL_BLOB_API_URL',
] as const

let payload: Payload
let config: Awaited<typeof import('@/payload.config').default>
let fake: FakeBlob
const saved: Record<string, string | undefined> = {}
const stamp = Date.now()
const mainName = `blob-serve-${stamp}.jpg`
const thumbName = `blob-serve-${stamp}-thumb.jpg`
const prefixedName = `blob-serve-prefixed-${stamp}.jpg`
const rowIds: number[] = []
let mainId: number
let mainBytes: Buffer
let thumbBytes: Buffer

const jpeg = (width: number, shade: number) =>
  sharp({ create: { width, height: 20, channels: 3, background: { r: shade, g: 90, b: 60 } } })
    .jpeg()
    .toBuffer()

const get = (pathAndQuery: string) =>
  handleEndpoints({
    config,
    path: pathAndQuery.split('?')[0],
    request: new Request(`http://localhost:3000${pathAndQuery}`),
  })

async function seed(data: Record<string, unknown>) {
  const row = await payload.db.create({
    collection: 'media',
    data: { alt: 'Blob serve test', mimeType: 'image/jpeg', width: 40, height: 20, ...data },
  })
  rowIds.push(row.id as number)
  return row.id as number
}

beforeAll(async () => {
  fake = await startFakeBlob()
  for (const name of ENV) saved[name] = process.env[name]
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_fake152store_throwaway'
  process.env.STORAGE_VERCEL_BLOB_BASE_URL = `${fake.origin}/store`
  process.env.VERCEL_BLOB_API_URL = `${fake.origin}/api`

  config = await (await import('@/payload.config')).default
  payload = await getPayload({ config })

  mainBytes = await jpeg(40, 10)
  thumbBytes = await jpeg(20, 200)
  fake.files.set(mainName, { bytes: mainBytes, contentType: 'image/jpeg' })
  fake.files.set(thumbName, { bytes: thumbBytes, contentType: 'image/jpeg' })

  mainId = await seed({
    filename: mainName,
    sizes: { thumbnail: { filename: thumbName, mimeType: 'image/jpeg', width: 20, height: 20 } },
  })
  await seed({ filename: prefixedName })
})

afterAll(async () => {
  for (const id of rowIds)
    await payload.db.deleteOne({ collection: 'media', where: { id: { equals: id } } })
  await fake.close()
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

describe('anonymous file serving with the Blob adapter on', () => {
  it('has the Blob adapter registered', () => {
    const upload = payload.collections.media.config.upload
    expect(upload.handlers?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(upload.disableLocalStorage).toBe(true)
  })

  it('serves the original file', async () => {
    const res = await get(`/api/media/file/${mainName}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(Buffer.from(await res.arrayBuffer()).equals(mainBytes)).toBe(true)
    const heads = fake.requests
      .filter((r) => r.startsWith('GET /api?url='))
      .map((r) => new URLSearchParams(r.slice('GET /api?'.length)).get('url'))
    expect(heads).toContain(`${fake.origin}/store/${mainName}`)
  })

  it('serves a generated size', async () => {
    const res = await get(`/api/media/file/${thumbName}`)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).equals(thumbBytes)).toBe(true)
  })

  it('refuses a file that does not exist', async () => {
    const res = await get(`/api/media/file/no-such-${stamp}.jpg`)
    expect(res.status).toBe(403)
  })

  it('does not serve a file for an unknown ?prefix=', async () => {
    const res = await get(`/api/media/file/${mainName}?prefix=nope`)
    expect(res.status).not.toBe(200)
    const body = await res.text()
    expect(body).not.toContain(mainName)
    expect(body).not.toContain(prefixedName)
  })
})

describe('anonymous API reads stay refused with the Blob adapter on', () => {
  it('refuses the list', async () => {
    const res = await get('/api/media')
    expect(res.status).toBe(403)
    const body = await res.text()
    expect(body).not.toContain(mainName)
    expect(body).not.toContain(prefixedName)
  })

  it('refuses the count', async () => {
    expect((await get('/api/media/count')).status).toBe(403)
  })

  it('refuses fetch by id and search by filename', async () => {
    expect((await get(`/api/media/${mainId}`)).status).toBe(403)
    const search = await get(`/api/media?where[filename][equals]=${mainName}`)
    expect(search.status).toBe(403)
    const body = await search.text()
    expect(body).not.toContain(mainName)
    expect(body).not.toContain(prefixedName)
  })
})
