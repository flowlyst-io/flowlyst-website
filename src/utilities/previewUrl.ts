/**
 * Build the admin "Preview" URL for a draftable document.
 *
 * Points at the `/preview` route handler, which validates the secret, enables
 * Next.js Draft Mode, and redirects to the (placeholder, until Phase 2)
 * server-rendered draft page. Runs server-side inside `admin.preview`, so
 * `process.env` is available.
 *
 * Security: the preview secret is `PREVIEW_SECRET` **only** — never a fallback
 * to `PAYLOAD_SECRET`. Falling back would put the master JWT signing secret into
 * the preview query string (and thus Vercel access logs and browser history).
 * The functions fail closed: no `PREVIEW_SECRET` ⇒ no preview URL is minted and
 * the route denies every request.
 */
export type PreviewCollection = 'blog-posts' | 'case-studies'

export const buildPreviewUrl = (
  collection: PreviewCollection,
  slug?: string | null,
): string | null => {
  const secret = process.env.PREVIEW_SECRET
  if (!secret) return null // fail closed — no secret configured, no preview link
  const params = new URLSearchParams({ collection, slug: slug ?? '', secret })
  return `/preview?${params.toString()}`
}

/** True only when a `PREVIEW_SECRET` is configured and the request carries it. */
export const isValidPreviewSecret = (secret: string | null): boolean => {
  const expected = process.env.PREVIEW_SECRET
  return Boolean(expected) && secret === expected
}
