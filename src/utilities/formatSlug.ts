/**
 * Normalise an arbitrary string into a URL-safe slug:
 * lowercase, spaces → hyphens, non-word characters stripped, hyphens collapsed.
 */
export const formatSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // drop punctuation
    .replace(/[\s_]+/g, '-') // whitespace/underscores → hyphen
    .replace(/-+/g, '-') // collapse repeats
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
