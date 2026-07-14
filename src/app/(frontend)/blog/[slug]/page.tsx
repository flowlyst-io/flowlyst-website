import React, { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Author, BlogPost, Media } from '@/payload-types'
import { FinalCTA } from '@/components/FinalCTA'
import { SectionHead } from '@/components/solutions/SectionHead'
import { AuthorAvatar, PostThumb } from '@/components/blog/BlogArt'
import { ArticleBody } from '@/components/blog/ArticleBody'
import { categoryLabel, formatPostDate } from '@/components/blog/format'
import { getServerURL } from '@/utilities/serverURL'

/**
 * Blog article reader (`/blog/[slug]`, PRD §7 / §9 / §11), built against the settled
 * design `design/site/pages.jsx` BlogPostPage. Fully server-rendered — the headline,
 * byline, body, author bio, and related posts are all in the initial HTML with no
 * client-only content (review invariant a). Nav / Footer come from the frontend
 * layout; this page owns the single H1 (the post title) and the closing FinalCTA.
 *
 * Rendering strategy (issue #1 decision log): statically generated per published
 * slug via generateStaticParams, with `dynamicParams: true` so a post published
 * after the build renders on first request. The `afterChange`/`afterDelete` hooks in
 * BlogPosts.ts call revalidatePath for this path, so edits/unpublishes propagate
 * without a redeploy (#18's requirement).
 */

export const dynamicParams = true

// Deduplicate the post fetch across generateMetadata + the page render within one
// request (React cache), so a slug is queried once, not twice.
const getPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'blog-posts',
    where: { slug: { equals: slug } },
    // Anonymous read → the `publishedOrStaff` access control filters drafts /
    // unpublished out. depth 2 resolves featuredImage, author, and author.photo.
    overrideAccess: false,
    depth: 2,
    limit: 1,
  })
  return (res.docs[0] as BlogPost | undefined) ?? null
})

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'blog-posts',
    where: { _status: { equals: 'published' } },
    overrideAccess: false,
    depth: 0,
    limit: 1000,
    pagination: false,
    select: { slug: true },
  })
  return res.docs.map((doc) => ({ slug: doc.slug }))
}

