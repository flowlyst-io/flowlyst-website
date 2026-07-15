import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import { getServerURL } from '@/utilities/serverURL'

/**
 * XML sitemap (`/sitemap.xml`, PRD §10.1 / §11; review invariant a). Lists every
 * public, indexable URL: the static marketing / utility / trust pages plus one entry
 * per PUBLISHED blog post and case study. Drafts and scheduled-but-unpublished docs
 * are excluded by each collection's `publishedOrStaff` read access (`overrideAccess:
 * false` with no user), the same guard the public pages use.
 *
 * Rendering — `force-dynamic`, computed per request straight from the published-
 * content queries. Invariant (a) requires the sitemap to auto-regenerate whenever
 * content changes; issue #1 settled on-demand `revalidatePath` for the heavy content
 * *pages*, but pointing that at a Next metadata route (`/sitemap.xml`) relies on a
 * mechanism we can't verify, and if it silently no-ops the sitemap goes stale — a
 * hard-invariant break. A sitemap is a lightweight URL list, cheap to render on each
 * crawl, so we render it dynamically instead: always current, no stale window, no
 * cron, no webhook indirection. That satisfies issue #1's actual objections (interval
 * ISR's stale windows; webhook indirection's extra secret + failure mode) — neither
 * applies here — while guaranteeing correctness. The content pages keep their static +
 * on-demand-revalidate strategy; only this index is dynamic.
 */
export const dynamic = 'force-dynamic'

// Public, indexable routes with no per-slug data behind them (PRD §7 / §11). Ordered
// home → company → solutions → conversion → content/trust so the generated XML reads
// cleanly; crawlers don't depend on order.
const STATIC_PATHS = [
  '/',
  '/about',
  '/solutions/budget-software',
  '/solutions/ai-training',
  '/solutions/consulting',
  '/solutions/keynotes',
  '/request-demo',
  '/contact',
  '/blog',
  '/testimonials',
  '/case-studies',
  '/privacy',
  '/terms',
  '/cookies',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getServerURL()

  // The static routes are emitted UNCONDITIONALLY — they carry no DB dependency, so the
  // sitemap always lists them even if the content queries below fail. No `lastModified`:
  // these pages have no single meaningful change timestamp, and stamping a per-request
  // "now" would falsely signal to crawlers that they change on every crawl.
  // `${base}${path}` is absolute for every path, including '/' → `${base}/` (base carries
  // no trailing slash).
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
  }))

  // Published blog posts + case studies. Guarded: a request-time DB error degrades to a
  // static-only sitemap (log and continue) rather than a 500 — the same never-throw
  // posture the content collections' revalidation hooks take. `overrideAccess: false`
  // runs each collection's `publishedOrStaff` read access, so drafts never appear;
  // `select` keeps the query to the two fields we emit. Each dynamic entry carries the
  // doc's own `updatedAt` as `lastModified` — a real change signal, unlike the static
  // pages.
  let dynamicEntries: MetadataRoute.Sitemap = []
  try {
    const payload = await getPayload({ config })
    const [posts, cases] = await Promise.all([
      payload.find({
        collection: 'blog-posts',
        where: { _status: { equals: 'published' } },
        overrideAccess: false,
        depth: 0,
        limit: 1000,
        pagination: false,
        select: { slug: true, updatedAt: true },
      }),
      payload.find({
        collection: 'case-studies',
        where: { _status: { equals: 'published' } },
        overrideAccess: false,
        depth: 0,
        limit: 1000,
        pagination: false,
        select: { slug: true, updatedAt: true },
      }),
    ])

    const postEntries: MetadataRoute.Sitemap = posts.docs
      .filter((doc) => Boolean(doc.slug))
      .map((doc) => ({
        url: `${base}/blog/${doc.slug}`,
        ...(doc.updatedAt ? { lastModified: new Date(doc.updatedAt) } : {}),
      }))

    const caseEntries: MetadataRoute.Sitemap = cases.docs
      .filter((doc) => Boolean(doc.slug))
      .map((doc) => ({
        url: `${base}/case-studies/${doc.slug}`,
        ...(doc.updatedAt ? { lastModified: new Date(doc.updatedAt) } : {}),
      }))

    dynamicEntries = [...postEntries, ...caseEntries]
  } catch (err) {
    // console (not payload.logger): `getPayload` itself may be what failed, leaving no
    // logger instance. There is no eslint no-console rule; Next surfaces this server-side.
    // The static routes are already built, so the response is still a valid sitemap.
    console.error('[sitemap] content query failed; serving static routes only:', err)
  }

  return [...staticEntries, ...dynamicEntries]
}
