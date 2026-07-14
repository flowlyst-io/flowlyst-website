import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Testimonial } from '@/payload-types'
import { FinalCTA } from '@/components/FinalCTA'
import { SolutionHero } from '@/components/solutions/SolutionHero'
import { SectionHead } from '@/components/solutions/SectionHead'
import { ProductMock } from '@/components/solutions/ProductMock'
import { getServerURL } from '@/utilities/serverURL'

/**
 * Budget Software solution page (`/solutions/budget-software`, PRD §4.1 / §7 / §11)
 * — the highest-intent commercial page, built against the settled design
 * `design/site/solutions.jsx` `BudgetPage`. Fully server-rendered: every crawlable
 * string is in the initial HTML, no client-only content (PRD §10.1, review
 * invariant a). Nav / Footer come from the frontend layout; this page owns its
 * single H1 (the hero) and the closing FinalCTA band.
 *
 * ISR: `revalidate` keeps the page statically rendered (good LCP) while letting the
 * CMS-driven featured testimonial appear within a minute of publishing, without a
 * redeploy (PRD §9).
 */
export const revalidate = 60

const CANONICAL_PATH = '/solutions/budget-software'

const PAGE_TITLE = 'Budget Software for K–12 Districts — flowlyst'
const PAGE_DESCRIPTION =
  'Centralize your K–12 district’s budgeting — department entry, real-time tracking, and board-ready reports. Supplementary to your ERP, built by former school CFOs.'

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

// Hardcoded platform modules (PRD §4.1 "illustrative examples"). The design's
// kicker notes the list is CMS-driven "as we ship"; that is an annotation to
// implementers, not visitor copy, so the modules ship as static content and the
// kicker renders the visitor-facing "Illustrative — the platform keeps growing."
// (adjudication flagged in the task report).
type Module = { num: string; title: string; copy: string }

const MODULES: Module[] = [
  {
    num: '01',
    title: 'Department-level entry',
    copy: 'Guided, menu-free interface. Anyone in your district can build a budget without ERP training.',
  },
  {
    num: '02',
    title: 'Real-time tracking',
    copy: 'Actuals vs. budget, by department, by line, with the variance the board will ask about.',
  },
  {
    num: '03',
    title: 'Color-coded reports',
    copy: 'Board-ready, no Excel surgery. Export in seconds.',
  },
  {
    num: '04',
    title: 'Supervisor rollup',
    copy: 'Roll department budgets into one supervisor view.',
  },
  {
    num: '05',
    title: 'Pre-built dashboards',
    copy: 'Built by analysts and former school business officials. Available to every district.',
  },
  {
    num: '06',
    title: 'Fast table export',
    copy: 'Any dataset, any time, in a format the auditor will accept.',
  },
  {
    num: '07',
    title: 'Custom dashboards',
    copy: 'Tailored dashboards built on request — like multi-input salary projections. Available as a paid add-on.',
  },
  {
    num: '08',
    title: 'AI budget analysis',
    copy: 'Talk to your data. Ask the questions you currently dig through spreadsheets to answer. — Coming soon.',
  },
]

// Service promises (PRD §4.1 differentiators). Captions render as bare <p> so they
// inherit the `.section--green p` WCAG 1.4.3 amendment (24px full-opacity white,
// styles.css) — the design's 15px / 85%-white supporting text fails AA on the
// brand-green band. Do NOT set inline font-size/color here or the amendment loses.
const PROMISES: Array<{ stat: string; label: string }> = [
  { stat: '1 wk', label: 'Average implementation. We mean it.' },
  { stat: '1:1', label: 'Personalized onboarding sessions.' },
  { stat: 'CFOs', label: 'Support from school finance experts.' },
  { stat: '$0', label: 'IT staff required. No hidden fees.' },
]

// Attribution line for the featured testimonial: role · organization (the design's
// form), falling back to the client name if both are blank — matches the homepage.
function testimonialAttribution(t: Testimonial): string {
  const parts = [t.roleTitle, t.organization].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' · ') : t.clientName
}

