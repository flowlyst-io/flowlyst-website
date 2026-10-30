/**
 * Reusable field validators. Payload's built-in `email` field type covers email
 * validation; this covers URLs (used by author links, testimonial video, and
 * social links) with a real URL parse rather than a brittle regex.
 */
export const validateURL = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true // optional; pair with `required` where needed
  if (typeof value !== 'string') return 'Enter a valid URL.'
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? true
      : 'Enter a URL starting with http:// or https://'
  } catch {
    return 'Enter a URL starting with http:// or https://'
  }
}

/** Like {@link validateURL} but https only: link destinations and card URLs must never be plain http. */
export const validateHttpsURL = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return 'Enter a URL starting with https://'
  try {
    return new URL(value).protocol === 'https:' ? true : 'Enter a URL starting with https://'
  } catch {
    return 'Enter a URL starting with https://'
  }
}

/**
 * The one rule for a link destination, used when saving and again before redirecting:
 * exact lowercase `https://`, a real host, no credentials, no surrounding whitespace.
 */
export const isRedirectableHttpsUrl = (value: string): boolean => {
  if (value !== value.trim() || !value.startsWith('https://')) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname !== '' && !url.username && !url.password
  } catch {
    return false
  }
}
