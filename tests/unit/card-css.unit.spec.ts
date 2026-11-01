// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

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
