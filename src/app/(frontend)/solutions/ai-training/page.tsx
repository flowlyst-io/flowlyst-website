import React from 'react'
import type { Metadata } from 'next'

import { FinalCTA } from '@/components/FinalCTA'
import { SolutionHero } from '@/components/solutions/SolutionHero'
import { SectionHead } from '@/components/solutions/SectionHead'
import { getServerURL } from '@/utilities/serverURL'

/**
 * AI Training solution page (`/solutions/ai-training`, PRD §4.2 / §3.4 / §7 / §11),
 * built against the settled design `design/site/solutions.jsx` `TrainingPage`.
 *
 * Fully server-rendered: every crawlable string is in the initial HTML, no
 * client-only content (PRD §10.1, review invariant a). Nav / Footer come from the
 * frontend layout; this page owns its single H1 (the hero) and the closing
 * FinalCTA band.
 *
 * Statically rendered — every section is fixed content from the settled design, so
 * there is no `revalidate` / Payload query here (unlike the budget page, which
 * drives a featured testimonial from the CMS). The `TrainingPrograms` collection
 * models programs-with-modules (level, duration, ordered `modules[]`), which none
 * of this design's sections represent — see the task report's flagged decision.
 */

const CANONICAL_PATH = '/solutions/ai-training'

// Meta <title> carries the formal issue-#9 framing ("AI Training for District
// Leadership and Staff"); the design's on-page H1 stays "AI training that sticks
// the next day." and the formal framing rides in the hero eyebrow.
const PAGE_TITLE = 'AI Training for District Leadership and Staff — flowlyst'
const PAGE_DESCRIPTION =
  'Hands-on AI workshops for K–12 district leadership and staff — not students. Customized content, real use cases, and a toolkit licensed for your whole district.'

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

// ---- Static content (design/site/solutions.jsx `TrainingPage`) ----

// Audiences — "who's in the room" (PRD §4.2). Leadership + operational staff, plus
// school-level leaders when relevant; explicitly NOT students.
type Audience = { title: string; sub: string }

const AUDIENCES: Audience[] = [
  { title: 'Superintendents', sub: 'Asst. supts & chiefs of staff' },
  { title: 'Business managers', sub: 'CFOs and finance teams' },
  { title: 'HR & IT', sub: 'Directors and operational leads' },
  { title: 'Principals', sub: 'School-level instructional leaders' },
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
    title: 'Multi-session paced',
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
    desc: 'Coffee. We tell you the one thing we changed last week.',
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

export default function AiTrainingPage() {
  const serverURL = getServerURL()

  // schema.org Service for the AI training offering (PRD §10.1, review invariant
  // a) — in addition to the site-wide Organization node emitted by the frontend
  // layout. Absolute URLs so it never renders relative on deployed pages.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'flowlyst AI Training',
    serviceType: 'AI training for K–12 school district leadership and staff',
    description:
      'Customized, hands-on AI workshops for the leadership and staff of K–12 public school districts — superintendents, business managers, HR, IT, and principals. Delivered half-day, full-day, as a webinar series, or as a summer/fall institute, in person, virtual, or hybrid. Adaptable to other organizations.',
    url: `${serverURL}${CANONICAL_PATH}`,
    areaServed: 'US',
    provider: {
      '@type': 'Organization',
      name: 'flowlyst',
      url: serverURL,
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'K–12 public school district leadership and staff',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <SolutionHero
        eyebrow="AI Training · for District Leadership and Staff"
        title={
          <>
            AI training that <em>sticks the next day.</em>
          </>
        }
        lead="Customized workshops for the office that runs the district. Designed for K-12 leaders — adaptable to other organizations."
        primaryCta="Book a 15-min discussion"
        primaryHref="/contact"
        secondaryCta="See sample agenda"
        secondaryHref="#agenda"
        badges={['100% satisfaction', '2,000+ leaders trained', '500+ hours saved']}
        visual={<TrainingHeroArt />}
      />

      {/* AUDIENCES — who the training is for; explicitly not students (PRD §4.2). */}
      <section className="section" data-testid="training-audiences">
        <div className="container">
          <SectionHead
            eyebrow="Who’s in the room"
            title={
              <>
                For the office that <em>runs the district</em> — not for students.
              </>
            }
            kicker="Training is for administrators, leaders, and operational staff. Districts can bring school-level staff (principals, teachers) when relevant."
          />
          <div className="grid-4">
            {AUDIENCES.map((a, i) => (
              <div key={a.title} className="card">
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--fl-green-700)',
                    marginBottom: 12,
                    letterSpacing: '0.08em',
                  }}
                >
                  0{i + 1}
                </div>
                <h3 className="h4" style={{ marginBottom: 8 }}>
                  {a.title}
                </h3>
                <p className="p" style={{ fontSize: 14 }}>
                  {a.sub}
                </p>
              </div>
            ))}
          </div>
          {/* Adjacent non-K-12 clients — kept, but not leading (PRD §3.4). */}
          <div
            style={{
              marginTop: 32,
              padding: 24,
              background: 'var(--c-cream)',
              borderRadius: 4,
              fontSize: 14,
              color: 'var(--c-ink-2)',
            }}
          >
            <strong>Adjacent:</strong> roughly 10% of training clients are non-K-12 organizations.
            We adapt the curriculum without changing the depth.
          </div>
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
                What <em>four hours</em> looks like.
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
                  <h4 className="h4" style={{ marginBottom: 6 }}>
                    {row.title}
                  </h4>
                  <p className="p" style={{ fontSize: 15 }}>
                    {row.desc}
                  </p>
                </div>
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
// Training-specific (not shared with the sibling pages). Ported verbatim from
// design/site/solutions.jsx `TrainingHeroArt` / `TrainingToolkitArt`; inline
// styles reference brand tokens / the design source's own values (no invented
// values).

// Hero visual — a "workshop, live" roster of participants working through tasks.
function TrainingHeroArt() {
  const participants = [
    { name: 'Superintendent', task: 'Drafting a 3-month AI rollout', dur: '12 min', done: true },
    { name: 'CFO', task: 'Prompt: monthly variance summary', dur: '18 min', done: true },
    {
      name: 'HR Director',
      task: 'Auto-classifying form submissions',
      dur: 'In progress',
      done: false,
    },
    { name: 'IT Director', task: 'Setting up the prompt library', dur: 'Up next', done: false },
  ]
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
        Workshop · live
      </div>
      {participants.map((p, i) => (
        <div
          key={p.name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 0',
            borderTop: i === 0 ? '1px solid var(--c-line-2)' : 'none',
            borderBottom: '1px solid var(--c-line-2)',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-ink)' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--c-ink-2)', marginTop: 2 }}>{p.task}</div>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: p.done ? 'var(--fl-green-700)' : 'var(--c-ink-3)',
            }}
          >
            {p.dur}
          </div>
        </div>
      ))}
    </div>
  )
}

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
