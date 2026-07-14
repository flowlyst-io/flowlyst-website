import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { CaseStudy } from '@/payload-types'
import { FinalCTA } from '@/components/FinalCTA'

/**
 * Case studies index (`/case-studies`, PRD §7 / §9) — long-form district stories,
 * built against the settled design `design/site/pages.jsx` → `CaseStudiesPage`
 * (Direction C). Fully server-rendered: every crawlable string is in the initial
 * HTML, no client-only content (PRD §10.1, review invariant a). Nav / Footer and the
 * site-wide Organization JSON-LD come from the frontend layout; this page owns its
 * single H1 (the hero) and the closing FinalCTA band.
 *
 * Statically generated with on-demand revalidation (issue #1 decision): no
 * `revalidate` interval — the CaseStudies collection's `afterChange`/`afterDelete`
 * hooks call `revalidatePath('/case-studies')`, so a publish/unpublish/edit refreshes
 * this list without a redeploy.
 *
 * Design-vs-schema note (surfaced to the orchestrator): the design card shows a
 * headline stat, an implementation-duration chip, and a two-line summary. The
 * (migrated, off-limits) collection has no headline-stat, implementation-duration,
 * or excerpt field, so the card maps: headline stat → `metrics[0]`, summary →
 * `meta.description`, size chip → `districtInfo.studentCount`, tag → `serviceCategory`.
 * The implementation-duration chip is dropped (no field) — graceful degradation, not
 * invention. Real content lands with #20.
 */

const CANONICAL_PATH = '/case-studies'

const PAGE_TITLE = 'K–12 District Case Studies — flowlyst'
const PAGE_DESCRIPTION =
  'Long-form K–12 district stories from flowlyst: the challenge, the solution, and the measured results — budgeting software, AI training, and automation consulting, with the metrics.'

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

// Human-readable label for the card tag, keyed on the CMS service category.
const SERVICE_LABEL: Record<CaseStudy['serviceCategory'], string> = {
  'ai-training': 'AI Training',
  'budget-software': 'Budget Software',
  consulting: 'Consulting',
  general: 'General',
}

function studentCountChip(caseStudy: CaseStudy): string | null {
  const count = caseStudy.districtInfo?.studentCount
  if (typeof count !== 'number' || count <= 0) return null
  return `~${count.toLocaleString('en-US')} students`
}

export default async function CaseStudiesIndexPage() {
  const payload = await getPayload({ config })

  // Public read: `overrideAccess: false` applies the `publishedOrStaff` access
  // control, so an anonymous request never sees drafts. Newest first.
  const result = await payload.find({
    collection: 'case-studies',
    where: { _status: { equals: 'published' } },
    overrideAccess: false,
    depth: 0,
    limit: 50,
    sort: '-publishedAt',
  })
  const cases = result.docs

  return (
    <>
      {/* HERO — cream, type-led (design CaseStudiesPage). */}
      <section
        style={{
          position: 'relative',
          padding: '64px 56px 96px',
          background: 'var(--c-cream)',
          color: 'var(--c-ink)',
          overflow: 'hidden',
          borderBottom: '1px solid var(--c-cream-2)',
        }}
        data-testid="case-studies-hero"
      >
        <div className="container" style={{ paddingTop: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 32 }}>
            Long-form district stories
          </div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            How districts ship <em>faster</em> with flowlyst.
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '54ch' }}>
            Challenge → solution → results, with the metrics and the names of the people who lived
            it.
          </p>
        </div>
      </section>

      {/* CASE LIST — horizontal cards, or an empty state until #20 lands content. */}
      <section className="section" data-testid="case-studies-list">
        <div className="container">
          {cases.length > 0 ? (
            <div style={{ display: 'grid', gap: 24 }}>
              {cases.map((caseStudy, i) => (
                <CaseCard key={caseStudy.id} caseStudy={caseStudy} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </section>

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational elements ----------------
// Ported from design/site/pages.jsx `CaseStudiesPage`. Inline styles reference brand
// tokens / the design source's own values only (no invented values).

function ArrowRight() {
  return (
    <span className="arr" aria-hidden="true" style={{ display: 'inline-block' }}>
      →
    </span>
  )
}

// Horizontal case card: a colored stat panel (district + headline metric) beside the
// story summary. `metrics[0]` is the headline stat; the panel renders without a big
// number when a case has no metrics yet. Alternating panel colors follow the design.
function CaseCard({ caseStudy, index }: { caseStudy: CaseStudy; index: number }) {
  const districtName = caseStudy.districtInfo?.name?.trim()
  const headlineMetric = caseStudy.metrics?.[0]
  const summary = caseStudy.meta?.description?.trim()
  const sizeChip = studentCountChip(caseStudy)

  // Panel palette cycles green / forest / cream, matching the design comp.
  const variant = index % 3
  const panelBg =
    variant === 0 ? 'var(--fl-green)' : variant === 1 ? 'var(--c-forest)' : 'var(--c-cream)'
  const panelColor = variant === 2 ? 'var(--c-ink)' : '#fff'

  return (
    <Link
      href={`/case-studies/${caseStudy.slug}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
      data-testid="case-card"
    >
      {/* Wrapping flex (not a fixed-px grid) so the ~380px stat panel and the story
          column stack on narrow viewports instead of forcing horizontal scroll
          (WCAG 1.4.10 reflow). Fully inline — no shared-CSS media query needed. */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: '0 1 380px',
            background: panelBg,
            color: panelColor,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 40,
            minHeight: 200,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            {districtName || SERVICE_LABEL[caseStudy.serviceCategory]}
          </div>
          {headlineMetric && (
            <div style={{ marginTop: 24 }}>
              <div
                style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}
              >
                {headlineMetric.value}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  opacity: 0.85,
                }}
              >
                {headlineMetric.label}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            flex: '1 1 340px',
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            {SERVICE_LABEL[caseStudy.serviceCategory]}
          </div>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            {caseStudy.title}
          </h2>
          {summary && (
            <p className="p" style={{ marginBottom: 24, fontSize: 16 }}>
              {summary}
            </p>
          )}
          {sizeChip && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <span className="chip">{sizeChip}</span>
            </div>
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fl-green-700)' }}>
            Read the full case <ArrowRight />
          </span>
        </div>
      </div>
    </Link>
  )
}

// Empty state — real case studies arrive with #20. On-brand, existing classes only.
function EmptyState() {
  return (
    <div
      className="card"
      style={{ textAlign: 'center', padding: '64px 40px', maxWidth: 640, margin: '0 auto' }}
      data-testid="case-studies-empty"
    >
      <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 24 }}>
        Coming soon
      </div>
      <h2 className="h3" style={{ marginBottom: 16 }}>
        Our first district stories are on the way.
      </h2>
      <p className="p" style={{ marginBottom: 32, fontSize: 17 }}>
        We&rsquo;re writing up the districts we&rsquo;ve worked with — challenge, solution, and the
        measured results. In the meantime, see flowlyst on your own district&rsquo;s data.
      </p>
      <Link href="/request-demo" className="btn btn--primary btn--lg">
        Request a demo <ArrowRight />
      </Link>
    </div>
  )
}
