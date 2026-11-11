import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'

import { FinalCTA } from '@/components/FinalCTA'
import { SolutionHero } from '@/components/solutions/SolutionHero'
import { SectionHead } from '@/components/solutions/SectionHead'
import { TrainingRosterArt } from '@/components/solutions/TrainingRosterArt'
import { TrainingTestimonials } from '@/components/solutions/TrainingTestimonials'
import {
  LEADERS_TRAINED,
  SCHOOL_FAQ,
  STATES_COUNT,
  TRAINED_STATES,
  TRAINING_RESULTS,
  TRAINING_VENUES,
} from '@/content/training'
import config from '@/payload.config'
import { buildFaqPageSchema } from '@/utilities/faqSchema'
import { getServerURL } from '@/utilities/serverURL'
import { serializeJsonLd } from '@/utilities/jsonLd'
import { SOCIAL_IMAGE } from '@/utilities/socialImage'

/**
 * AI Training solution page (`/solutions/ai-training`, PRD §4.2 / §3.4 / §7 / §11):
 * training for school district business offices, built from
 * `design/site/solutions.jsx` `TrainingPage`.
 *
 * Fully server-rendered: every crawlable string is in the initial HTML, no
 * client-only content (PRD §10.1, review invariant a). Nav / Footer come from the
 * frontend layout; this page owns its single H1 (the hero) and the closing
 * FinalCTA band. Testimonials come from the CMS and the query stays in this
 * top-level async function so the int tests can render the page.
 */

export const revalidate = 60

const CANONICAL_PATH = '/solutions/ai-training'

const PAGE_TITLE = 'AI Training for School District Business Offices — flowlyst'
const PAGE_DESCRIPTION =
  'Hands-on AI training for school district business offices: accounts payable, payroll, HR, purchasing, budget, CFOs, grants, board secretaries and superintendents. On-site in any US state or virtual.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    images: [SOCIAL_IMAGE],
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_PATH,
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    images: [SOCIAL_IMAGE.url],
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

// ---- Static content (design/site/solutions.jsx `TrainingPage`) ----

// Roles in the room (issue #156): the business office, plus leadership.
type Role = { title: string; sub: string }

const ROLES: Role[] = [
  { title: 'Accounts payable', sub: 'Vendor emails, PO and vendor spend analysis' },
  { title: 'Payroll', sub: 'Excel formulas and repeatable reports' },
  { title: 'HR & benefits', sub: 'Policy drafts and redlines' },
  { title: 'Purchasing & procurement', sub: 'PO and vendor spend analysis' },
  { title: 'Budget', sub: 'Budget-vs-actual dashboards' },
  {
    title: 'Business administrators, CFOs & treasurers',
    sub: 'Board memos and monthly variance summaries',
  },
  { title: 'Grants', sub: 'Grant narrative drafts' },
  { title: 'District clerks & board secretaries', sub: 'A board minutes workflow' },
  { title: 'Superintendents & cabinet', sub: 'Drafting a district AI rollout' },
]

// Hero roster rows (illustrative).
const ROSTER_ROWS = [
  { name: 'Superintendent', task: 'Drafting a 3-month AI rollout' },
  { name: 'CFO', task: 'Prompt: monthly variance summary' },
  { name: 'HR Director', task: 'Auto-classifying form submissions' },
  { name: 'IT Director', task: 'Setting up the prompt library' },
]

const RESULT_STATS = [
  {
    stat: `${TRAINING_RESULTS.improvedPct}%`,
    label: `Confidence rose for ${TRAINING_RESULTS.improvedPct}% of attendees (${TRAINING_RESULTS.improved} of ${TRAINING_RESULTS.surveyed} surveyed)`,
  },
  {
    stat: `${TRAINING_RESULTS.avgBefore} → ${TRAINING_RESULTS.avgAfter}`,
    label: `Average confidence ${TRAINING_RESULTS.avgBefore} → ${TRAINING_RESULTS.avgAfter} out of 5`,
  },
  { stat: `${STATES_COUNT}`, label: `Attendees from ${STATES_COUNT} states` },
  {
    stat: `${TRAINING_RESULTS.positiveFeedbackPct}%`,
    label: `${TRAINING_RESULTS.positiveFeedbackPct}% positive feedback from ${TRAINING_RESULTS.surveyed} attendee responses`,
  },
]

