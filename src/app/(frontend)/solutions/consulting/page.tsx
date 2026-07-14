import React from 'react'
import type { Metadata } from 'next'

import { FinalCTA } from '@/components/FinalCTA'
import { SolutionHero } from '@/components/solutions/SolutionHero'
import { SectionHead } from '@/components/solutions/SectionHead'
import { getServerURL } from '@/utilities/serverURL'

/**
 * AI & Automation Consulting solution page (`/solutions/consulting`, PRD §4.3 /
 * §7 / §11), built against the settled design `design/site/solutions.jsx`
 * `ConsultingPage`. Fully server-rendered: every crawlable string is in the
 * initial HTML, no client-only content (PRD §10.1, review invariant a). Nav /
 * Footer come from the frontend layout; this page owns its single H1 (the hero)
 * and the closing FinalCTA band.
 *
 * Fully static — unlike the sibling budget-software page, no section of the
 * ConsultingPage design maps to a CMS collection (no featured testimonial, no
 * CMS-driven module list). So there is no `revalidate` and no Payload query: the
 * page renders from the constants below, which keeps LCP low. Should a future
 * design revision add a CMS-backed section, follow the budget page's ISR pattern.
 */

const CANONICAL_PATH = '/solutions/consulting'

const PAGE_TITLE = 'AI & Automation Consulting for K–12 Districts — flowlyst'
const PAGE_DESCRIPTION =
  'Hands-on AI & automation consulting for K–12 school districts — targeted projects or embedded, McKinsey-style engagements that automate routine work, delivered by former school CFOs.'

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

// Two engagement modes (PRD §4.3): targeted projects vs. full McKinsey-style
// consulting with an embedded engineer.
type EngagementMode = {
  num: string
  tag: string
  title: string
  copy: string
  points: string[]
}

const MODES: EngagementMode[] = [
  {
    num: '01',
    tag: 'Mode 1',
    title: 'Targeted automation projects',
    copy: 'A specific routine task or workflow gets automated end-to-end. We design, implement, and train your team. Best for districts with one or two clear pain points.',
    points: ['Scoped engagement', 'Implementation + training', 'Hand-off to your team'],
  },
  {
    num: '02',
    tag: 'Mode 2',
    title: 'Full automation consulting',
    copy: 'McKinsey-style depth. We map routine tasks across departments, design the long-term roadmap, and embed an engineer who delivers and maintains. For districts that want systematic transformation.',
    points: ['Cross-department mapping', 'Multi-year roadmap', 'Embedded engineer'],
  },
]

// Departments served (PRD §4.3): every central-office function plus its
// school-level extensions. The pattern of routine work is the target, not any
// one department.
const DEPARTMENTS: string[] = [
  'HR',
  'Business Office',
  'Superintendent’s Office',
  'Instructional leaders',
  'Accounts Payable',
  'Accounts Receivable',
  'Payroll · Benefits',
  'And the rest of the office',
]

// Use-case proof points (PRD §4.3 / §5 trust signals). The stat is the headline;
// the arrow in "3 days → 3 hrs" is content, not decoration.
type UseCase = { stat: string; title: string; copy: string }

const USE_CASES: UseCase[] = [
  {
    stat: '3 days → 3 hrs',
    title: 'Monthly report prep',
    copy: 'End-to-end automation of financial report assembly at one district.',
  },
  {
    stat: '70%',
    title: 'HR form review',
    copy: 'Redundant review cut at a regional district through workflow redesign.',
  },
  {
    stat: '98%',
    title: 'Rollout satisfaction',
    copy: 'AI consulting engagements rated across districts and departments.',
  },
]

// Engagement process (design/site/solutions.jsx). Assess → Map → Build → Embed.
type ProcessStep = { title: string; copy: string }

const PROCESS_STEPS: ProcessStep[] = [
  { title: 'Assess', copy: '30-min free intro call. We listen, you sketch the pain.' },
  { title: 'Map', copy: 'We sit with your team. Document the current workflow.' },
  { title: 'Build', copy: 'Design and implement the automation. Iterate weekly.' },
  { title: 'Embed', copy: 'Hand-off (Mode 1) or embedded engineer (Mode 2).' },
]

