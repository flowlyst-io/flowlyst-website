// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { CROP_FRAME_PX } from '@/utilities/headshotCropShared'
import { DIAMOND_BACKGROUND } from '@/utilities/cardPhoto'

const ROOT = path.resolve(__dirname, '../..')
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i

const cardFiles = [
  'src/app/(card)/card.css',
  'src/components/card/ContactCard.tsx',
  ...readdirSync(path.join(ROOT, 'src/components/card')).map((f) => `src/components/card/${f}`),
]

describe('contact card colours come from tokens', () => {
  it.each([...new Set(cardFiles)])('%s has no hex, rgb or hsl literal', (file) => {
    const source = readFileSync(path.join(ROOT, file), 'utf8')
    expect(source.match(COLOUR_LITERAL)).toBeNull()
  })
})

describe('vCard photo background', () => {
  it('matches the --fl-green-50 token the diamond shows behind a transparent photo', () => {
    const styles = readFileSync(path.join(ROOT, 'src/app/(frontend)/styles.css'), 'utf8')
    const token = styles.match(/--fl-green-50:\s*(#[0-9a-f]{3,8})\s*;/i)?.[1]
    expect(token).toBeDefined()
    expect(DIAMOND_BACKGROUND.toLowerCase()).toBe(token!.toLowerCase())
  })
})

describe('headshot crop frame', () => {
  it('.card__headshot-crop is as wide as the geometry helper assumes', () => {
    const css = readFileSync(path.join(ROOT, 'src/components/card/headshotDiamond.css'), 'utf8')
    const rule = css.match(/\.card__headshot-crop\s*\{([^}]*)\}/)![1]
    expect(rule).toMatch(new RegExp(`width:\\s*${CROP_FRAME_PX}px`))
    expect(rule).toMatch(new RegExp(`height:\\s*${CROP_FRAME_PX}px`))
  })
})

describe('admin crop control', () => {
  it('HeadshotCropField.tsx has no colour literal', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/components/admin/HeadshotCropField.tsx'),
      'utf8',
    )
    expect(source.match(COLOUR_LITERAL)).toBeNull()
  })

  it('the scoped tokens equal the ones in styles.css :root', () => {
    const squash = (s: string) => s.replace(/\s+/g, ' ').trim()
    const css = readFileSync(path.join(ROOT, 'src/components/admin/HeadshotCropField.css'), 'utf8')
    const styles = readFileSync(path.join(ROOT, 'src/app/(frontend)/styles.css'), 'utf8')
    const block = css.match(/\.headshot-crop\s*\{([^}]*)\}/)![1]
    const declared = [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
    expect(declared.length).toBe(6)
    for (const [, name, value] of declared) {
      const root = styles.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
      expect(root, name).toBeDefined()
      expect(squash(value), name).toBe(squash(root!))
    }
  })
})