// Delivery formats (PRD §4.2 fixed list). Conceptual "how training runs" rows —
// not CMS program records.
type Format = { num: string; tag: string; title: string; copy: string }

const FORMATS: Format[] = [
  {
    num: '01',
    tag: 'Half / full day',
    title: 'Single workshop',
    copy: 'One workshop, deep on one theme. Best for a half-day PD slot.',
  },
  {
    num: '02',
    tag: 'Webinar series',
    title: 'Paced multi-session',
    copy: 'Sessions paced over weeks. Better retention; works around district calendars.',
  },
  {
    num: '03',
    tag: 'Institute',
    title: 'Summer/fall institute',
    copy: 'Custom multi-day packages. Departmental tracks, optional certification.',
  },
  {
    num: '04',
    tag: 'In-person · virtual · hybrid',
    title: 'Whatever your district needs',
    copy: 'We meet you where the district is. Hybrid is increasingly the default.',
  },
]

// What's included in every session (PRD §4.2).
const INCLUDED: Array<{ title: string; copy: string }> = [
  {
    title: 'Customized content',
    copy: 'Finance, HR, IT, leadership — district picks the focus.',
  },
  {
    title: 'Real-world use cases',
    copy: 'Automating reports. Writing AI prompts. Analyzing data your staff actually has.',
  },
  {
    title: 'Hands-on delivery',
    copy: 'Laptops out. We build things together; you leave with completed work.',
  },
  {
    title: 'Post-training toolkit',
    copy: 'Printable guides + prompt templates licensed for the whole district.',
  },
]

// Sample half-day agenda (illustrative — labelled "Sample · half-day" in the
// design). Fixed clock-slot content, not CMS module records.
type AgendaRow = { time: string; title: string; desc: string }

const AGENDA: AgendaRow[] = [
  {
    time: '9:00 – 9:30',
    title: 'AI in K-12',
    desc: 'Where it is, where it isn’t — without the marketing.',
  },
  {
    time: '9:30 – 10:30',
    title: 'Hands-on prompt building',
    desc: 'Write a prompt that drafts a board memo from your last set of minutes.',
  },
  {
    time: '10:30 – 10:45',
    title: 'Break',
    desc: 'Coffee, and one AI tip from last week’s work.',
  },
  {
    time: '10:45 – 12:00',
    title: 'Use case clinic',
    desc: 'Bring a problem from your office. We map automation paths together.',
  },
  {
    time: '12:00 – 12:30',
    title: 'Toolkit handoff + 30-day plan',
    desc: 'Prompt cards, follow-up calendar, your district’s next three moves.',
  },
]

