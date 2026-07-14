import React from 'react'
import type { Metadata } from 'next'

import { FinalCTA } from '@/components/FinalCTA'
import { SolutionHero } from '@/components/solutions/SolutionHero'
import { SectionHead } from '@/components/solutions/SectionHead'
import { SpeakingRequestForm } from '@/components/solutions/SpeakingRequestForm'
import { getServerURL } from '@/utilities/serverURL'

/**
 * Keynotes solution page (`/solutions/keynotes`, PRD §4.4 / §7). Aziz Aghayev's
 * speaking offering — positioned distinct from AI Training (§4.2): different
 * audience (event attendees), format (a single talk), and booking path (an event
 * organizer submits a speaking request). Built against the settled design
 * `design/site/solutions.jsx` `KeynotesPage`.
 *
 * Fully server-rendered: every crawlable string is in the initial HTML (PRD §10.1,
 * review invariant a). The page carries no CMS-driven content, so it renders
 * statically for a fast LCP; the ONLY client island is the speaking-request form
 * (SpeakingRequestForm), whose surrounding heading and lead stay server-rendered.
 * Nav / Footer come from the frontend layout; this page owns its single H1 (the
 * hero) and the closing FinalCTA band.
 */

const CANONICAL_PATH = '/solutions/keynotes'

const PAGE_TITLE = 'Keynote Speaker on AI in K–12 — flowlyst'
const PAGE_DESCRIPTION =
  'Book Aziz Aghayev to keynote your event on AI for K–12 school business officials, district finance modernization, and school operations. Past venues: ASBO International, NJASBO, CPS.'

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

// Past venues (PRD §4.4 / §5) — exactly the three attributable to Aziz; listing
// more (e.g. AASA, which the PRD names as an audience example, not a venue) would
// overclaim a real person's speaking history. A 3-column row that collapses
// responsively via `.stat-band__grid` (--stat-band-cols: 3).
const VENUES = ['ASBO International', 'NJASBO', 'CPS'] as const

// Topics Aziz speaks on (PRD §4.4). Tabular rows, mirroring the design.
type Topic = { num: string; tag: string; title: string; copy: string }
const TOPICS: Topic[] = [
  {
    num: '01',
    tag: '45–60 min',
    title: 'AI for K-12 school business officials',
    copy: 'Practical AI for the office that runs the district — without the marketing.',
  },
  {
    num: '02',
    tag: 'Keynote',
    title: 'Automating district finance & ops',
    copy: 'What to automate first, what to leave alone, what comes next.',
  },
  {
    num: '03',
    tag: 'Workshop track',
    title: 'AI adoption for school leaders',
    copy: 'Policy, change management, and getting your team on board — from someone who has.',
  },
]

// Who books keynotes (PRD §4.4 audiences).
const AUDIENCES: Array<{ title: string; copy: string }> = [
  { title: 'State & national associations', copy: 'ASBO International, AASA, NSBA.' },
  { title: 'District-hosted summits', copy: 'Internal leadership convenings.' },
  { title: 'Regional service-agency PD', copy: 'County offices, ESCs, BOCES.' },
  { title: 'School finance conferences', copy: 'CPS, NJASBO, others.' },
]