const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' ? (value as Media) : null
const asAuthor = (value: unknown): Author | null =>
  value && typeof value === 'object' ? (value as Author) : null

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  // An unpublished / unknown slug: minimal, non-indexable metadata. The page render
  // returns notFound() for the same case.
  if (!post) {
    return { title: 'Post not found — flowlyst', robots: { index: false, follow: false } }
  }

  const path = `/blog/${post.slug}`
  const title = post.meta?.title || `${post.title} — flowlyst`
  const description =
    post.meta?.description ||
    post.excerpt ||
    'Practical writing on AI, school finance, and modernization for K–12 districts, from flowlyst.'
  const ogImage = asMedia(post.meta?.ogImage)?.url || asMedia(post.featuredImage)?.url || undefined

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'flowlyst',
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function BlogPostReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const serverURL = getServerURL()
  const author = asAuthor(post.author)
  const authorPhoto = asMedia(author?.photo)
  const featured = asMedia(post.featuredImage)
  const date = formatPostDate(post)
  const postUrl = `${serverURL}/blog/${post.slug}`

  // Related posts: same category, newest first, excluding this one. depth 1 resolves
  // each card's featured image. Section is omitted when there are none.
  const payload = await getPayload({ config })
  const relatedResult = await payload.find({
    collection: 'blog-posts',
    where: {
      and: [{ serviceCategory: { equals: post.serviceCategory } }, { id: { not_equals: post.id } }],
    },
    overrideAccess: false,
    depth: 1,
    limit: 3,
    sort: '-publishedAt',
  })
  const related = relatedResult.docs as BlogPost[]

  // schema.org Article (PRD §10.1; review invariant a) — alongside the layout's
  // site-wide Organization node. Absolute URLs so nothing renders relative on
  // deployed pages. author is a Person when the post has one, else the Organization.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: author
      ? {
          '@type': 'Person',
          name: author.name,
          ...(author.title ? { jobTitle: author.title } : {}),
        }
      : { '@type': 'Organization', name: 'flowlyst', url: serverURL },
    publisher: { '@type': 'Organization', name: 'flowlyst', url: serverURL },
    mainEntityOfPage: postUrl,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(featured?.url ? { image: new URL(featured.url, serverURL).toString() } : {}),
  }

  const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`
  const emailShare = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(postUrl)}`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* HEADER */}
      <article style={{ padding: '64px 56px 0' }} data-testid="post-header">
        <div className="container" style={{ maxWidth: 760 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
              fontSize: 13,
              color: 'var(--c-ink-3)',
            }}
          >
            <Link
              href="/blog"
              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
            >
              ← Blog
            </Link>
            <span aria-hidden="true">·</span>
            <span
              style={{
                color: 'var(--fl-green-700)',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontSize: 11,
              }}
            >
              {categoryLabel(post.serviceCategory)}
              {post.readingTime ? ` · ${post.readingTime} min read` : ''}
            </span>
          </div>

          <h1 className="h1" style={{ marginBottom: 32, fontSize: 'clamp(40px, 5vw, 64px)' }}>
            {post.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <AuthorAvatar size={48} photo={authorPhoto} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{author?.name ?? 'flowlyst'}</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>
                {[author?.title, date].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <a
                href={emailShare}
                className="chip"
                aria-label="Share this post by email"
                style={{ textDecoration: 'none' }}
              >
                Share
              </a>
              <a
                href={linkedInShare}
                className="chip"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share this post on LinkedIn"
                style={{ textDecoration: 'none' }}
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div
            style={{ aspectRatio: '16/9', borderRadius: 4, overflow: 'hidden', marginBottom: 56 }}
          >
            <PostThumb image={featured} index={0} fill priority />
          </div>
        </div>
      </article>

      {/* BODY */}
      <section style={{ padding: '0 56px 80px' }} data-testid="post-body">
        <div className="container" style={{ maxWidth: 760 }}>
          {post.excerpt && (
            <p
              style={{
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1.5,
                color: 'var(--c-ink)',
                marginBottom: 32,
              }}
            >
              {post.excerpt}
            </p>
          )}
          <ArticleBody body={post.body} />
        </div>
      </section>

      {/* AUTHOR BIO — cream. Rendered only when the post has an author. */}
      {author && (
        <section className="section section--cream" data-testid="post-author-bio">
          <div className="container" style={{ maxWidth: 900 }}>
            <div
              className="card"
              style={{
                background: '#fff',
                display: 'grid',
                gridTemplateColumns: '88px 1fr',
                gap: 24,
                alignItems: 'center',
                padding: 32,
              }}
            >
              <AuthorAvatar size={88} photo={authorPhoto} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{author.name}</div>
                {author.bio && (
                  <div style={{ fontSize: 14, color: 'var(--c-ink-2)' }}>{author.bio}</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RELATED — "keep reading". Omitted when there are no other posts in-category. */}
      {related.length > 0 && (
        <section className="section" data-testid="post-related">
          <div className="container">
            <SectionHead
              eyebrow="Keep reading"
              title={
                <>
                  More <em>from the blog.</em>
                </>
              }
              maxWidth="20ch"
            />
            <div className="grid-3">
              {related.map((rel, i) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <PostThumb image={asMedia(rel.featuredImage)} index={i} />
                    <div style={{ padding: 24 }}>
                      <h3 className="h4" style={{ marginBottom: 12, fontSize: 18 }}>
                        {rel.title}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--c-ink-3)' }}>
                        {[
                          formatPostDate(rel),
                          rel.readingTime ? `${rel.readingTime} min read` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCTA />
    </>
  )
}
