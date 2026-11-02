export type VCardInput = {
  name: string
  title?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  linkedIn?: string | null
}

const escapeValue = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

/** RFC 2426 §2.6: physical lines are at most 75 octets; a continuation starts with one space. */
export function foldVCardLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let used = 0
  let limit = 75
  for (const char of line) {
    const size = encoder.encode(char).length
    if (used + size > limit) {
      parts.push(current)
      current = ''
      used = 0
      limit = 74
    }
    current += char
    used += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildVCard(card: VCardInput, photoJpeg?: Uint8Array | null): string {
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
  if (photoJpeg && photoJpeg.length > 0) {
    lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${Buffer.from(photoJpeg).toString('base64')}`)
  }
  lines.push('END:VCARD')
  return (
    lines
      .filter((l): l is string => l !== null)
      .map(foldVCardLine)
      .join('\r\n') + '\r\n'
  )
}
