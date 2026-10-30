// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { FLOWLYST_MARK_PATH } from '@/utilities/flowlystMarkShared'
import { alignmentPositions, BAR_WIDTH, buildRainfallQr } from '@/utilities/qr/rainfallQr'

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

  it.each(CODE_URLS)('decodes back to exactly %s', async (url) => {
    const buf = Buffer.from(buildRainfallQr(url).svg)
    expect(await decodeQr(buf)).toBe(url)
    expect(await decodeQr(buf, 512)).toBe(url)
  })

  it('decodes across every length from 8 to 120 in steps of 7, covering several versions', async () => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789-'
    const versions = new Set<number>()
    for (let len = 8; len <= 120; len += 7) {
      const url = `https://flowlyst.io/card/${Array.from({ length: len }, (_, i) => alphabet[(i * 7 + len) % alphabet.length]).join('')}`
      const { svg, version } = buildRainfallQr(url)
      versions.add(version)
      expect(await decodeQr(Buffer.from(svg)), `length ${len}, version ${version}`).toBe(url)
    }
    console.log(`sweep versions covered: ${[...versions].sort((a, b) => a - b).join(', ')}`)
    expect(versions.size).toBeGreaterThanOrEqual(4)
  })

  it('carries the logo and a centre circle sized from the width', () => {
    const { svg, modules } = buildRainfallQr(CODE_URLS[1])
    const W = modules + 4
    expect(svg).toContain(FLOWLYST_MARK_PATH)
    const circle = /<circle id="centre"[^>]*\/>/.exec(svg)![0]
    expect(Math.abs(attr(circle, 'r') - W * 0.11)).toBeLessThan(1e-6)
    const scale = Number(/<g id="logo" transform="[^"]*scale\(([^)]+)\)"/.exec(svg)![1])
    expect(Math.abs(scale - (W * 0.22 * 0.92) / 227.46)).toBeLessThan(1e-6)
  })

  it('keeps every bar out of the centre circle', () => {
    for (const url of CODE_URLS) {
      const { svg, modules } = buildRainfallQr(url)
      const W = modules + 4
      const R = W * 0.11
      for (const bar of groupRects(svg, 'bars')) {
        const x = attr(bar, 'x')
        const y = attr(bar, 'y')
        const dx = Math.max(x - W / 2, 0, W / 2 - (x + attr(bar, 'width')))
        const dy = Math.max(y - W / 2, 0, W / 2 - (y + attr(bar, 'height')))
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(R)
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

  it('draws 9 finder rects plus 3 per alignment pattern', () => {
    const seen = new Set<number>()
    for (const url of [...CODE_URLS, `https://flowlyst.io/card/${'x'.repeat(110)}`]) {
      const { svg, version } = buildRainfallQr(url)
      const p = alignmentPositions(version).length
      const alignments = p > 0 ? p * p - 3 : 0
      expect(groupRects(svg, 'eyes')).toHaveLength(9 + 3 * alignments)
      seen.add(version)
    }
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })

  it('uses only the three brand fill colours', () => {
    for (const url of CODE_URLS) {
      const fills = new Set(
        [...buildRainfallQr(url).svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]),
      )
      expect([...fills].sort()).toEqual(['#00a568', '#1a1a1a', '#ffffff'])
    }
  })
})
