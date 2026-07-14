import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { CaseStudy, Media } from '@/payload-types'
import { FinalCTA } from '@/components/FinalCTA'
import { getServerURL } from '@/utilities/serverURL'
import { serializeJsonLd } from '@/utilities/jsonLd'
import { mediaSrc } from '@/utilities/mediaSrc'
import { RichTextBody } from './RichTextBody'

/**
 * Case study detail (`/case-studies/[slug]`, PRD §7 / §9). No hi-fi detail design
 * exists upstream, so per the orchestrator's design-gap adjudication (issue #19,
 * 2026-07-14) this long-form story template is composed strictly from settled
 * patterns: the `BlogPostPage` reader shell (design/site/pages.jsx — back link,
 * single H1, byline meta, hero image, 760px reading column) plus the
 * `CaseStudiesPage` card motifs (district eyebrow, stat/size chips, green metrics
 * band). Design-system tokens only; nothing invented at the atom level.
 *
 * Section order follows the collection schema (issue #19 adjudication): intro →
 * challenge → solution → results → metrics band → district info → final CTA.
 *
 * Statically generated with on-demand revalidation (issue #1 decision):
 * `generateStaticParams` prebuilds published slugs; `dynamicParams` lets a
 * newly-published story render on first request; the collection hooks call
 * `revalidatePath` so publish/unpublish/edit refreshes without a redeploy.
 */

export const dynamicParams = true

const CATEGORY_LABEL: Record<CaseStudy['serviceCategory'], string> = {
  'ai-training': 'AI Training',
  'budget-software': 'Budget Software',
  consulting: 'Consulting',
  general: 'General',
}

const READING_COLUMN = 760

type CaseStudyRichText = NonNullable<CaseStudy['intro']>

// A rich-text field carries renderable content when its Lexical root has children.
function hasContent(value: CaseStudy['intro']): value is CaseStudyRichText {
  return !!value?.root?.children?.length
}

