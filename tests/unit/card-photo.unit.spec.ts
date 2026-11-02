// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({
  createLocalReq: async (_o: unknown, payload: unknown) => ({ headers: new Headers(), payload }),
}))

import { cropToJpeg, loadCardPhoto, PHOTO_MAX_BYTES } from '@/utilities/cardPhoto'
import { normalizeCrop } from '@/utilities/headshotCropShared'

const solid = (w: number, h: number, c: { r: number; g: number; b: number }) =>
  sharp({ create: { width: w, height: h, channels: 3, background: c } })

async function halves(w: number, h: number) {
  const left = await sharp({
    create: { width: w / 2, height: h, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .composite([{ input: left, left: 0, top: 0 }])
    .png()
    .toBuffer()
}

const noise = (size: number) =>
  sharp(
    Buffer.from(Array.from({ length: size * size * 3 }, () => Math.floor(Math.random() * 256))),
    {
      raw: { width: size, height: size, channels: 3 },
    },
  )

async function means(jpeg: Buffer) {
  const { channels } = await sharp(jpeg).stats()
  return channels.map((c) => c.mean)
}

describe('cropToJpeg', () => {
  it('crops to the requested side of the image', async () => {
    const png = await halves(800, 800)
    const left = await cropToJpeg(png, { zoom: 2, x: 0.25, y: 0.5 })
    const meta = await sharp(left).metadata()
    expect([meta.width, meta.height]).toEqual([400, 400])
    const [r, , b] = await means(left)
    expect(r).toBeGreaterThan(200)
    expect(b).toBeLessThan(50)
    const [r2, , b2] = await means(await cropToJpeg(png, { zoom: 2, x: 0.75, y: 0.5 }))
    expect(b2).toBeGreaterThan(200)
    expect(r2).toBeLessThan(50)
  })

  it('sizes the output at 512 and never enlarges', async () => {
    const dims = async (buf: Buffer) => {
      const m = await sharp(buf).metadata()
      return [m.width, m.height]
    }
    expect(
      await dims(
        await cropToJpeg(await solid(1200, 800, { r: 9, g: 9, b: 9 }).png().toBuffer(), null),
      ),
    ).toEqual([512, 512])
    expect(
      await dims(
        await cropToJpeg(await solid(300, 200, { r: 9, g: 9, b: 9 }).png().toBuffer(), null),
      ),
    ).toEqual([200, 200])
    expect(
      await dims(
        await cropToJpeg(await solid(2000, 2000, { r: 9, g: 9, b: 9 }).png().toBuffer(), {
          zoom: 1,
          x: 0.5,
          y: 0.5,
        }),
      ),
    ).toEqual([512, 512])
  })

  it('flattens transparency onto the diamond colour', async () => {
    const png = await sharp({
      create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    const m = await means(await cropToJpeg(png, null))
    ;[230, 246, 239].forEach((v, i) => expect(Math.abs(m[i] - v)).toBeLessThanOrEqual(6))
  })

  it('turns WebP and GIF sources into JPEG', async () => {
    const base = solid(300, 300, { r: 40, g: 80, b: 120 })
    const webp = await base.clone().webp().toBuffer()
    const gif = await base.clone().gif().toBuffer()
    for (const src of [webp, gif]) {
      expect((await sharp(await cropToJpeg(src, null)).metadata()).format).toBe('jpeg')
    }
  })

  it('applies EXIF orientation before cropping', async () => {
    const top = await solid(400, 400, { r: 255, g: 0, b: 0 }).png().toBuffer()
    const jpeg = await solid(400, 800, { r: 0, g: 0, b: 255 })
      .composite([{ input: top, left: 0, top: 0 }])
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const out = await cropToJpeg(jpeg, { zoom: 1, x: 0.25, y: 0.5 })
    const meta = await sharp(out).metadata()
    expect([meta.width, meta.height]).toEqual([400, 400])
    expect(meta.orientation).toBeUndefined()
    expect((await means(out))[2]).toBeGreaterThan(200)
  })

  it("keeps real-size noise inside the ceiling when downscaled, isn't progressive", async () => {
    const out = await cropToJpeg(await noise(2000).png().toBuffer(), null)
    expect(out.length).toBeLessThanOrEqual(PHOTO_MAX_BYTES)
    expect((await sharp(out).metadata()).isProgressive).toBe(false)
  })

  it('rejects an over-ceiling result', async () => {
    await expect(cropToJpeg(await noise(512).png().toBuffer(), null)).rejects.toThrow()
  })

  it('falls back to the centre for a bad crop', async () => {
    const png = await halves(800, 800)
    const bad = normalizeCrop({ zoom: 'x' })
    expect(bad).toBeNull()
    const m = await means(await cropToJpeg(png, bad))
    expect(m[0]).toBeGreaterThan(100)
    expect(m[2]).toBeGreaterThan(100)
  })

  it('rejects garbage bytes', async () => {
    await expect(cropToJpeg(Buffer.from('not an image'), null)).rejects.toThrow()
  })
})

type Handler = (req: unknown, args: Record<string, unknown>) => unknown
function fakePayload(handlers: Handler[] | undefined, staticDir?: string) {
  return {
    collections: { media: { config: { upload: { handlers, staticDir } } } },
    logger: { error: vi.fn() },
  } as never as { logger: { error: ReturnType<typeof vi.fn> } } & Parameters<
    typeof loadCardPhoto
  >[0]
}
const media = (extra: Record<string, unknown> = {}) =>
  ({ id: 7, filename: 'a.png', mimeType: 'image/png', filesize: 1000, alt: 'x', ...extra }) as never

describe('loadCardPhoto', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  afterEach(() => {
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.clearAllMocks()
  })

  it('reads through a storage handler and returns a JPEG', async () => {
    const png = await solid(300, 300, { r: 1, g: 2, b: 3 }).png().toBuffer()
    const handler = vi.fn(async () => new Response(png, { status: 200 }))
    const m = media()
    const out = await loadCardPhoto(fakePayload([handler]), m, null)
    expect((await sharp(out!).metadata()).format).toBe('jpeg')
    const args = handler.mock.calls[0] as unknown as [unknown, Record<string, unknown>]
    expect(args[1].doc).toBe(m)
    expect((args[1].params as Record<string, unknown>).filename).toBe('a.png')
  })

  it.each([204, 404, 500])('gives null and logs once for handler status %i', async (status) => {
    const p = fakePayload([async () => new Response(null, { status })])
    expect(await loadCardPhoto(p, media(), null)).toBeNull()
    expect(p.logger.error).toHaveBeenCalledTimes(1)
  })

  it('gives null and logs once when a handler throws', async () => {
    const p = fakePayload([
      async () => {
        throw new Error('boom')
      },
    ])
    expect(await loadCardPhoto(p, media(), null)).toBeNull()
    expect(p.logger.error).toHaveBeenCalledTimes(1)
  })

  it('times out a handler that never resolves', async () => {
    const p = fakePayload([() => new Promise(() => {})])
    const start = Date.now()
    expect(await loadCardPhoto(p, media(), null, { timeoutMs: 20 })).toBeNull()
    expect(Date.now() - start).toBeLessThan(1000)
    expect(p.logger.error).toHaveBeenCalledTimes(1)
  })

  it('does not read outside the static directory', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'card-photo-'))
    const dir = path.join(root, 'media')
    mkdirSync(dir)
    writeFileSync(
      path.join(root, 'secret.png'),
      await solid(100, 100, { r: 1, g: 2, b: 3 }).png().toBuffer(),
    )
    const p = fakePayload(undefined, dir)
    expect(await loadCardPhoto(p, media({ filename: '../secret.png' }), null)).toBeNull()
    expect(p.logger.error).toHaveBeenCalledTimes(1)
  })

  it('skips SVG and oversized sources without reading', async () => {
    const handler = vi.fn()
    const p = fakePayload([handler])
    expect(await loadCardPhoto(p, media({ mimeType: 'image/svg+xml' }), null)).toBeNull()
    expect(await loadCardPhoto(p, media({ filesize: 26 * 1024 * 1024 }), null)).toBeNull()
    expect(handler).not.toHaveBeenCalled()
  })
})
