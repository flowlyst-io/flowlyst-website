export type VCardInput = {
  name: string
  title?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  linkedIn?: string | null
}

const escapeValue = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')

export function buildVCard(card: VCardInput): string {
  const name = card.name.trim()
  const words = name.split(/\s+/).filter(Boolean)
  const family = words.length > 1 ? words[words.length - 1] : ''
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : name

  const lines: (string | null)[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeValue(name)}`,
    `N:${escapeValue(family)};${escapeValue(given)};;;`,
    'ORG:flowlyst',
  ]
  const optional: [string, string | null | undefined][] = [
    ['TITLE', card.title],
    ['TEL;TYPE=CELL', card.phone],
    ['EMAIL;TYPE=INTERNET', card.email],
    ['URL', card.website],
    ['X-SOCIALPROFILE;TYPE=linkedin', card.linkedIn],
  ]
  for (const [key, value] of optional) {
    const trimmed = value?.trim()
    lines.push(trimmed ? `${key}:${escapeValue(trimmed)}` : null)
  }
  lines.push('END:VCARD')
  return lines.filter((l): l is string => l !== null).join('\r\n') + '\r\n'
}
