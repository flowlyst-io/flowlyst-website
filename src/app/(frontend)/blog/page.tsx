import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Author, BlogPost, Media } from '@/payload-types'
import { FinalCTA } from '@/components/FinalCTA'
import { SectionHead } from '@/components/solutions/SectionHead'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { PostThumb } from '@/components/blog/BlogArt'
import { formatPostDate, postTag, type BlogCategory } from '@/components/blog/format'

/**
 * Blog index (`/blog`, PRD §7 / §9 / §11), built against the settled design
 * `design/site/pages.jsx` BlogIndexPage. Fully server-rendered — the hero, the
 * category chips (as links, not client filters), the featured post, and the archive
 * grid are all in the initial HTML (review invariant a). The newsletter section
 * mounts the reusable `NewsletterSignup` island (issue #16); Nav / Footer come from
 * the frontend layout; this page owns the single H1 and the closing FinalCTA.
 *
 * Rendering: this route reads `searchParams.category` to filter server-side, which
 * makes it dynamically rendered (always fresh) — distinct from `/blog/[slug]`, which
 * is statically generated + on-demand revalidated. `revalidatePath('/blog')` from the
 * BlogPosts hooks is therefore a harmless no-op for the index and load-bearing for
 * the post pages. The canonical is always `/blog` (not per-filter) so category views
 * don't fragment into duplicate-content URLs.
 */

const CANONICAL_PATH = '/blog'

const PAGE_TITLE = 'The flowlyst blog — AI, school finance, and K–12 modernization'
const PAGE_DESCRIPTION =
  'Practical writing on AI, school finance, and district modernization — by Aziz Aghayev and the flowlyst team, former school CFOs and administrators.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_PATH,
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

// Filter chips. "All" plus the three real serviceCategory values — the design's chip
// row also shows "Consulting", but the BlogPosts enum has no such value, so a
// Consulting chip would be a dead filter. Omitted (adjudicated; flagged for the
// design fold-in list). See src/components/blog/format.ts.
const CATEGORIES: Array<{ value: '' | BlogCategory; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ai-training', label: 'AI Training' },
  { value: 'budget-software', label: 'Budget Software' },
  { value: 'general', label: 'General' },
]

const VALID_CATEGORIES: BlogCategory[] = ['ai-training', 'budget-software', 'general']

const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' ? (value as Media) : null
const asAuthor = (value: unknown): Author | null =>
  value && typeof value === 'object' ? (value as Author) : null

