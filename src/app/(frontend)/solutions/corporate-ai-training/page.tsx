import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'

import { SolutionHero } from '@/components/solutions/SolutionHero'
import { SectionHead } from '@/components/solutions/SectionHead'
import { TrainingRosterArt } from '@/components/solutions/TrainingRosterArt'
import { TrainingTestimonials } from '@/components/solutions/TrainingTestimonials'
import config from '@/payload.config'
import { getServerURL } from '@/utilities/serverURL'
import { serializeJsonLd } from '@/utilities/jsonLd'
import { SOCIAL_IMAGE } from '@/utilities/socialImage'

/**
 * Corporate AI Training (`/solutions/corporate-ai-training`, issue #156): the same
 * hands-on training as the school-district page, for company teams. Server-rendered;
 * testimonials come from the CMS (`corporate-training` category) and the query stays
 * in this top-level async function so the int tests can render the page.
 */

export const revalidate = 60

const CANONICAL_PATH = '/solutions/corporate-ai-training'

const PAGE_TITLE = 'Corporate AI Training for Teams — flowlyst'
const PAGE_DESCRIPTION =
  'Hands-on AI training for corporate teams: operations, finance and accounting, HR, sales and marketing, executive assistants, trading and commodity operations, and real estate agents. On-site or virtual.'

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

const ROLES: Array<{ title: string; sub: string }> = [
  { title: 'Operations', sub: 'Meeting notes, follow-ups and repeatable workflows' },
  { title: 'Finance & accounting', sub: 'Excel formulas, dashboards and spend analysis' },
  { title: 'HR', sub: 'Policy drafts and communications' },
  { title: 'Sales & marketing', sub: 'Proposals and case studies in your voice' },
  { title: 'Executive assistants & admin', sub: 'Briefs, summaries and scheduling-ready drafts' },
  { title: 'Trading & commodity operations', sub: 'Data validation and workflow automation' },
  { title: 'Real estate agents', sub: 'Listings, client emails and follow-ups' },
]

const ROSTER_ROWS = [
  { name: 'Finance', task: 'Dynamic Excel formulas, built step by step' },
  { name: 'Operations', task: 'Meeting notes to follow-up email' },
  { name: 'HR', task: 'Policy drafts in Canvas' },
  { name: 'Sales & marketing', task: 'Proposals and case studies in your voice' },
]

const COVERS: Array<{ title: string; copy: string }> = [
  {
    title: 'A prompt structure that works',
    copy: 'Title, Assign a task, Define direction, Ask for questions. Four steps people remember the next day.',
  },
  {
    title: 'A prompt engineer agent',
    copy: 'Build an agent that writes and improves your prompts for you.',
  },
  {
    title: 'Projects, Custom GPTs, Gems and Copilot agents',
    copy: 'Set up a reusable assistant in the tool your company already uses.',
  },
  {
    title: 'Deep Research and NotebookLM',
    copy: 'Research a topic or work from your own documents, with sources you can check.',
  },
  {
    title: 'Excel and dashboards',
    copy: 'Generate formulas and build budget-vs-actual style dashboards without the guesswork.',
  },
  {
    title: 'Data guardrails',
    copy: 'Public data is fine in consumer tools. Sensitive data needs enterprise-grade subscriptions. Anonymize before processing, and read every output.',
  },
]

const FORMATS: Array<{ num: string; tag: string; title: string; copy: string }> = [
  {
    num: '01',
    tag: '90 min – 2 hours',
    title: 'Workshop',
    copy: 'A focused session on one theme, with live demos and hands-on activities.',
  },
  {
    num: '02',
    tag: 'Half day',
    title: 'Half-day session',
    copy: 'Room to build real work with your own documents, using dummy data where it is sensitive.',
  },
  {
    num: '03',
    tag: 'Full day',
    title: 'Full-day session',
    copy: 'Several workflows end to end, by role.',
  },
  {
    num: '04',
    tag: 'On-site · virtual',
    title: 'Wherever your team is',
    copy: 'Laptops required for hands-on sessions. Activities work with ChatGPT, Claude, Gemini and Copilot.',
  },
]

export default async function CorporateAiTrainingPage() {
  const serverURL = getServerURL()

  const payload = await getPayload({ config })
  const testimonialResult = await payload.find({
    collection: 'testimonials',
    where: {
      and: [
        { status: { equals: 'published' } },
        { serviceCategory: { equals: 'corporate-training' } },
      ],
    },
    overrideAccess: false,
    depth: 0,
    limit: 24,
    sort: '-createdAt',
  })

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'flowlyst Corporate AI Training',
    serviceType: 'AI training for corporate teams',
    description:
      'Hands-on AI training for corporate teams: operations, finance and accounting, HR, sales and marketing, executive assistants and admin, trading and commodity operations, and real estate agents. Delivered on-site or virtual.',
    url: `${serverURL}${CANONICAL_PATH}`,
    areaServed: { '@type': 'Country', name: 'United States' },
    provider: {
      '@type': 'Organization',
      name: 'flowlyst',
      url: serverURL,
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Corporate teams',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceSchema) }}
      />

      <SolutionHero
        eyebrow="AI Training · for Corporate Teams"
        title={
          <>
            AI training your team <em>uses the same day.</em>
          </>
        }
        lead="Hands-on workshops for the teams that run a company, from operations and finance to sales and real estate. On-site or virtual."
        primaryCta="Book a 15-min discussion"
        primaryHref="/contact?reason=training"
        secondaryCta="What a session covers"
        secondaryHref="#covers"
        badges={[
          'On-site or virtual',
          'Hands-on, laptops out',
          'ChatGPT · Claude · Gemini · Copilot',
        ]}
        visual={
          <TrainingRosterArt label="Sample workshop · what each team builds" rows={ROSTER_ROWS} />
        }
      />

      <section className="section" data-testid="corporate-roles">
        <div className="container">
          <SectionHead
            eyebrow="Who’s in the room"
            title={
              <>
                For the teams <em>doing the work.</em>
              </>
            }
          />
          <div className="grid-4">
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

      <section id="covers" className="section section--cream" data-testid="corporate-covers">
        <div className="container">
          <SectionHead
            eyebrow="What a session covers"
            title={
              <>
                Hands-on. <em>Tool-agnostic.</em>
              </>
            }
          />
          <div className="grid-3">
            {COVERS.map((c) => (
              <div key={c.title} className="card">
                <h3 className="h4" style={{ marginBottom: 12 }}>
                  {c.title}
                </h3>
                <p className="p" style={{ fontSize: 14 }}>
                  {c.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" data-testid="corporate-formats">
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

      <TrainingTestimonials
        testimonials={testimonialResult.docs}
        testid="corporate-testimonials"
        eyebrow="What attendees say"
        title={
          <>
            From the people <em>in the room.</em>
          </>
        }
      />

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
            Training a school district business office? See{' '}
            <Link href="/solutions/ai-training">AI training for school districts</Link>.
          </div>
        </div>
      </section>

      <section
        className="section--green"
        style={{ padding: '160px 56px', textAlign: 'center' }}
        data-testid="corporate-final-cta"
      >
        <div className="container">
          <h2 className="h1" style={{ color: '#fff', maxWidth: 1080, margin: '0 auto 32px' }}>
            Bring AI training to <span className="accent--yellow">your team.</span>
          </h2>
          <p style={{ lineHeight: 1.5, margin: '0 auto 48px', maxWidth: '52ch' }}>
            A 15-minute conversation about your team and what you want them to be able to do.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact?reason=training" className="btn btn--dark btn--lg">
              Book a 15-min discussion{' '}
              <span className="arr" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