export default function ConsultingPage() {
  const serverURL = getServerURL()

  // schema.org Service for the consulting offering (PRD §10.1, review invariant a)
  // — in addition to the site-wide Organization node emitted by the frontend
  // layout. Absolute URLs so it never renders relative on deployed pages.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'flowlyst AI & Automation Consulting',
    serviceType: 'K–12 school district AI & automation consulting',
    description:
      'Hands-on AI and automation consulting for K–12 public school districts — mapping and automating routine work across HR, the business office, and other central-office departments, delivered by former school CFOs and district leaders.',
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
        eyebrow="AI & Automation Consulting"
        title={
          <>
            Peer-to-peer consulting from <em>former school CFOs.</em>
          </>
        }
        lead="Hands-on engagements that map and automate routine work across district operations. Not generalist ed-tech — operators who used to run your office."
        primaryCta="Free 30-min assessment"
        primaryHref="/contact"
        secondaryCta="See case studies"
        secondaryHref="/case-studies"
        badges={['98% rollout satisfaction', 'Embedded engineers', 'McKinsey-style depth']}
        visual={<ConsultingHeroArt />}
      />

      {/* TWO ENGAGEMENT MODES (PRD §4.3): targeted projects vs. embedded,
          McKinsey-style transformation. */}
      <section className="section" data-testid="consulting-modes">
        <div className="container">
          <SectionHead
            eyebrow="Two ways to engage"
            title={
              <>
                Pick one. Or <em>start small</em> and grow into the other.
              </>
            }
          />
          <div className="grid-2" style={{ gap: 24 }}>
            {MODES.map((m) => (
              <div key={m.num} className="card" style={{ padding: 40 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 20,
                  }}
                >
                  <div className="eyebrow">{m.tag}</div>
                  <div
                    style={{
                      fontSize: 40,
                      fontWeight: 300,
                      color: 'rgba(0,0,0,0.18)',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {m.num}
                  </div>
                </div>
                <h3 className="h3" style={{ marginBottom: 16 }}>
                  {m.title}
                </h3>
                <p className="p" style={{ marginBottom: 28, fontSize: 16 }}>
                  {m.copy}
                </p>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'grid',
                    gap: 10,
                    borderTop: '1px solid var(--c-cream-2)',
                    paddingTop: 24,
                  }}
                >
                  {m.points.map((p) => (
                    <li key={p} style={{ display: 'flex', gap: 12, fontSize: 14, fontWeight: 600 }}>
                      <span className="accent" aria-hidden="true" style={{ fontWeight: 800 }}>
                        →
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTMENTS SERVED (PRD §4.3): every central-office function plus its
          school-level extensions — the pattern of routine work, not a department. */}
      <section className="section section--cream" data-testid="consulting-departments">
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
                Departments served
              </div>
              <h2 className="h2" style={{ marginBottom: 32 }}>
                If it’s <em>routine and repeatable,</em> it’s in scope.
              </h2>
              <p className="lead">
                Every central office function and its school-level extensions. We target the pattern
                of routine work — not a particular department.
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 0,
                background: '#fff',
                borderRadius: 4,
                border: '1px solid var(--c-cream-2)',
              }}
            >
              {DEPARTMENTS.map((d, i) => (
                <div
                  key={d}
                  style={{
                    padding: '22px 24px',
                    fontSize: 16,
                    fontWeight: 700,
                    borderRight: i % 2 === 0 ? '1px solid var(--c-cream-2)' : 'none',
                    borderBottom: i < 6 ? '1px solid var(--c-cream-2)' : 'none',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* USE-CASE PROOF (PRD §4.3 / §5): stat-led cards districts report back. */}
      <section className="section" data-testid="consulting-usecases">
        <div className="container">
          <SectionHead
            eyebrow="What we’ve shipped"
            title={
              <>
                The numbers <em>districts report back</em> to us.
              </>
            }
          />
          <div className="grid-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="card">
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: 'var(--fl-green)',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    marginBottom: 24,
                  }}
                >
                  {u.stat}
                </div>
                <h3 className="h4" style={{ marginBottom: 12, fontSize: 20 }}>
                  {u.title}
                </h3>
                <p className="p" style={{ fontSize: 14 }}>
                  {u.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS: how an engagement runs — Assess → Map → Build → Embed. */}
      <section className="section" data-testid="consulting-process">
        <div className="container">
          <SectionHead
            eyebrow="Process"
            title={
              <>
                How an <em>engagement</em> runs.
              </>
            }
          />
          <div className="grid-4">
            {PROCESS_STEPS.map((s, i) => (
              <div key={s.title} style={{ position: 'relative' }}>
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 300,
                    color: 'var(--c-cream-2)',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    marginBottom: 12,
                  }}
                >
                  0{i + 1}
                </div>
                <h3 className="h4" style={{ marginBottom: 12, fontSize: 22 }}>
                  {s.title}
                </h3>
                <p className="p" style={{ fontSize: 15 }}>
                  {s.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational elements ----------------
// Consulting-specific (not shared with the sibling pages). Ported verbatim from
// design/site/solutions.jsx `ConsultingHeroArt`; inline styles reference brand
// tokens / the design source's own rgba values (no invented values).

// "Automation map · sample" — a sample of in-flight automations with progress
// bars, the visual companion to the McKinsey-style-depth positioning.
type AutomationRow = { label: string; pct: number; status: string }

const AUTOMATION_MAP: AutomationRow[] = [
  { label: 'HR onboarding', pct: 85, status: 'Live' },
  { label: 'AP invoice triage', pct: 62, status: 'Building' },
  { label: 'Monthly close', pct: 100, status: 'Live' },
  { label: 'Grant reporting', pct: 30, status: 'Mapping' },
  { label: 'Board memo draft', pct: 45, status: 'Designing' },
]

function ConsultingHeroArt() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--c-cream-2)',
        borderRadius: 4,
        padding: 32,
        boxShadow: '0 24px 60px -16px rgba(14,20,16,0.10)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--fl-green-700)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}
      >
        Automation map · sample
      </div>
      {AUTOMATION_MAP.map((row) => (
        <div key={row.label} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-ink)' }}>
              {row.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: row.status === 'Live' ? 'var(--fl-green-700)' : 'var(--c-ink-3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {row.status}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--c-cream)', borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                width: row.pct + '%',
                background: 'var(--fl-green)',
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