export default async function BudgetSoftwarePage() {
  const serverURL = getServerURL()

  const payload = await getPayload({ config })

  // Public read: `overrideAccess: false` applies the `publishedOrStaff` access
  // control, so anonymous requests never see drafts. One featured, published
  // testimonial tagged to budget software; the section is omitted when none exists
  // (same empty-state pattern as the homepage). Deterministic order when >1.
  const testimonialResult = await payload.find({
    collection: 'testimonials',
    where: {
      and: [
        { featured: { equals: true } },
        { status: { equals: 'published' } },
        { serviceCategory: { equals: 'budget-software' } },
      ],
    },
    overrideAccess: false,
    depth: 0,
    limit: 1,
    sort: '-createdAt',
  })
  const testimonial = testimonialResult.docs[0]

  // schema.org Service for the budgeting software offering (PRD §10.1, review
  // invariant a) — in addition to the site-wide Organization node emitted by the
  // frontend layout. Absolute URLs so it never renders relative on deployed pages.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'flowlyst Budgeting Software',
    serviceType: 'K–12 school district budgeting software',
    description:
      'A web-based budgeting platform for K–12 public school districts — department entry, real-time tracking, board-ready reports, and analytics — supplementary to the district’s existing ERP.',
    url: `${serverURL}${CANONICAL_PATH}`,
    areaServed: 'US',
    provider: {
      '@type': 'Organization',
      name: 'flowlyst',
      url: serverURL,
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'K–12 public school districts',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <SolutionHero
        eyebrow="Budget Software · K-12"
        title={
          <>
            Many tools. <em>One platform.</em>
          </>
        }
        lead="Centralize your district’s budgeting workflow without ripping out your ERP. flowlyst Software fills the gaps your ERP leaves open."
        primaryCta="Request a demo"
        primaryHref="/request-demo"
        secondaryCta="See pricing on a call"
        secondaryHref="/contact"
        badges={['1-week implementation', 'No IT lift', 'Built by former school CFOs']}
        visual={<ProductMock />}
      />

      {/* SUPPLEMENTARY MESSAGE — flagship positioning (PRD §4.1: supplementary to
          the ERP, never a replacement). */}
      <section className="section section--cream" data-testid="budget-supplementary">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 80,
              alignItems: 'center',
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: 32 }}>
                Built to add, not replace
              </div>
              <h2 className="h2" style={{ marginBottom: 32 }}>
                flowlyst <em>adds</em> to your stack. It doesn’t fight it.
              </h2>
              <p className="lead" style={{ marginBottom: 20 }}>
                We don’t ask you to migrate, retrain, or fight procurement. flowlyst is
                supplementary to your ERP — it fills the budgeting gap your ERP was never going to
                give you.
              </p>
              <p className="p" style={{ fontSize: 17 }}>
                Sync to your GL. Keep your ERP. Add real budgeting on top.
              </p>
            </div>
            <ERPDiagram />
          </div>
        </div>
      </section>

      {/* MODULES — tabular grid (PRD §4.1 illustrative modules). */}
      <section className="section" data-testid="budget-modules">
        <div className="container">
          <SectionHead
            eyebrow="What’s in the platform"
            title={
              <>
                Eight workflows. <em>One source of truth.</em>
              </>
            }
            kicker="Illustrative — the platform keeps growing."
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
              border: '1px solid var(--c-cream-2)',
            }}
          >
            {MODULES.map((m, i) => (
              <div
                key={m.num}
                style={{
                  padding: 36,
                  borderRight: i % 2 === 0 ? '1px solid var(--c-cream-2)' : 'none',
                  borderBottom: i < 6 ? '1px solid var(--c-cream-2)' : 'none',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--fl-green-700)',
                    marginBottom: 16,
                    letterSpacing: '0.06em',
                  }}
                >
                  {m.num}
                </div>
                <h3 className="h4" style={{ marginBottom: 12, fontSize: 22 }}>
                  {m.title}
                </h3>
                <p className="p" style={{ fontSize: 15 }}>
                  {m.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE PROMISES — green band (PRD §4.1 differentiators). */}
      <section
        className="section--green"
        style={{ padding: '120px 56px' }}
        data-testid="budget-promises"
      >
        <div className="container">
          <div className="stat-band__grid" style={{ '--stat-band-cols': 4 } as React.CSSProperties}>
            {PROMISES.map((p) => (
              <div
                key={p.stat}
                style={{ borderLeft: '2px solid rgba(255,255,255,0.4)', paddingLeft: 24 }}
              >
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {p.stat}
                </div>
                {/* Bare <p>: size + white come from the .section--green amendment. */}
                <p style={{ marginTop: 16, lineHeight: 1.5 }}>{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TESTIMONIAL — CMS-driven; omitted when none published (PRD §9). */}
      {testimonial && (
        <section className="section section--sage" data-testid="budget-testimonial">
          <div className="container" style={{ maxWidth: 980, textAlign: 'center' }}>
            <div
              aria-hidden="true"
              style={{
                fontSize: 96,
                fontWeight: 800,
                lineHeight: 0.5,
                color: 'var(--fl-green)',
                marginBottom: 32,
              }}
            >
              “
            </div>
            {/* Plain text, not dangerouslySetInnerHTML. */}
            <blockquote className="pull" style={{ margin: '0 auto 40px', maxWidth: '24ch' }}>
              {testimonial.quote}
            </blockquote>
            <div
              style={{
                fontSize: 13,
                color: 'var(--c-ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                fontWeight: 800,
              }}
            >
              {testimonialAttribution(testimonial)}
            </div>
          </div>
        </section>
      )}

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational elements ----------------
// Budget-specific (not shared with the sibling pages). Ported verbatim from
// design/site/solutions.jsx `ERPDiagram`; inline styles reference brand tokens /
// the design source's own rgba values (no invented values).

// "ERP + flowlyst" diagram — the supplementary-to-ERP positioning, visualized.
function ERPDiagram() {
  const adds = [
    'Department-level budget entry',
    'Real-time variance tracking',
    'Board-ready reports',
    'Salary projection scenarios',
  ]
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--c-cream-2)',
        borderRadius: 4,
        padding: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            flex: 1,
            padding: '20px 16px',
            background: 'var(--c-cream)',
            border: '1.5px dashed rgba(0,0,0,0.18)',
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--c-ink-3)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Your stack
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-ink)' }}>ERP</div>
        </div>
        <div style={{ fontSize: 24, color: 'var(--fl-green)', fontWeight: 800 }}>+</div>
        <div
          style={{
            flex: 1,
            padding: '20px 16px',
            background: 'var(--fl-green)',
            borderRadius: 4,
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
              opacity: 0.85,
            }}
          >
            Add
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>flowlyst</div>
        </div>
      </div>
      <div style={{ borderTop: '1px dashed var(--c-cream-2)', paddingTop: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--c-ink-3)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          flowlyst adds
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {adds.map((t) => (
            <div key={t} style={{ display: 'flex', gap: 10, fontSize: 14, fontWeight: 600 }}>
              <span className="accent" aria-hidden="true" style={{ fontWeight: 800 }}>
                ✦
              </span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
