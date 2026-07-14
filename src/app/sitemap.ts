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
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getServerURL()
  const payload = await getPayload({ config })

  // Published-only: `overrideAccess: false` runs each collection's `publishedOrStaff`
  // read access with no user, so drafts never enter the sitemap. `select` keeps the
  // query to the two fields we emit; `pagination: false` returns the full set.
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

  const now = new Date()

  // `${base}${path}` yields an absolute URL for every path, including '/' → `${base}/`
  // (base carries no trailing slash). lastModified on the static pages tracks the
  // deploy; the dynamic entries carry the doc's own `updatedAt`.
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }))

  const postEntries: MetadataRoute.Sitemap = posts.docs
    .filter((doc) => Boolean(doc.slug))
    .map((doc) => ({
      url: `${base}/blog/${doc.slug}`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
    }))

  const caseEntries: MetadataRoute.Sitemap = cases.docs
    .filter((doc) => Boolean(doc.slug))
    .map((doc) => ({
      url: `${base}/case-studies/${doc.slug}`,
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
    }))

  return [...staticEntries, ...postEntries, ...caseEntries]
}