// heroImage / meta.ogImage are `number | Media | null` depending on depth; return the
// populated Media object (depth ≥ 1) or null.
function mediaObject(value: number | Media | null | undefined): Media | null {
  return value && typeof value === 'object' ? value : null
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

// Public read of one published case study by slug. `overrideAccess: false` applies
// the `publishedOrStaff` access control, so a draft or unknown slug resolves to null
// (→ notFound → 404) and never renders. Shared by the page, its metadata, and JSON-LD.
async function findPublishedCase(slug: string): Promise<CaseStudy | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'case-studies',
    where: { slug: { equals: slug } },
    overrideAccess: false,
    depth: 1,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'case-studies',
    where: { _status: { equals: 'published' } },
    overrideAccess: false,
    depth: 0,
    limit: 200,
    pagination: false,
  })
  return result.docs.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const caseStudy = await findPublishedCase(slug)

  if (!caseStudy) {
    // Unknown/unpublished slug: keep it out of the index (the page itself 404s).
    return { title: 'Case study not found — flowlyst', robots: { index: false, follow: false } }
  }

  const canonicalPath = `/case-studies/${caseStudy.slug}`
  const title = caseStudy.meta?.title?.trim() || `${caseStudy.title} — flowlyst case study`
  const description =
    caseStudy.meta?.description?.trim() ||
    `How a K–12 district worked with flowlyst on ${CATEGORY_LABEL[caseStudy.serviceCategory]} — the challenge, the solution, and the measured results.`
  const ogImage = mediaObject(caseStudy.meta?.ogImage) ?? mediaObject(caseStudy.heroImage)

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: 'flowlyst',
      type: 'article',
      ...(ogImage?.url ? { images: [{ url: ogImage.url, alt: ogImage.alt }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const caseStudy = await findPublishedCase(slug)
  if (!caseStudy) notFound()

  const serverURL = getServerURL()
  const canonicalPath = `/case-studies/${caseStudy.slug}`
  const hero = mediaObject(caseStudy.heroImage)
  const metrics = caseStudy.metrics ?? []
  const district = caseStudy.districtInfo
  const districtName = district?.name?.trim()
  const districtState = district?.state?.trim()
  const studentCount =
    typeof district?.studentCount === 'number' && district.studentCount > 0
      ? district.studentCount
      : null
  const hasDistrict = Boolean(districtName || districtState || studentCount)
  const publishedDate = formatDate(caseStudy.publishedAt)

  // Absolute image URL for structured data (never relative on a deployed page).
  const heroAbsolute = hero?.url
    ? hero.url.startsWith('http')
      ? hero.url
      : `${serverURL}${hero.url}`
    : undefined

  // schema.org Article (PRD §10.1, review invariant a) — same rationale as blog
  // posts. author/publisher are the flowlyst Organization (case studies carry no
  // person author). Emitted alongside the layout's site-wide Organization node.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: caseStudy.title,
    ...(caseStudy.meta?.description?.trim()
      ? { description: caseStudy.meta.description.trim() }
      : {}),
    ...(caseStudy.publishedAt ? { datePublished: caseStudy.publishedAt } : {}),
    ...(caseStudy.updatedAt ? { dateModified: caseStudy.updatedAt } : {}),
    ...(heroAbsolute ? { image: heroAbsolute } : {}),
    mainEntityOfPage: `${serverURL}${canonicalPath}`,
    author: { '@type': 'Organization', name: 'flowlyst', url: serverURL },
    publisher: { '@type': 'Organization', name: 'flowlyst', url: serverURL },
  }

  return (
    <>
      {/* serializeJsonLd escapes `<` so an editor-authored title containing
          `</script>` can't break out of this block (stored XSS). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
      />

      {/* HEADER — BlogPostPage reader shell: back link, service eyebrow, H1, meta. */}
      <article style={{ padding: '64px 56px 0' }} data-testid="case-study-header">
        <div className="container" style={{ maxWidth: READING_COLUMN }}>
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
              href="/case-studies"
              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
            >
              ← Case studies
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
              {CATEGORY_LABEL[caseStudy.serviceCategory]}
            </span>
          </div>
          <h1 className="h1" style={{ marginBottom: 24, fontSize: 'clamp(40px, 5vw, 64px)' }}>
            {caseStudy.title}
          </h1>
          {(districtName || publishedDate) && (
            <div style={{ fontSize: 14, color: 'var(--c-ink-3)', marginBottom: hero ? 48 : 8 }}>
              {[districtName, publishedDate].filter(Boolean).join(' · ')}
            </div>
          )}
          {hero?.url && (
            // next/image optimizes the hero and preloads it (priority) so it paints as
            // a light LCP element (#69, same pattern as the blog reader). `mediaSrc`
            // normalizes the URL: filesystem media resolves to an absolute same-origin
            // URL next/image would reject, so it is stripped to a relative
            // `/api/media/file/…` path matched by localPatterns; Vercel Blob URLs pass
            // through to remotePatterns. The relative 16/9 box reserves the exact space
            // the plain <img> did (no CLS); `fill` makes the image cover it. `sizes`
            // matches the 760px reading column (full width below ~872px).
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <Image
                src={mediaSrc(hero.url)}
                alt={hero.alt ?? ''}
                fill
                priority
                sizes="(max-width: 872px) 100vw, 760px"
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      </article>

      {/* BODY — 760px reading column. intro (lead) → challenge → solution → results. */}
      <section style={{ padding: '48px 56px 80px' }} data-testid="case-study-body">
        <div className="container" style={{ maxWidth: READING_COLUMN }}>
          {hasContent(caseStudy.intro) && (
            <div data-testid="case-study-intro" style={{ marginBottom: 8 }}>
              <RichTextBody data={caseStudy.intro} />
            </div>
          )}

          {hasContent(caseStudy.challenge) && (
            <StorySection
              testid="case-study-challenge"
              label="The challenge"
              body={caseStudy.challenge}
            />
          )}
          {hasContent(caseStudy.solution) && (
            <StorySection
              testid="case-study-solution"
              label="The solution"
              body={caseStudy.solution}
            />
          )}
          {hasContent(caseStudy.results) && (
            <StorySection
              testid="case-study-results"
              label="The results"
              body={caseStudy.results}
            />
          )}
        </div>
      </section>

      {/* METRICS BAND — green, CaseStudiesPage stat motif. Omitted when no metrics.
          Bare <p> labels inherit the `.section--green p` WCAG 1.4.3 amendment. */}
      {metrics.length > 0 && (
        <section
          className="section--green"
          style={{ padding: '120px 56px' }}
          data-testid="case-study-metrics"
        >
          <div className="container">
            {/* Real <h2> (small-caps styled) so the metrics band sits in the outline. */}
            <h2
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                margin: '0 0 48px',
                opacity: 0.85,
              }}
            >
              By the numbers
            </h2>
            <div
              className="stat-band__grid"
              style={{ '--stat-band-cols': Math.min(metrics.length, 4) } as React.CSSProperties}
            >
              {metrics.map((metric) => (
                <div
                  key={metric.id ?? metric.label}
                  style={{ borderLeft: '2px solid rgba(255,255,255,0.4)', paddingLeft: 24 }}
                >
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 800,
                      color: '#fff',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {metric.value}
                  </div>
                  <p style={{ marginTop: 16, lineHeight: 1.5 }}>{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DISTRICT INFO — CaseStudiesPage size/size-chip motif. Omitted when empty. */}
      {hasDistrict && (
        <section className="section section--cream" data-testid="case-study-district">
          <div className="container" style={{ maxWidth: READING_COLUMN }}>
            <div className="eyebrow" style={{ marginBottom: 24 }}>
              About the district
            </div>
            <h2 className="h3" style={{ marginBottom: 16 }}>
              {districtName || 'The district'}
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {districtState && <span className="chip">{districtState}</span>}
              {studentCount && (
                <span className="chip">~{studentCount.toLocaleString('en-US')} students</span>
              )}
              <span className="chip chip--green">{CATEGORY_LABEL[caseStudy.serviceCategory]}</span>
            </div>
          </div>
        </section>
      )}

      <FinalCTA />
    </>
  )
}

// A labeled story section within the reading column: a real <h2> section heading
// (styled as the blog-post reader shell's `.h3` subhead) + rich-text body. Section
// labels are headings — not eyebrow divs — so the story has a navigable outline and
// no skipped levels (every heading after the H1 title is h2+).
function StorySection({
  testid,
  label,
  body,
}: {
  testid: string
  label: string
  body: CaseStudyRichText
}) {
  return (
    <div style={{ marginTop: 48 }} data-testid={testid}>
      <h2 className="h3" style={{ marginBottom: 20 }}>
        {label}
      </h2>
      <RichTextBody data={body} />
    </div>
  )
}
