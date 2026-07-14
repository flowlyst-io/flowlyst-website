/**
 * The canonical public origin for the marketing site.
 *
 * Derived identically to `serverURL` in `src/payload.config.ts`: an explicit
 * `NEXT_PUBLIC_SERVER_URL` wins; otherwise Vercel's `VERCEL_PROJECT_PRODUCTION_URL`
 * (the production domain, no protocol) is prefixed with `https://`; otherwise we
 * fall back to localhost for local dev. Next's `metadataBase` and the Organization
 * JSON-LD both need this absolute origin so canonical/OG URLs never render relative
 * or as `localhost` on deployed pages (issue #6 comment; PRD §10.1).
 *
 * Keep this in lockstep with `payload.config.ts` — the two must agree on the origin.
 */
export function getServerURL(): string {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  )
}