export default async function AiTrainingPage() {
  const serverURL = getServerURL()

  const payload = await getPayload({ config })
  // `overrideAccess: false` applies `publishedOrStaff`, so drafts never reach the page.
  const testimonialResult = await payload.find({
    collection: 'testimonials',
    where: {
      and: [{ status: { equals: 'published' } }, { serviceCategory: { equals: 'ai-training' } }],
    },
    overrideAccess: false,
    depth: 0,
    limit: 24,
    sort: '-createdAt',
  })

  // schema.org Service for the AI training offering (PRD §10.1, review invariant
  // a) — in addition to the site-wide Organization node emitted by the frontend
  // layout. Absolute URLs so it never renders relative on deployed pages.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'flowlyst AI Training for School Districts',
    serviceType: 'AI training for K–12 school district business offices',
    description:
      'Hands-on AI training for the staff of K–12 school district business offices: accounts payable, payroll, HR and benefits, purchasing and procurement, budget, business administrators, CFOs and treasurers, grants, district clerks and board secretaries, plus superintendents and cabinet. Delivered on-site in any US state or virtual.',
    url: `${serverURL}${CANONICAL_PATH}`,
    areaServed: { '@type': 'Country', name: 'United States' },
    provider: {
      '@type': 'Organization',
      name: 'flowlyst',
      url: serverURL,
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'K–12 public school district business office staff and leadership',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqPageSchema(SCHOOL_FAQ)) }}
      />

      <SolutionHero
        eyebrow="AI Training · for School District Business Offices"
        title={
          <>
            AI training that <em>sticks the next day.</em>
          </>
        }
        lead={`Hands-on workshops for the whole business office, from accounts payable to the CFO. ${LEADERS_TRAINED} leaders trained so far, on-site in any US state, or virtual.`}
        primaryCta="Book a 15-min discussion"
        primaryHref="/contact?reason=training"
        secondaryCta="See sample agenda"
        secondaryHref="#agenda"
        badges={[
          `${TRAINING_RESULTS.positiveFeedbackPct}% positive feedback`,
          `${TRAINING_RESULTS.improvedPct}% gained confidence`,
          `Attendees from ${STATES_COUNT} states`,
        ]}
        visual={
          <TrainingRosterArt label="Sample workshop · what each role builds" rows={ROSTER_ROWS} />
        }
      />

      {/* ROLES — who the training is for; explicitly not students (PRD §4.2). */}
      <section className="section" data-testid="training-audiences">
        <div className="container">
          <SectionHead
            eyebrow="Who’s in the room"
            title={
              <>
                For the office that <em>runs the district</em> — not for students.
              </>
            }
            kicker="Training is for the business office and district leadership. Districts can bring school-level staff when relevant."
          />
          <div className="grid-3">
            {ROLES.map((r, i) => (
              <div key={r.title} className="card">
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--fl-green-700)',
                    marginBottom: 12,
                    letterSpacing: '0.08em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="h4" style={{ marginBottom: 8 }}>
                  {r.title}
                </h3>
                <p className="p" style={{ fontSize: 14 }}>
                  {r.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHERE — any US state, on-site or virtual, and where it has run. */}
      <section className="section section--cream" data-testid="training-where">
        <div className="container">
          <SectionHead
            eyebrow="Where we’ve trained"
            title={
              <>
                On-site in any US state, <em>or virtual.</em>
              </>
            }
            kicker="Attendees have come from the states below, through state associations, national events and district-hosted sessions."
          />
          <h3 className="h4" style={{ marginBottom: 16 }}>
            States
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            {TRAINED_STATES.map((state) => (
              <span key={state} className="chip">
                {state}
              </span>
            ))}
          </div>
          <h3 className="h4" style={{ marginBottom: 16 }}>
            Associations and districts
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TRAINING_VENUES.map((venue) => (
              <span key={venue} className="chip chip--green">
                {venue}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS — measured from post-session surveys. */}
      <section
        className="section--green"
        style={{ padding: '120px 56px' }}
        data-testid="training-results"
      >
        <div className="container">
          <div className="stat-band__grid" style={{ '--stat-band-cols': 4 } as React.CSSProperties}>
            {RESULT_STATS.map((p) => (
              <div
                key={p.stat + p.label}
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
                <p style={{ marginTop: 16, lineHeight: 1.5 }}>{p.label}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 40 }}>
            {`From ${TRAINING_RESULTS.surveyed} post-session surveys across ${TRAINING_RESULTS.sessions} sessions.`}
          </p>
        </div>
      </section>

      {/* DELIVERY FORMATS — tabular (PRD §4.2 fixed list). */}
      <section className="section" data-testid="training-formats">
        <div className="container">
          <SectionHead
            eyebrow="Delivery formats"
            title={
              <>
                How training <em>runs.</em>
              </>
            }
          />
          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {FORMATS.map((o) => (
              <div key={o.num} className="t-row t-row--light">
                <div className="t-row__num">{o.num}</div>
                <div className="t-row__tag">{o.tag}</div>
                <div>
                  <h3 className="t-row__title">{o.title}</h3>
                  <p className="t-row__copy">{o.copy}</p>
                </div>
                <div />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED — checklist + toolkit visual (PRD §4.2). */}
      <section className="section section--cream" data-testid="training-included">
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
                Every session ships with
              </div>
              <h2 className="h2" style={{ marginBottom: 40 }}>
                Hands-on. <em>No fluff.</em>
              </h2>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gap: 20,
                }}
              >
                {INCLUDED.map((item) => (
                  <li
                    key={item.title}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr',
                      gap: 16,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: 'var(--fl-green)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      ✓
                    </span>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
                        {item.title}
                      </div>
                      <div className="p" style={{ fontSize: 15 }}>
                        {item.copy}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <TrainingToolkitArt />
          </div>
        </div>
      </section>

      {/* SAMPLE AGENDA — illustrative half-day timeline (secondary CTA target). */}
      <section id="agenda" className="section" data-testid="training-agenda">
        <div className="container">
          <SectionHead
            eyebrow="Sample · half-day"
            title={
              <>
                What <em>a half-day</em> looks like.
              </>
            }
          />
          <div
            style={{
              display: 'grid',
              gap: 0,
              maxWidth: 900,
              margin: '0 auto',
              borderTop: '1px solid var(--c-cream-2)',
            }}
          >
            {AGENDA.map((row) => (
              <div
                key={row.time}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  gap: 32,
                  padding: '28px 0',
                  borderBottom: '1px solid var(--c-cream-2)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    color: 'var(--c-ink-3)',
                    fontWeight: 700,
                    paddingTop: 4,
                  }}
                >
                  {row.time}
                </div>
                <div>
                  {/* h3 (not h4) so the agenda titles nest under the section h2
                      without a heading-level skip (WCAG 2.1 AA / axe
                      heading-order); the `.h4` class keeps the design's visual
                      size — heading level is semantics, not style. */}
                  <h3 className="h4" style={{ marginBottom: 6 }}>
                    {row.title}
                  </h3>
                  <p className="p" style={{ fontSize: 15 }}>
                    {row.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrainingTestimonials
        testimonials={testimonialResult.docs}
        testid="training-testimonials"
        eyebrow="What attendees say"
        title={
          <>
            From the people <em>in the room.</em>
          </>
        }
      />

      {/* Q&A — every question and answer is visible and mirrored in the FAQPage JSON-LD. */}
      <section className="section" data-testid="training-faq">
        <div className="container">
          <SectionHead
            eyebrow="Questions"
            title={
              <>
                Questions we <em>get asked.</em>
              </>
            }
          />
          <div style={{ display: 'grid', gap: 32, maxWidth: 900 }}>
            {SCHOOL_FAQ.map((item) => (
              <div key={item.question}>
                <h3 className="h4" style={{ marginBottom: 8 }}>
                  {item.question}
                </h3>
                <p className="p">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            style={{
              padding: 24,
              background: 'var(--c-cream)',
              borderRadius: 4,
              fontSize: 14,
              color: 'var(--c-ink-2)',
            }}
          >
            Training a company team? See{' '}
            <Link href="/solutions/corporate-ai-training">corporate AI training</Link>.
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational elements ----------------
// Ported from design/site/solutions.jsx `TrainingToolkitArt`; inline styles
// reference brand tokens / the design source's own values (no invented values).

// "What's included" visual — the post-training prompt toolkit, tiled by department.
function TrainingToolkitArt() {
  const cards = [
    { title: 'Board memo prompt', tag: 'Finance' },
    { title: 'Meeting summary', tag: 'Admin' },
    { title: 'Policy redline', tag: 'HR' },
    { title: 'Data Q&A starter', tag: 'Ops' },
    { title: 'Vendor email triage', tag: 'AP' },
    { title: 'Grant narrative draft', tag: 'Grants' },
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
        Post-training toolkit
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.title} style={{ padding: 16, background: 'var(--c-cream)', borderRadius: 4 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--fl-green-700)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {c.tag}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
