import { getServerURL } from './serverURL'

/**
 * Normalize a Payload media URL for `next/image`.
 *
 * Payload prefixes uploaded-media URLs with the config `serverURL` (see
 * `src/utilities/serverURL.ts`). So filesystem-backed media (any env without
 * `BLOB_READ_WRITE_TOKEN` — local dev, e2e, a token-less deploy) resolves to an
 * ABSOLUTE same-origin URL like `https://flowlyst.io/api/media/file/x.jpg`.
 * `next/image` treats every absolute URL as remote and validates it against
 * `images.remotePatterns` — which only lists Vercel Blob — so a same-origin absolute
 * URL is rejected with `"url" parameter is not allowed` (HTTP 400) and the image
 * never loads.
 *
 * Stripping the same-origin prefix to a relative `/api/media/file/…` path routes the
 * URL through `images.localPatterns` instead, which the optimizer serves in every
 * env (and which sidesteps the optimizer's private-IP SSRF guard that fires for
 * absolute localhost URLs). Vercel Blob URLs live on a foreign host
 * (`*.public.blob.vercel-storage.com`), don't start with `serverURL`, and pass
 * through unchanged to be matched by `remotePatterns`.
 */
export function mediaSrc(url: string): string {
  const serverURL = getServerURL()
  return url.startsWith(`${serverURL}/`) ? url.slice(serverURL.length) : url
}
