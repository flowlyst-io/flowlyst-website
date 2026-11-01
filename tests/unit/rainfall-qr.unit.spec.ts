// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { FLOWLYST_MARK_PATH } from '@/utilities/flowlystMarkShared'
import {
  alignmentPositions,
  BAR_WIDTH,
  buildRainfallQr,
  QR_COLORS,
  QR_VARIANTS,
  type QrColor,
} from '@/utilities/qr/rainfallQr'

import { decodeQr } from '../helpers/decodeQr'

const BORDER = 2
const CODE_URLS = [
  'https://flowlyst.io/go/k3x9q2',
  'https://flowlyst.io/go/booth',
  'https://flowlyst.io/card/aziz-aghayev-7hk2mp',
  'http://localhost:3000/go/abcdef',
  `https://flowlyst.io/go/${'a1b2c3d4-'.repeat(20)}`.slice(0, 120),
]

const attr = (tag: string, name: string) => Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1])
const bgFor = (color: QrColor) => (color === 'white' ? '#1a1a1a' : '#ffffff')
const distanceToCentre = (bar: string, W: number) => {
  const x = attr(bar, 'x')
  const y = attr(bar, 'y')
  const dx = Math.max(x - W / 2, 0, W / 2 - (x + attr(bar, 'width')))
  const dy = Math.max(y - W / 2, 0, W / 2 - (y + attr(bar, 'height')))
  return Math.hypot(dx, dy)
}
const groupRects = (svg: string, id: string) => {
  const body = new RegExp(`<g id="${id}">(.*?)</g>`).exec(svg)?.[1] ?? ''
  return body.match(/<rect [^>]*\/>/g) ?? []
}

describe('alignmentPositions', () => {
  it('matches the QR spec table', () => {
    expect(alignmentPositions(1)).toEqual([])
    expect(alignmentPositions(2)).toEqual([6, 18])
    expect(alignmentPositions(7)).toEqual([6, 22, 38])
    expect(alignmentPositions(14)).toEqual([6, 26, 46, 66])
    expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138])
  })
})

