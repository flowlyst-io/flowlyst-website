import { create } from 'qrcode'

import { FLOWLYST_MARK_PATH } from '@/utilities/flowlystMarkShared'

const MODULE_COLOR = '#1a1a1a'
const BACKGROUND_COLOR = '#ffffff'
const LOGO_COLOR = '#00a568'

const BORDER = 2
const MARK_WIDTH = 227.46
const MARK_HEIGHT = 157.46
const CENTRE_RATIO = 0.22
const LOGO_FILL = 0.92
const SVG_PIXELS = 1024

/** The skill's own ladder is 0.72, 0.80, 0.88; step up only if jsqr cannot read a code. */
export const BAR_WIDTH = 0.72

/** Port of qrcode's `pattern_position` (the QR spec's alignment pattern centres). */
export function alignmentPositions(version: number): number[] {
  if (version <= 1) return []
  const count = Math.floor(version / 7) + 2
  const size = 4 * version + 17
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2
  const positions = [size - 7]
  for (let i = 0; i < count - 2; i++) positions.push(positions[positions.length - 1] - step)
  positions.push(6)
  return positions.reverse()
}

const num = (value: number) => String(Number(value.toFixed(8)))

const rect = (x: number, y: number, size: number, rx: number, fill: string) =>
  `<rect x="${num(x)}" y="${num(y)}" width="${num(size)}" height="${num(size)}" rx="${num(rx)}" fill="${fill}"/>`

export function buildRainfallQr(text: string): {
  svg: string
  version: number
  modules: number
  ecLevel: 'H'
} {
  const symbol = create(text, { errorCorrectionLevel: 'H' })
  const n = symbol.modules.size
  const dark = (r: number, c: number) => symbol.modules.get(r, c) === 1
  const skip = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const markSkipped = (r: number, c: number, size: number) => {
    for (let i = r; i < r + size; i++) for (let j = c; j < c + size; j++) skip[i][j] = true
  }
  const touchesSkipped = (r: number, c: number, size: number) => {
    for (let i = r; i < r + size; i++)
      for (let j = c; j < c + size; j++) if (i < n && j < n && skip[i][j]) return true
    return false
  }

  const eyes: string[] = []
  const eye = (
    x: number,
    y: number,
    size: number,
    rOuter: number,
    rInner: number,
    rDot: number,
  ) => {
    const ring = size - 2
    const dot = size - 4
    eyes.push(rect(x + BORDER, y + BORDER, size, rOuter, MODULE_COLOR))
    eyes.push(rect(x + BORDER + 1, y + BORDER + 1, ring, rInner, BACKGROUND_COLOR))
    eyes.push(rect(x + BORDER + 2, y + BORDER + 2, dot, rDot, MODULE_COLOR))
  }

  for (const [r, c] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    markSkipped(r, c, 7)
    eye(c, r, 7, 2.2, 1.5, 1.0)
  }

  const positions = alignmentPositions(symbol.version)
  for (const r of positions) {
    for (const c of positions) {
      if (touchesSkipped(r - 2, c - 2, 5)) continue
      markSkipped(r - 2, c - 2, 5)
      eye(c - 2, r - 2, 5, 1.5, 1.0, 0.35)
    }
  }

  const W = n + 2 * BORDER
  const cx = W / 2
  const D = W * CENTRE_RATIO
  const R = D / 2
  const reach = (R + 0.6) ** 2
  const usable = (r: number, c: number) => {
    if (!dark(r, c) || skip[r][c]) return false
    return (c + BORDER + 0.5 - cx) ** 2 + (r + BORDER + 0.5 - cx) ** 2 > reach
  }

  const bw = BAR_WIDTH
  const pad = (1 - bw) / 2
  const bars: string[] = []
  for (let c = 0; c < n; c++) {
    let r = 0
    while (r < n) {
      if (!usable(r, c)) {
        r++
        continue
      }
      const start = r
      while (r < n && usable(r, c)) r++
      bars.push(
        `<rect x="${num(c + BORDER + pad)}" y="${num(start + BORDER + pad / 2)}" width="${num(bw)}" height="${num(r - start - pad)}" rx="${num(bw * 0.3)}" fill="${MODULE_COLOR}"/>`,
      )
    }
  }

  const scale = (D * LOGO_FILL) / MARK_WIDTH
  const tx = cx - (MARK_WIDTH * scale) / 2
  const ty = cx - (MARK_HEIGHT * scale) / 2

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${SVG_PIXELS}" height="${SVG_PIXELS}">` +
    `<rect width="${W}" height="${W}" fill="${BACKGROUND_COLOR}"/>` +
    `<g id="eyes">${eyes.join('')}</g>` +
    `<g id="bars">${bars.join('')}</g>` +
    `<circle id="centre" cx="${num(cx)}" cy="${num(cx)}" r="${num(R)}" fill="${BACKGROUND_COLOR}"/>` +
    `<g id="logo" transform="translate(${num(tx)} ${num(ty)}) scale(${num(scale)})"><path d="${FLOWLYST_MARK_PATH}" fill="${LOGO_COLOR}"/></g>` +
    `</svg>`

  return { svg, version: symbol.version, modules: n, ecLevel: 'H' }
}
