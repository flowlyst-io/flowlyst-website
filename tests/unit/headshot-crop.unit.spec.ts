import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  clampCrop,
  cropPlacement,
  cropRect,
  headshotPlacement,
  normalizeCrop,
  panCrop,
  resolveAspect,
} from '@/utilities/headshotCropShared'

describe('normalizeCrop', () => {
  it('keeps valid values', () => {
    expect(normalizeCrop({ zoom: 2, x: 0.25, y: 0.75, aspect: 1.5 })).toEqual({
      zoom: 2,
      x: 0.25,
      y: 0.75,
      aspect: 1.5,
    })
  })

  it('clamps and rounds', () => {
    expect(normalizeCrop({ zoom: 99, x: 0.5, y: 0.5 })?.zoom).toBe(4)
    expect(normalizeCrop({ zoom: 0.1, x: 0.5, y: 0.5 })?.zoom).toBe(1)
    expect(normalizeCrop({ zoom: 2, x: -1, y: 0.5 })?.x).toBe(0)
    expect(normalizeCrop({ zoom: 2, x: 0.5, y: 5 })?.y).toBe(1)
    expect(normalizeCrop({ zoom: 2, x: 0.123456, y: 0.5 })?.x).toBe(0.1235)
  })

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['abc', 'abc'],
    ["'2'", '2'],
    ['null', null],
    ['undefined', undefined],
    ['partial', { zoom: 2 }],
    ['all null', { zoom: null, x: null, y: null }],
    ['string zoom', { zoom: '2', x: 0.5, y: 0.5 }],
  ])('returns null for %s', (_name, value) => {
    expect(normalizeCrop(value)).toBeNull()
  })

  it('nulls an out-of-range aspect without nulling the crop', () => {
    expect(normalizeCrop({ zoom: 2, x: 0.5, y: 0.5, aspect: 1000 })).toEqual({
      zoom: 2,
      x: 0.5,
      y: 0.5,
      aspect: null,
    })
  })
})

describe('clampCrop', () => {
  const base = { zoom: 1, x: 0.5, y: 0.5, aspect: null }
  it('square at zoom 1 is always centred', () => {
    for (const [x, y] of [
      [0, 0],
      [1, 1],
      [0.2, 0.9],
    ]) {
      const c = clampCrop({ ...base, x, y }, 1)
      expect([c.x, c.y]).toEqual([0.5, 0.5])
    }
  })
  it('wide image at zoom 1', () => {
    expect(clampCrop({ ...base, x: 0 }, 2).x).toBe(0.25)
    expect(clampCrop({ ...base, y: 0 }, 2).y).toBe(0.5)
  })
  it('wide image at zoom 2', () => {
    const lo = clampCrop({ ...base, zoom: 2, x: -5, y: -5 }, 2)
    const hi = clampCrop({ ...base, zoom: 2, x: 5, y: 5 }, 2)
    expect([lo.x, hi.x]).toEqual([0.125, 0.875])
    expect([lo.y, hi.y]).toEqual([0.25, 0.75])
  })
})

describe('cropRect', () => {
  it('matches the planned rectangles', () => {
    expect(cropRect(null, 1200, 800)).toEqual({ left: 200, top: 0, size: 800 })
    expect(cropRect({ zoom: 2, x: 0.5, y: 0.5 }, 1200, 800)).toEqual({
      left: 400,
      top: 200,
      size: 400,
    })
    expect(cropRect({ zoom: 4, x: 0, y: 0 }, 1000, 1000)).toEqual({ left: 0, top: 0, size: 250 })
    expect(cropRect({ zoom: 4, x: 1, y: 1 }, 1000, 1000)).toEqual({
      left: 750,
      top: 750,
      size: 250,
    })
  })
})

describe('cropPlacement', () => {
  it('zoom 1 square fills the frame', () => {
    expect(cropPlacement({ zoom: 1, x: 0.5, y: 0.5, aspect: null }, 1)).toEqual({
      left: 0,
      top: 0,
      width: 176,
      height: 176,
    })
  })
  it('zoom 2 on 1.5 aspect', () => {
    expect(cropPlacement({ zoom: 2, x: 0.5, y: 0.5, aspect: null }, 1.5)).toEqual({
      left: -176,
      top: -88,
      width: 528,
      height: 352,
    })
  })
  it('never leaves an empty corner', () => {
    const tol = 0.01
    for (const aspect of [0.5, 1, 2]) {
      for (let zoom = 1; zoom <= 4; zoom += 0.25) {
        for (let x = 0; x <= 1; x += 0.125) {
          for (let y = 0; y <= 1; y += 0.125) {
            const p = cropPlacement({ zoom, x, y, aspect: null }, aspect)
            expect(p.left).toBeLessThanOrEqual(tol)
            expect(p.top).toBeLessThanOrEqual(tol)
            expect(p.left + p.width).toBeGreaterThanOrEqual(176 - tol)
            expect(p.top + p.height).toBeGreaterThanOrEqual(176 - tol)
          }
        }
      }
    }
  })
})

describe('panCrop', () => {
  const crop = { zoom: 2, x: 0.5, y: 0.5, aspect: null }
  it('moves the centre opposite to the drag and clamps', () => {
    expect(panCrop(crop, 88, 0, 1).x).toBe(0.25)
    expect(panCrop(crop, 176, 0, 1).x).toBe(0.25)
  })
})

describe('resolveAspect', () => {
  it('trusts the stored aspect only when it matches the file', () => {
    expect(resolveAspect(0.75, 1200, 900)).toBe(0.75)
    expect(resolveAspect(1.3333, 1200, 900)).toBe(1.3333)
    expect(resolveAspect(2, 1200, 900)).toBeCloseTo(1.3333, 4)
    expect(resolveAspect(null, 1200, 900)).toBeCloseTo(1.3333, 4)
  })
})

describe('headshotPlacement', () => {
  it('is null without a crop or without dimensions', () => {
    expect(headshotPlacement(null, 100, 100)).toBeNull()
    expect(headshotPlacement({ zoom: 2, x: 0.5, y: 0.5, aspect: 1 }, null, null)).toBeNull()
  })
  it('returns a placement for a valid crop', () => {
    expect(headshotPlacement({ zoom: 1, x: 0.5, y: 0.5, aspect: 1 }, 100, 100)).toEqual({
      left: 0,
      top: 0,
      width: 176,
      height: 176,
    })
  })
})

describe('module hygiene', () => {
  it('has no import', () => {
    const src = readFileSync(
      path.resolve(process.cwd(), 'src/utilities/headshotCropShared.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/^\s*import\s/m)
  })
})
