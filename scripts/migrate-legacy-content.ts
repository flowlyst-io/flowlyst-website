/**
 * Legacy blog content port (issue #20, PRD §9 / §10.1 / §11).
 *
 * Ports the 7 published blog posts from the LIVE legacy site (https://flowlyst.io)
 * into the Payload CMS, reproducibly and idempotently. Run it against any configured
 * DATABASE_URL via the Payload Local API:
 *
 *     pnpm tsx scripts/migrate-legacy-content.ts
 *
 * Design decisions (see docs/runbooks/content-port.md for the operator steps):
 *
 * - SOURCE OF TRUTH is the live legacy HTML, fetched at run time — not a snapshot
 *   pasted into this file. Title, excerpt, publish date, body, featured image, and
 *   tags are all scraped from each post page, so a re-run reproduces the same result
 *   and nothing is hand-transcribed (and thus can't silently drift from the source).
 *
 * - SLUG PARITY IS SACRED (PRD §10.1 / §11). Each ported post keeps its EXACT legacy
 *   path segment as its slug, so the 15/16 legacy→new URL mapping holds with no
 *   redirect. The slugs below are the guard; they are never derived from the title.
 *
 * - IDEMPOTENT. Every entity is upserted by a stable natural key: blog posts + author
 *   by `slug`, media by `filename`. A second run updates in place and creates zero
 *   duplicates. All writes pass `context: { disableRevalidate: true }` because the
 *   BlogPosts afterChange hook calls Next's revalidatePath, which throws outside a
 *   request scope (this standalone script) — the hook swallows it, but skipping it is
 *   cleaner and faster here.
 *
 * - BODY → LEXICAL via Payload's own converter (`convertHTMLToLexical`), fed the
 *   sanitized editor config from the running instance. The legacy bodies use only
 *   p / strong / em / h2 / ul / li (verified across all 7), all of which the default
 *   Lexical feature set and the site's ArticleBody renderer handle.
 *
 * - readingTime is left to the BlogPosts `beforeChange` hook (words ÷ 200), which
 *   fires on every Local API write — we never set it by hand.
 *
 * - serviceCategory = 'general' for ALL 7 posts. This is the FAITHFUL port value: the
 *   legacy site exposes a category for exactly one post (post #1 = "GENERAL" in the
 *   /blog RSC payload) and none for the other six or on any post page. 'general' is
 *   both that one known legacy value and the collection's own default. A *proposed*
 *   topical re-categorisation (some posts → consulting / budget-software) is offered
 *   in the runbook as a CMS-editable option — it is deliberately NOT baked in here,
 *   because it would be a guess presented as source truth.
 *
 * - AUTHOR is Aziz Aghayev, "Founder & Lead Consultant" (PRD §6). The legacy byline
 *   is the generic "Flowlyst Team"; per the #20 brief every post is attributed to the
 *   named founder. No photo — the design's fallback avatar is intentional until #42.
 *
 * - The one deliberate CONTENT CORRECTION is post #1's title: the live title reads
 *   "K-15", a typo for "K-12" (adjudicated on #20). See TITLE_CORRECTIONS below.
 */
import 'dotenv/config'

import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'

import config from '@payload-config'
import type { BlogPost } from '@/payload-types'

const LEGACY_ORIGIN = 'https://flowlyst.io'

type ServiceCategory = NonNullable<BlogPost['serviceCategory']>

/**
 * The 7 legacy posts, in reverse-chronological order (newest first) so the ported
 * `publishedAt` values sort the same way the legacy index did. `slug` is the legacy
 * path segment verbatim — the URL-parity guard. `serviceCategory` is the faithful
 * 'general' for every post (see the file header for why).
 */
const POSTS: ReadonlyArray<{ slug: string; serviceCategory: ServiceCategory }> = [
  { slug: 'ai-predictive-analytics-staff-productivity', serviceCategory: 'general' },
  { slug: 'ai-sis-erp-automation-schools', serviceCategory: 'general' },
  { slug: 'ai-multi-year-forecasting-school-budgeting', serviceCategory: 'general' },
  { slug: 'ai-tools-school-admin-operations', serviceCategory: 'general' },
  { slug: 'ai-tools-school-hr-purchasing', serviceCategory: 'general' },
  { slug: 'ai-tools-school-finance-department', serviceCategory: 'general' },
  { slug: 'ai-tools-school-business-officials', serviceCategory: 'general' },
]

