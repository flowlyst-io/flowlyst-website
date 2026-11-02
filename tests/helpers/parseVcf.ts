const encoder = new TextEncoder()
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

export type ParsedVcf = { lines: string[]; photo: Buffer | null }

/** Strict vCard 3.0 reader for tests: throws on anything a picky importer could reject. */
export function parseVcf(text: string): ParsedVcf {
  if (/\r(?!\n)/.test(text) || /(?<!\r)\n/.test(text)) throw new Error('bare CR or LF')
  const physical = text.endsWith('\r\n') ? text.slice(0, -2).split('\r\n') : text.split('\r\n')
  const lines: string[] = []
  for (const line of physical) {
    if (encoder.encode(line).length > 75)
      throw new Error(`physical line over 75 octets: ${line.slice(0, 30)}`)
    if (line.startsWith(' ')) {
      if (lines.length === 0) throw new Error('continuation with nothing to continue')
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  if (lines[0] !== 'BEGIN:VCARD') throw new Error('missing BEGIN:VCARD')
  if (lines[1] !== 'VERSION:3.0') throw new Error('missing VERSION:3.0')
  if (lines[lines.length - 1] !== 'END:VCARD') throw new Error('missing END:VCARD')

  let photo: Buffer | null = null
  const prefix = 'PHOTO;ENCODING=b;TYPE=JPEG:'
  for (const line of lines) {
    if (!line.startsWith('PHOTO')) continue
    if (!line.startsWith(prefix)) throw new Error('unexpected PHOTO parameters')
    const b64 = line.slice(prefix.length)
    if (!BASE64.test(b64) || b64.length % 4 !== 0) throw new Error('invalid base64')
    photo = Buffer.from(b64, 'base64')
  }
  return { lines, photo }
}
