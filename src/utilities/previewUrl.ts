/**
 * Build the admin "Preview" URL for a draftable document.
 *
 * Points at the `/preview` route handler, which validates the secret, enables
 * Next.js Draft Mode, and redirects to the (placeholder, until Phase 2)
 * server-rendered draft page. Runs server-side inside `admin.preview`, so
 * `process.env` is available.
 */
export type PreviewCollection = 'blog-posts' | 'case-studies'

export const buildPreviewUrl = (collection: PreviewCollection, slug?: string | null): string => {
  const secret = process.env.PREVIEW_SECRET ?? process.env.PAYLOAD_SECRET ?? ''
  const params = new URLSearchParams({ collection, slug: slug ?? '', secret })
  return `/preview?${params.toString()}`
}

/** True when the request carries the shared preview secret. */
export const isValidPreviewSecret = (secret: string | null): boolean => {
  const expected = process.env.PREVIEW_SECRET ?? process.env.PAYLOAD_SECRET ?? ''
  return expected.length > 0 && secret === expected
}
