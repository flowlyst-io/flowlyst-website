import { describe, it, expect } from 'vitest'
import { buildVCard } from '../../src/utilities/vcard'

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
})
