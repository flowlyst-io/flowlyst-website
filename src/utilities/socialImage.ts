/**
 * Pages that declare their own `openGraph`/`twitter` replace the root metadata
 * wholesale, so they must name the default image themselves. Next serves the
 * `opengraph-image.tsx` route at `/opengraph-image-<hash>`, where the hash comes from
 * the route-group path (the same suffix as icon.svg); tests/e2e/seo.e2e.spec.ts fetches
 * it so a drift fails CI.
 */
export const SOCIAL_IMAGE = {
  url: '/opengraph-image-4usi79',
  width: 1200,
  height: 630,
  alt: 'flowlyst — Many tools. One platform. Built by operators.',
}
