import { describe, it, expect } from 'vitest'
import { randomBytes } from 'node:crypto'
import { buildVCard, foldVCardLine } from '../../src/utilities/vcard'
import { parseVcf } from '../helpers/parseVcf'

const card = {
  name: 'Aziz Aghayev',
  title: 'Founder & CEO',
  phone: '+1 (312) 555-0100',
  email: 'a@example.com',
  website: 'https://flowlyst.io',
  linkedIn: 'https://www.linkedin.com/in/example',
}

describe('buildVCard', () => {
  it('is a CRLF vCard 3.0', () => {
    const v = buildVCard(card)
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true)
    expect(v.endsWith('END:VCARD\r\n')).toBe(true)
    expect(/(?<!\r)\n/.test(v)).toBe(false)
  })

  it('carries every field', () => {
    const v = buildVCard(card)
    for (const line of [
      'FN:Aziz Aghayev',
      'N:Aghayev;Aziz;;;',
      'ORG:flowlyst',
      'TITLE:Founder & CEO',
      'TEL;TYPE=CELL:+1 (312) 555-0100',
      'EMAIL;TYPE=INTERNET:a@example.com',
      'URL:https://flowlyst.io',
      'X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/example',
    ]) {
      expect(v).toContain(`${line}\r\n`)
    }
  })

  it('escapes commas and semicolons', () => {
    expect(buildVCard({ ...card, title: 'Founder, CEO; Lead' })).toContain(
      'TITLE:Founder\\, CEO\\; Lead\r\n',
    )
  })

  it('escapes a semicolon in the name for FN and N', () => {
    const v = buildVCard({ name: 'Ann; Lee Smith' })
    expect(v).toContain('FN:Ann\\; Lee Smith\r\n')
    expect(v).toContain('N:Smith;Ann\\; Lee;;;\r\n')
  })

  it('omits empty fields', () => {
    const v = buildVCard({ name: 'Aziz Aghayev', phone: '' })
    expect(v).not.toContain('TEL')
    expect(v).not.toContain('EMAIL')
    expect(v).not.toContain('TITLE')
  })

  it('escapes newlines in values', () => {
    const v = buildVCard({ ...card, title: 'a\nb' })
    expect(v).toContain('TITLE:a\\nb\r\n')
    expect(/(?<!\r)\n/.test(v)).toBe(false)
  })

  it('has no PHOTO without a photo', () => {
    expect(buildVCard(card)).not.toContain('PHOTO')
  })

  it('embeds a photo as folded base64 that decodes byte for byte', () => {
    const bytes = randomBytes(50_000)
    const v = buildVCard(card, bytes)
    const parsed = parseVcf(v)
    expect(parsed.photo?.equals(bytes)).toBe(true)
    expect(v.split('\r\n').some((l) => l.startsWith('PHOTO;ENCODING=b;TYPE=JPEG:'))).toBe(true)
    expect(parsed.lines[parsed.lines.length - 2]).toMatch(/^PHOTO;/)
    expect(v).not.toContain('data:')
  })

  it('folds a long title without splitting a UTF-8 code point', () => {
    const title = 'é'.repeat(100)
    const v = buildVCard({ ...card, title })
    for (const l of v.split('\r\n'))
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(v).not.toContain('\uFFFD')
    expect(parseVcf(v).lines).toContain(`TITLE:${title}`)
  })

  it('folds at 76 octets but not at 75', () => {
    expect(foldVCardLine('a'.repeat(75))).toBe('a'.repeat(75))
    expect(foldVCardLine('a'.repeat(76))).toBe(`${'a'.repeat(75)}\r\n a`)
  })

  it('stays within 170,000 octets with a 120,000-byte photo', () => {
    const v = buildVCard(card, randomBytes(120_000))
    expect(() => parseVcf(v)).not.toThrow()
    expect(Buffer.byteLength(v)).toBeLessThanOrEqual(170_000)
  })
})