export default function KeynotesPage() {
  const serverURL = getServerURL()

  // schema.org Service for the keynotes offering (PRD §10.1, review invariant a) —
  // in addition to the site-wide Organization node emitted by the frontend layout.
  // Absolute URL so it never renders relative on deployed pages.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'flowlyst Keynotes & Conference Sessions',
    serviceType: 'Keynote speaking on AI in K–12 administration and school finance',
    description:
      'Keynotes and conference sessions by Aziz Aghayev on AI for K–12 school business officials, district finance modernization, and the future of school operations.',
    url: `${serverURL}${CANONICAL_PATH}`,
    areaServed: 'US',
    provider: {
      '@type': 'Organization',
      name: 'flowlyst',
      url: serverURL,
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'K–12 associations, districts, and school finance conferences',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <SolutionHero
        eyebrow="Keynotes & conference sessions"
        title={
          <>
            A keynote on AI in K-12, <em>from someone who’s rolled it out.</em>
          </>
        }
        lead="Aziz Aghayev — a former school CFO with 15+ years in K-12 finance, now flowlyst’s founder — speaks at state and national association events on AI for K-12 administrators, school finance modernization, and district operations."
        primaryCta="Submit a speaking request"
        primaryHref="#request"
        secondaryCta="Meet Aziz"
        secondaryHref="/about"
        badges={['ASBO International', 'NJASBO · CPS', '3-day response']}
        visual={<KeynoteHeroArt />}
      />

      {/* PAST VENUES — 3-column row, responsive via stat-band__grid. */}
      <section className="section section--cream" data-testid="keynotes-venues">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              Past venues
            </div>
          </div>
          <div className="stat-band__grid" style={{ '--stat-band-cols': 3 } as React.CSSProperties}>
            {VENUES.map((venue) => (
              <div
                key={venue}
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  background: '#fff',
                  border: '1px solid var(--c-cream-2)',
                  borderRadius: 4,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                }}
              >
                {venue}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOPICS — tabular rows. */}
      <section className="section section--cream" data-testid="keynotes-topics">
        <div className="container">
          <SectionHead
            eyebrow="Topics"
            title={
              <>
                What Aziz <em>speaks on.</em>
              </>
            }
          />
          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {TOPICS.map((t) => (
              <div key={t.num} className="t-row t-row--light">
                <div className="t-row__num">{t.num}</div>
                <div className="t-row__tag">{t.tag}</div>
                <div>
                  <h3 className="t-row__title">{t.title}</h3>
                  <p className="t-row__copy">{t.copy}</p>
                </div>
                <div />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCES — who books these. */}
      <section className="section" data-testid="keynotes-audiences">
        <div className="container">
          <SectionHead
            eyebrow="Who books these"
            title={
              <>
                Audiences we <em>speak to.</em>
              </>
            }
          />
          <div className="grid-4">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="card">
                <h3 className="h4" style={{ marginBottom: 8 }}>
                  {a.title}
                </h3>
                <p className="p" style={{ fontSize: 14 }}>
                  {a.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST FORM — heading + lead are server-rendered; only the form is a
          client island (review invariant a). */}
      <section id="request" className="section section--cream" data-testid="keynotes-request">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr',
              gap: 80,
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div className="eyebrow mb-32">Request a keynote</div>
              <h2 className="h2" style={{ marginBottom: 24 }}>
                Tell us about <em>your event.</em>
              </h2>
              <p className="lead">
                We’ll come back within 3 business days with availability and topic-fit. Aziz
                responds personally to event organizers.
              </p>
            </div>
            <SpeakingRequestForm />
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational element ----------------
// Keynote-specific (not shared with the sibling pages). Ported verbatim from
// design/site/solutions.jsx `KeynoteHeroArt`; inline styles reference brand tokens
// / the design source's own rgba values (no invented values). Decorative — the SVG
// stage scene is aria-hidden.

function KeynoteHeroArt() {
  return (
    <div
      style={{
        background: 'var(--c-forest-2)',
        border: '1px solid var(--c-forest-3)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          aspectRatio: '16/10',
          position: 'relative',
          background: 'linear-gradient(160deg, #1a221c 0%, #0e1410 100%)',
        }}
      >
        <svg
          viewBox="0 0 400 250"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <rect x="0" y="180" width="400" height="70" fill="rgba(0,165,104,0.08)" />
          <rect x="60" y="160" width="280" height="20" fill="rgba(0,165,104,0.18)" />
          <ellipse cx="200" cy="100" rx="55" ry="64" fill="rgba(255,210,170,0.25)" />
          <path d="M 130 250 Q 130 170 200 162 Q 270 170 270 250 Z" fill="rgba(20,30,25,0.85)" />
          <rect x="0" y="0" width="400" height="80" fill="url(#keynote-spotlight)" />
          <defs>
            <radialGradient id="keynote-spotlight" cx="50%" cy="0" r="60%">
              <stop offset="0%" stopColor="rgba(255,233,160,0.35)" />
              <stop offset="100%" stopColor="rgba(255,233,160,0)" />
            </radialGradient>
          </defs>
        </svg>
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 20,
            color: 'rgba(244,241,232,0.55)',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          ASBO International · Keynote
        </div>
      </div>
    </div>
  )
}