describe('buildRainfallQr', () => {
  it('uses error correction H and a viewBox of modules plus the quiet zone', () => {
    const { svg, ecLevel, modules } = buildRainfallQr(CODE_URLS[0])
    expect(ecLevel).toBe('H')
    expect(svg).toContain(`viewBox="0 0 ${modules + 4} ${modules + 4}"`)
  })

  it('decodes every variant of every URL back to exactly the URL, at two sizes', async () => {
    for (const variant of QR_VARIANTS) {
      for (const url of CODE_URLS) {
        const buf = Buffer.from(buildRainfallQr(url, variant).svg)
        const bg = bgFor(variant.color)
        const label = `${variant.color} ${variant.logo ? 'logo' : 'nologo'} ${url}`
        expect(await decodeQr(buf, 1024, bg), label).toBe(url)
        expect(await decodeQr(buf, 512, bg), label).toBe(url)
      }
    }
  })

  it('decodes across every length from 8 to 120 in steps of 7, covering several versions', async () => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789-'
    const versions = new Set<number>()
    for (const color of ['black', 'white'] as const) {
      for (let len = 8; len <= 120; len += 7) {
        const url = `https://flowlyst.io/card/${Array.from({ length: len }, (_, i) => alphabet[(i * 7 + len) % alphabet.length]).join('')}`
        const { svg, version } = buildRainfallQr(url, { color, logo: true })
        versions.add(version)
        expect(
          await decodeQr(Buffer.from(svg), 1024, bgFor(color)),
          `${color} length ${len}, version ${version}`,
        ).toBe(url)
      }
    }
    console.log(`sweep versions covered: ${[...versions].sort((a, b) => a - b).join(', ')}`)
    expect(versions.size).toBeGreaterThanOrEqual(4)
  })

  it('paints each variant in exactly its own colour', () => {
    for (const variant of QR_VARIANTS) {
      for (const url of CODE_URLS) {
        const fills = new Set(
          [...buildRainfallQr(url, variant).svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]),
        )
        expect([...fills]).toEqual([QR_COLORS[variant.color]])
      }
    }
  })

  it('has no background rect and no filled circle', () => {
    for (const variant of QR_VARIANTS) {
      for (const url of CODE_URLS) {
        const { svg, modules } = buildRainfallQr(url, variant)
        expect(svg).not.toContain('<circle')
        const W = modules + 4
        for (const tag of svg.match(/<rect [^>]*\/>/g) ?? []) {
          expect(attr(tag, 'width')).not.toBe(W)
        }
      }
    }
  })

  it('draws each eye as one evenodd path', () => {
    const seen = new Set<number>()
    for (const url of [...CODE_URLS, `https://flowlyst.io/card/${'x'.repeat(110)}`]) {
      const { svg, version } = buildRainfallQr(url)
      const p = alignmentPositions(version).length
      const alignments = p > 0 ? p * p - 3 : 0
      const eyes = /<g id="eyes">(.*?)<\/g>/.exec(svg)![1]
      expect(eyes).not.toContain('<rect')
      expect(eyes.match(/<path fill-rule="evenodd"/g) ?? []).toHaveLength(3 + alignments)
      seen.add(version)
    }
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })

  it('logo variants carry the mark scaled from the width', () => {
    const { svg, modules } = buildRainfallQr(CODE_URLS[1], { logo: true })
    const W = modules + 4
    expect(/<g id="logo"[^>]*><path d="/.test(svg)).toBe(true)
    expect(svg).toContain(FLOWLYST_MARK_PATH)
    const scale = Number(/<g id="logo" transform="[^"]*scale\(([^)]+)\)"/.exec(svg)![1])
    expect(Math.abs(scale - (W * 0.22 * 0.92) / 227.46)).toBeLessThan(1e-6)
  })

  it('no-logo variants draw no mark and let bars run through the centre', () => {
    for (const color of ['black', 'white', 'violet'] as const) {
      for (const url of CODE_URLS) {
        const { svg, modules } = buildRainfallQr(url, { color, logo: false })
        expect(svg).not.toContain('id="logo"')
        expect(svg).not.toContain(FLOWLYST_MARK_PATH)
        const W = modules + 4
        expect(groupRects(svg, 'bars').some((bar) => distanceToCentre(bar, W) < W * 0.11)).toBe(
          true,
        )
      }
    }
  })

  it('renders real holes: transparent quiet zone, eye ring, and logo clear zone', async () => {
    const urls = [CODE_URLS[1], CODE_URLS[4]]
    for (const variant of QR_VARIANTS) {
      for (const url of urls) {
        const { svg, modules } = buildRainfallQr(url, variant)
        const W = modules + 4
        const px = 1024 / W
        const { data } = await sharp(Buffer.from(svg))
          .resize(1024)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        const alphaAt = (x: number, y: number) =>
          data[(Math.floor(y) * 1024 + Math.floor(x)) * 4 + 3]
        const label = `${variant.color} ${variant.logo ? 'logo' : 'nologo'} W=${W}`
        expect(alphaAt(2, 2), `${label} quiet zone`).toBe(0)
        expect(alphaAt(3.5 * px, 5.5 * px), `${label} ring hole`).toBe(0)
        expect(alphaAt(5.5 * px, 5.5 * px), `${label} dot`).toBe(255)
        if (variant.logo) {
          expect(alphaAt((W / 2) * px, (W / 2 - 0.45 * W * 0.22) * px), `${label} clear zone`).toBe(
            0,
          )
        }
      }
    }
  })

  it('keeps every bar out of the clear zone around the logo', () => {
    for (const url of CODE_URLS) {
      const { svg, modules } = buildRainfallQr(url, { logo: true })
      const W = modules + 4
      for (const bar of groupRects(svg, 'bars')) {
        expect(distanceToCentre(bar, W)).toBeGreaterThanOrEqual(W * 0.11)
      }
    }
  })

  it('draws bars of one width, rounded at 0.3 of it, on whole columns', () => {
    const { svg } = buildRainfallQr(CODE_URLS[2])
    const pad = (1 - BAR_WIDTH) / 2
    const bars = groupRects(svg, 'bars')
    expect(bars.length).toBeGreaterThan(0)
    for (const bar of bars) {
      expect(Math.abs(attr(bar, 'width') - BAR_WIDTH)).toBeLessThan(1e-9)
      expect(Math.abs(attr(bar, 'rx') - 0.3 * BAR_WIDTH)).toBeLessThan(1e-9)
      const column = attr(bar, 'x') - BORDER - pad
      expect(Math.abs(column - Math.round(column))).toBeLessThan(1e-9)
    }
  })
})