/**
 * Deliberate content corrections applied on port, keyed by slug. Post #1's live title
 * says "K-15" — a typo for "K-12" (adjudicated on issue #20). Applied as a literal
 * substring replace so it is explicit and auditable, and so it no-ops if the legacy
 * site is ever fixed upstream.
 */
const TITLE_CORRECTIONS: Record<string, [from: string, to: string]> = {
  'ai-predictive-analytics-staff-productivity': ['K-15', 'K-12'],
}

const AUTHOR = {
  name: 'Aziz Aghayev',
  slug: 'aziz-aghayev',
  title: 'Founder & Lead Consultant',
} as const

type LegacyPost = {
  title: string
  excerpt: string
  publishedAt: string
  bodyHTML: string
  imagePath: string
  tags: string[]
}

const text = (el: Element | null): string => (el?.textContent ?? '').trim()

// Payload types document ids as `number | string` generically; this project's
// Postgres adapter uses integer primary keys, so relationship FKs are numbers.
const asId = (id: number | string): number => id as number

/** Fetch a legacy post page and pull the fields we port out of its server HTML. */
async function fetchLegacyPost(slug: string): Promise<LegacyPost> {
  const url = `${LEGACY_ORIGIN}/blog/${slug}`
  const res = await fetch(url, { headers: { 'user-agent': 'flowlyst-content-migration' } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
  const doc = new JSDOM(await res.text()).window.document

  const article = doc.querySelector('article')
  if (!article) throw new Error(`No <article> found for ${slug} — legacy layout changed?`)

  const title = text(article.querySelector('h1'))
  const excerpt = text(article.querySelector('p[class*="text-white/90"]'))
  const publishedAt = article.querySelector('time')?.getAttribute('datetime')?.trim() ?? ''
  const bodyHTML = article.querySelector('.prose')?.innerHTML ?? ''
  const tags = Array.from(article.querySelectorAll('div.mt-8.flex.flex-wrap.gap-2 span'))
    .map((el) => text(el))
    .filter(Boolean)

  // Featured image: the legacy <img> src is a Next.js /_next/image URL that wraps the
  // real static path in its `url` query param, e.g. /images/blog/foo.jpg — decode it.
  const rawSrc = article.querySelector('img.object-cover')?.getAttribute('src') ?? ''
  const urlParam = new URLSearchParams(rawSrc.split('?')[1] ?? '').get('url')
  const imagePath = urlParam ? decodeURIComponent(urlParam) : ''

  for (const [field, value] of Object.entries({
    title,
    excerpt,
    publishedAt,
    bodyHTML,
    imagePath,
  })) {
    if (!value) throw new Error(`Missing "${field}" for ${slug} — legacy layout changed?`)
  }
  return { title, excerpt, publishedAt, bodyHTML, imagePath, tags }
}

/** Upsert the founder author by slug; returns its id. Idempotent. */
async function upsertAuthor(payload: Payload): Promise<number> {
  const existing = await payload.find({
    collection: 'authors',
    where: { slug: { equals: AUTHOR.slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'authors',
      id: existing.docs[0].id,
      data: { name: AUTHOR.name, title: AUTHOR.title },
      overrideAccess: true,
    })
    return asId(updated.id)
  }
  const created = await payload.create({
    collection: 'authors',
    data: { name: AUTHOR.name, slug: AUTHOR.slug, title: AUTHOR.title },
    overrideAccess: true,
  })
  return asId(created.id)
}

/**
 * Resolve the post's featured-image media id, idempotently. The stable idempotency key
 * is the POST relationship, NOT the filename: on a re-run the post already exists
 * (matched by slug) and already points at its media, so we reuse that id and never
 * re-upload. Payload appends a numeric suffix (`foo-1.jpg`) when a filename already
 * exists on disk/Blob, so the stored filename can differ from the source basename — a
 * filename lookup is therefore not a reliable key. As a secondary guard (a post that
 * exists but has no image yet) we match an already-uploaded media by its alt text (the
 * post title, unique per post) before finally downloading + uploading a fresh one.
 */
async function resolveFeaturedImage(
  payload: Payload,
  args: { existingImageId: number | null; imagePath: string; alt: string },
): Promise<{ id: number; created: boolean }> {
  const { existingImageId, imagePath, alt } = args
  if (existingImageId) return { id: existingImageId, created: false }

  const byAlt = await payload.find({
    collection: 'media',
    where: { alt: { equals: alt } },
    limit: 1,
    overrideAccess: true,
  })
  if (byAlt.docs[0]) return { id: asId(byAlt.docs[0].id), created: false }

  const url = `${LEGACY_ORIGIN}${imagePath}`
  const res = await fetch(url, { headers: { 'user-agent': 'flowlyst-content-migration' } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
  const data = Buffer.from(await res.arrayBuffer())
  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: {
      data,
      name: path.basename(imagePath),
      mimetype: res.headers.get('content-type') ?? 'image/jpeg',
      size: data.length,
    },
    overrideAccess: true,
  })
  return { id: asId(created.id), created: true }
}

type PostResult = {
  slug: string
  action: 'created' | 'updated'
  title: string
  category: ServiceCategory
  publishedAt: string
  readingTime: number | null | undefined
  mediaCreated: boolean
}

async function main(): Promise<void> {
  const payload = await getPayload({ config })
  const editorConfig = await editorConfigFactory.default({ config: payload.config })

  const authorId = await upsertAuthor(payload)
  console.log(`Author "${AUTHOR.name}" ready (id=${authorId})`)

  const results: PostResult[] = []

  for (const { slug, serviceCategory } of POSTS) {
    const legacy = await fetchLegacyPost(slug)

    let title = legacy.title
    const correction = TITLE_CORRECTIONS[slug]
    if (correction) title = title.replaceAll(correction[0], correction[1])

    // Payload's converter returns its own TypedEditorState; the generated `body` type
    // is the equivalent serialized shape. The cast bridges the two (same runtime data).
    const body = convertHTMLToLexical({
      editorConfig,
      html: legacy.bodyHTML,
      JSDOM,
    }) as unknown as BlogPost['body']

    // Look the post up by slug FIRST — it is the idempotency key for the post itself
    // AND the handle through which we reuse its already-uploaded featured image.
    const existing = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    const existingDoc = existing.docs[0]
    const existingImageId =
      existingDoc && typeof existingDoc.featuredImage === 'number' ? existingDoc.featuredImage : null

    const media = await resolveFeaturedImage(payload, {
      existingImageId,
      imagePath: legacy.imagePath,
      alt: title,
    })

    const data = {
      title,
      slug,
      excerpt: legacy.excerpt,
      body,
      author: authorId,
      featuredImage: media.id,
      serviceCategory,
      tags: legacy.tags,
      publishedAt: legacy.publishedAt,
      _status: 'published' as const,
    }

    const saved = existingDoc
      ? await payload.update({
          collection: 'blog-posts',
          id: existingDoc.id,
          data,
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
      : await payload.create({
          collection: 'blog-posts',
          data,
          overrideAccess: true,
          context: { disableRevalidate: true },
        })

    results.push({
      slug,
      action: existingDoc ? 'updated' : 'created',
      title,
      category: serviceCategory,
      publishedAt: legacy.publishedAt,
      readingTime: saved.readingTime,
      mediaCreated: media.created,
    })
    console.log(`  ${existingDoc ? 'updated' : 'created'}  /blog/${slug}`)
  }

  const created = results.filter((r) => r.action === 'created').length
  const updated = results.filter((r) => r.action === 'updated').length
  const mediaCreated = results.filter((r) => r.mediaCreated).length

  console.log('\n=== Legacy content port complete ===')
  console.table(
    results.map((r) => ({
      slug: r.slug,
      action: r.action,
      category: r.category,
      publishedAt: r.publishedAt.slice(0, 10),
      readMins: r.readingTime,
      title: r.title.length > 48 ? r.title.slice(0, 47) + '…' : r.title,
    })),
  )
  console.log(
    `Posts: ${created} created, ${updated} updated. Media: ${mediaCreated} uploaded, ${results.length - mediaCreated} reused.`,
  )

  process.exit(0)
}

main().catch((err) => {
  console.error('\nLegacy content port FAILED:', err)
  process.exit(1)
})
