/** No 0/o/1/l/i, so a code read off a printed card is never ambiguous. */
export const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export const randomCode = (len = 6): string => {
  const bytes = new Uint8Array(len)
  // Rejection sampling keeps every character equally likely (256 is not a multiple of 31).
  const limit = 256 - (256 % CODE_ALPHABET.length)
  let out = ''
  while (out.length < len) {
    crypto.getRandomValues(bytes)
    for (const b of bytes) {
      if (b < limit && out.length < len) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
    }
  }
  return out
}