const authorName = (post: BlogPost): string => asAuthor(post.author)?.name ?? 'flowlyst'

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>
}) {
  const raw = (await searchParams).category
  const categoryParam = Array.isArray(raw) ? raw[0] : raw
  // An unknown category (never produced by the chips) falls back to "All" rather
  // than an empty result — only a real enum value narrows the query.
  const selected: BlogCategory | null =
    categoryParam && VALID_CATEGORIES.includes(categoryParam as BlogCategory)
      ? (categoryParam as BlogCategory)
      : null

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'blog-posts',
    where: selected ? { serviceCategory: { equals: selected } } : {},
    // Anonymous read → `publishedOrStaff` filters drafts / unpublished out. depth 1
    // resolves each post's featured image + author byline.
    overrideAccess: false,
    depth: 1,
    limit: 24,
    sort: '-publishedAt',
  })
  const posts = result.docs as BlogPost[]
  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <>
      {/* HERO — cream, type-led, with the server-rendered category chips */}
      <section
        style={{
          position: 'relative',
          padding: '64px 56px 96px',
          background: 'var(--c-cream)',
          color: 'var(--c-ink)',
          overflow: 'hidden',
          borderBottom: '1px solid var(--c-cream-2)',
        }}
        data-testid="blog-hero"
      >
        <div className="container" style={{ paddingTop: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 32 }}>
            flowlyst writing
          </div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            Notes from the office that <em>runs the district.</em>
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '52ch', marginBottom: 40 }}>
            Practical posts on AI, school finance, and modernization. By Aziz and the flowlyst team.
          </p>
          <nav
            aria-label="Filter posts by category"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {CATEGORIES.map((c) => {
              const active = c.value === '' ? selected === null : c.value === selected
              const href = c.value ? `/blog?category=${c.value}` : '/blog'
              return (
                <Link
                  key={c.value || 'all'}
                  href={href}
                  className={active ? 'chip chip--green' : 'chip'}
                  aria-current={active ? 'page' : undefined}
                >
                  {c.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </section>

      {posts.length === 0 ? (
        // Empty state (design-gap fill — the comp has no empty state). Uses existing
        // classes only; no invented values. Real content arrives with #20.
        <section className="section" data-testid="blog-empty">
          <div className="container" style={{ maxWidth: 640, textAlign: 'center' }}>
            <h2 className="h3" style={{ marginBottom: 16 }}>
              {selected ? 'No posts in this category yet.' : 'No posts yet.'}
            </h2>
            <p className="p">
              New writing on AI, school finance, and district modernization is on the way. Check
              back soon — or get it in your inbox below.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* FEATURED — the newest post, full-width teaser */}
          <section className="section" data-testid="blog-featured">
            <div className="container">
              <Link
                href={`/blog/${featured.slug}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: 56,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ aspectRatio: '16/10', overflow: 'hidden', borderRadius: 4 }}>
                    <PostThumb image={asMedia(featured.featuredImage)} index={0} fill priority />
                  </div>
                  <div>
                    <span className="chip chip--green" style={{ marginBottom: 24 }}>
                      Featured
                    </span>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--fl-green-700)',
                        marginBottom: 20,
                      }}
                    >
                      {postTag(featured)}
                    </div>
                    <h2 className="h2" style={{ marginBottom: 24 }}>
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="p" style={{ marginBottom: 24, fontSize: 17 }}>
                        {featured.excerpt}
                      </p>
                    )}
                    <div style={{ fontSize: 14, color: 'var(--c-ink-3)', marginBottom: 24 }}>
                      by {authorName(featured)} · {formatPostDate(featured)}
                    </div>
                    <span className="btn btn--primary">
                      Read post{' '}
                      <span className="arr" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* GRID — the rest of the archive. Omitted when the only post is featured. */}
          {rest.length > 0 && (
            <section className="section section--cream" data-testid="blog-grid">
              <div className="container">
                <SectionHead
                  eyebrow="More writing"
                  title={
                    <>
                      The <em>full archive.</em>
                    </>
                  }
                  maxWidth="20ch"
                />
                <div className="grid-3">
                  {rest.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/blog/${p.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div
                        className="card"
                        style={{ background: '#fff', padding: 0, overflow: 'hidden' }}
                      >
                        <PostThumb image={asMedia(p.featuredImage)} index={i + 1} />
                        <div style={{ padding: 28 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              color: 'var(--fl-green-700)',
                              marginBottom: 14,
                            }}
                          >
                            {postTag(p)}
                          </div>
                          <h3
                            className="h4"
                            style={{ marginBottom: 14, fontSize: 18, lineHeight: 1.3 }}
                          >
                            {p.title}
                          </h3>
                          <div style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>
                            {formatPostDate(p)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* NEWSLETTER — sage band; the mount supplies the wrapper + copy, the island the
          form (issue #16). 480px centering matches the design's input row. */}
      <section
        className="section section--sage"
        style={{ padding: '120px 56px' }}
        data-testid="blog-newsletter"
      >
        <div className="container" style={{ maxWidth: 720, textAlign: 'center' }}>
          <div className="eyebrow mb-32" style={{ justifyContent: 'center' }}>
            Newsletter
          </div>
          <h2 className="h2" style={{ marginBottom: 20 }}>
            Get our writing <em>in your inbox.</em>
          </h2>
          <p className="lead" style={{ marginBottom: 32 }}>
            One email a month. AI in K-12, no fluff.
          </p>
          <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
            <NewsletterSignup source="blog" />
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  )
}
