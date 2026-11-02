import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createLocalReq, type Payload } from 'payload'
import sharp from 'sharp'

import type { Media } from '@/payload-types'
import { clampCrop, cropRect, type HeadshotCrop } from '@/utilities/headshotCropShared'

export const PHOTO_MAX_BYTES = 120_000
const PHOTO_MAX_SIDE = 512
const SOURCE_MAX_BYTES = 25 * 1024 * 1024
// sharp cannot read CSS variables: this is --fl-green-50, what a transparent photo shows in the diamond.
export const DIAMOND_BACKGROUND = '#e6f6ef'

export async function cropToJpeg(
  bytes: Uint8Array,
  crop: Pick<HeadshotCrop, 'zoom' | 'x' | 'y'> | null,
): Promise<Buffer> {
  const source = sharp(bytes, { limitInputPixels: 100_000_000 }).autoOrient()
  const meta = await source.metadata()
  // Dimensions after EXIF rotation, which is the frame the crop fractions refer to.
  const width = meta.autoOrient?.width ?? meta.width
  const height = meta.autoOrient?.height ?? meta.height
  if (!width || !height) throw new Error('image has no dimensions')

  const clamped = crop ? clampCrop({ ...crop, aspect: null }, width / height) : null
  const { left, top, size } = cropRect(clamped, width, height)
  const encode = (side: number, quality: number) =>
    source
      .clone()
      .extract({ left, top, width: size, height: size })
      .resize(side, side, { withoutEnlargement: true })
      .flatten({ background: DIAMOND_BACKGROUND })
      .jpeg({ quality, progressive: false })
      .timeout({ seconds: 6 })
      .toBuffer()

  // A busy photo can exceed the ceiling, and a card without its photo is the failure this guards against.
  let out = await encode(PHOTO_MAX_SIDE, 80)
  if (out.length > PHOTO_MAX_BYTES) out = await encode(PHOTO_MAX_SIDE, 60)
  if (out.length > PHOTO_MAX_BYTES) out = await encode(256, 60)
  if (out.length > PHOTO_MAX_BYTES) throw new Error(`photo is ${out.length} bytes, over the limit`)
  return out
}

type UploadConfig = {
  staticDir?: string
  handlers?: ((
    req: unknown,
    args: {
      doc: unknown
      headers: Headers
      params: { collection: string; filename: string; prefix?: string }
    },
  ) => Promise<Response | void> | Response | void)[]
}

export async function readMediaBytes(payload: Payload, media: Media): Promise<Buffer> {
  const filename = media.filename
  if (!filename) throw new Error('media has no filename')
  const upload = payload.collections['media'].config.upload as UploadConfig

  if (upload.handlers?.length) {
    const req = await createLocalReq({}, payload)
    const headers = new Headers()
    for (const handler of upload.handlers) {
      const res = await handler(req, {
        doc: media,
        headers,
        params: { collection: 'media', filename, prefix: media.prefix ?? undefined },
      })
      if (res instanceof Response) {
        if (res.status !== 200) throw new Error(`storage handler returned ${res.status}`)
        return Buffer.from(await res.arrayBuffer())
      }
    }
    throw new Error('no storage handler returned a response')
  }

  const dir = path.resolve(upload.staticDir || 'media')
  return readFile(path.resolve(dir, path.basename(filename)))
}

/** Never throws: any failure gives a contact without a photo, logged. */
export async function loadCardPhoto(
  payload: Payload,
  media: Media,
  crop: HeadshotCrop | null,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<Buffer | null> {
  if (!media.filename || media.mimeType === 'image/svg+xml') return null
  if ((media.filesize ?? 0) > SOURCE_MAX_BYTES) return null

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('card photo timed out')), timeoutMs)
    })
    return await Promise.race([
      readMediaBytes(payload, media).then((bytes) => cropToJpeg(bytes, crop)),
      timeout,
    ])
  } catch (err) {
    payload.logger.error({ err, msg: 'card photo failed', mediaId: media.id })
    return null
  } finally {
    clearTimeout(timer)
  }
}
