import jsQR from 'jsqr'
import sharp from 'sharp'

export async function decodeQr(image: Buffer, size = 1024): Promise<string | null> {
  const { data, info } = await sharp(image, { density: 300 })
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
}
