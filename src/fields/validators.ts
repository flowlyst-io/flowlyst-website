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
