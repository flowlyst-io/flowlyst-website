export const CROP_FRAME_PX = 176
export const CROP_ZOOM_MIN = 1
export const CROP_ZOOM_MAX = 4

/**
 * `zoom` 1 is exactly `object-fit: cover` of the short side. `x` and `y` are the
 * centre of the visible upright square as fractions of the oriented image.
 * `aspect` is oriented width / height; it exists because `media.width/height`
 * are recorded before EXIF rotation and can be swapped.
 */
export type HeadshotCrop = { zoom: number; x: number; y: number; aspect: number | null }

export type CropPlacement = { left: number; top: number; width: number; height: number }

const round = (n: number, places: number) => {
  const f = 10 ** places
  return Math.round(n * f) / f
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function normalizeCrop(raw: unknown): HeadshotCrop | null {
  if (!raw || typeof raw !== 'object') return null
  const { zoom, x, y, aspect } = raw as Record<string, unknown>
  if (!isNum(zoom) || !isNum(x) || !isNum(y)) return null
  return {
    zoom: round(clamp(zoom, CROP_ZOOM_MIN, CROP_ZOOM_MAX), 4),
    x: round(clamp(x, 0, 1), 4),
    y: round(clamp(y, 0, 1), 4),
    aspect: isNum(aspect) && aspect >= 0.05 && aspect <= 20 ? round(aspect, 4) : null,
  }
}

/** Trust the stored aspect only when it matches the recorded size, or its EXIF swap, within 2%. */
export function resolveAspect(
  stored: number | null | undefined,
  width: number,
  height: number,
): number {
  const natural = width / height
  if (isNum(stored) && stored > 0) {
    const close = (a: number, b: number) => Math.abs(a - b) <= b * 0.02
    if (close(stored, natural) || close(stored, 1 / natural)) return stored
  }
  return natural
}

function halfExtents(zoom: number, aspect: number) {
  return {
    hx: 1 / (2 * zoom * Math.max(aspect, 1)),
    hy: 1 / (2 * zoom * Math.max(1 / aspect, 1)),
  }
}

export function clampCrop(crop: HeadshotCrop, aspect: number): HeadshotCrop {
  const { hx, hy } = halfExtents(crop.zoom, aspect)
  return {
    ...crop,
    x: clamp(crop.x, hx, 1 - hx),
    y: clamp(crop.y, hy, 1 - hy),
  }
}

/** Dragging the image by `dx` frame px moves the centre the opposite way. */
export function panCrop(
  crop: HeadshotCrop,
  dxPx: number,
  dyPx: number,
  aspect: number,
): HeadshotCrop {
  const width = crop.zoom * Math.max(aspect, 1) * CROP_FRAME_PX
  const height = crop.zoom * Math.max(1 / aspect, 1) * CROP_FRAME_PX
  return clampCrop({ ...crop, x: crop.x - dxPx / width, y: crop.y - dyPx / height }, aspect)
}

export function cropPlacement(crop: HeadshotCrop, aspect: number): CropPlacement {
  const c = clampCrop(crop, aspect)
  const width = c.zoom * Math.max(aspect, 1) * CROP_FRAME_PX
  const height = c.zoom * Math.max(1 / aspect, 1) * CROP_FRAME_PX
  const half = CROP_FRAME_PX / 2
  return {
    left: round(half - c.x * width, 2),
    top: round(half - c.y * height, 2),
    width: round(width, 2),
    height: round(height, 2),
  }
}

export function headshotPlacement(
  raw: unknown,
  mediaWidth: number | null | undefined,
  mediaHeight: number | null | undefined,
): CropPlacement | null {
  const crop = normalizeCrop(raw)
  if (!crop || !isNum(mediaWidth) || !isNum(mediaHeight) || mediaWidth <= 0 || mediaHeight <= 0) {
    return null
  }
  return cropPlacement(crop, resolveAspect(crop.aspect, mediaWidth, mediaHeight))
}

/** Source-pixel square for a crop; null means centred at zoom 1. */
export function cropRect(
  crop: Pick<HeadshotCrop, 'zoom' | 'x' | 'y'> | null,
  width: number,
  height: number,
): { left: number; top: number; size: number } {
  const zoom = crop?.zoom ?? 1
  const size = Math.max(1, Math.round(Math.min(width, height) / zoom))
  const cx = (crop?.x ?? 0.5) * width
  const cy = (crop?.y ?? 0.5) * height
  return {
    left: clamp(Math.round(cx - size / 2), 0, Math.max(0, width - size)),
    top: clamp(Math.round(cy - size / 2), 0, Math.max(0, height - size)),
    size,
  }
}
