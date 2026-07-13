import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { BlogPost, Testimonial } from '@/payload-types'
import { Mark } from '@/components/Mark'
import { FinalCTA } from '@/components/FinalCTA'

/**
 * Homepage (`/`) — the real page for issue #6, built against the settled design
 * `design/site/home.jsx` (composed with `design/site/site.jsx`). Fully
 * server-rendered: every crawlable string below is in the initial HTML, with no
 * client-only content (PRD §10.1, review invariant a).
 *
 * ISR: `revalidate` keeps the page statically rendered (good LCP) while letting
 * CMS edits — testimonials, blog posts, hero copy — appear within a minute without
 * a redeploy (PRD §9 "within minutes").
 */
export const revalidate = 60

export const metadata: Metadata = {
  title: 'flowlyst — Many tools, one platform for K–12 district budgeting',
  description:
    'flowlyst gives K–12 public school district leaders budgeting software, AI training, and consulting — built and delivered by former school CFOs and district leaders.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'flowlyst — Many tools, one platform for K–12 district budgeting',
    description:
      'Budgeting software, AI training, and consulting for K–12 public school districts, built by the people who used to do the job.',
    url: '/',
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'flowlyst — Many tools, one platform for K–12 district budgeting',
    description:
      'Budgeting software, AI training, and consulting for K–12 public school districts, built by the people who used to do the job.',
  },
}

const MARQUEE_ITEMS = ['ASBO International', 'NJASBO', 'CPS', 'AASA', 'WSPS', 'BSD']

const FLAGSHIP_FEATURES = [
  'Department entry & approvals',
  'Real-time GL actuals',
  'Salary projections',
  'Board-ready reports',
  'Pre-built dashboards',
  'Grants tracking',
]

type Offering = {
  num: string
  tag: string
  title: string
  copy: string
  cta: string
  href: string
}

const OFFERINGS: Offering[] = [
  {
    num: '01',
    tag: 'Software',
    title: 'Budget Software',
    copy: 'Department entry, real-time tracking, salary projections, board-ready reports — supplementary to your ERP.',
    cta: 'Request a demo',
    href: '/solutions/budget-software',
  },
  {
    num: '02',
    tag: 'Workshop',
    title: 'AI Training',
    copy: 'District-specific workshops for leadership and staff. 100% satisfaction across 2,000+ leaders.',
    cta: 'Book a discussion',
    href: '/solutions/ai-training',
  },
  {
    num: '03',
    tag: 'Engagement',
    title: 'Consulting',
    copy: 'Targeted automation projects or full McKinsey-style roadmaps with embedded engineers. 500+ admin hours saved.',
    cta: 'Free assessment',
    href: '/solutions/consulting',
  },
  {
    num: '04',
    tag: 'Speaking',
    title: 'Keynotes',
    copy: 'Aziz Aghayev on AI, school finance, and the future of district operations. ASBO International, NJASBO, CPS.',
    cta: 'Submit a request',
    href: '/solutions/keynotes',
  },
]

// Human-readable label for the blog teaser tag, keyed on the CMS service category.
const CATEGORY_LABEL: Record<BlogPost['serviceCategory'], string> = {
  'ai-training': 'AI Training',
  'budget-software': 'Budget Software',
  general: 'General',
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

// Attribution line for a testimonial card: role · organization (the design's form,
// names redacted on request), falling back to the client name if both are blank.
function testimonialAttribution(t: Testimonial): string {
  const parts = [t.roleTitle, t.organization].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' · ') : t.clientName
}

// Byline author; the relationship is depth-1 populated. Aziz is the sole
// site-visible author (PRD §6), so he's the fallback when none is set.
function authorName(post: BlogPost): string {
  const author = post.author
  return author && typeof author === 'object' ? author.name : 'Aziz Aghayev'
}

function blogTag(post: BlogPost): string {
  const parts = [CATEGORY_LABEL[post.serviceCategory]]
  if (post.readingTime) parts.push(`${post.readingTime} min`)
  return parts.join(' · ')
}

export default async function HomePage() {
  const payload = await getPayload({ config })

  // Public reads: `overrideAccess: false` makes the `publishedOrStaff` access
  // control apply, so an anonymous request never sees drafts (the Local API
  // otherwise defaults to overriding access). Site Settings is public-read with no
  // draft concept, so its default is fine.
  const [settings, testimonialsResult, postsResult] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    payload.find({
      collection: 'testimonials',
      where: {
        and: [{ featured: { equals: true } }, { status: { equals: 'published' } }],
      },
      overrideAccess: false,
      depth: 1,
      limit: 3,
      // Deterministic order when more than 3 featured testimonials exist.
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'blog-posts',
      where: { _status: { equals: 'published' } },
      overrideAccess: false,
      depth: 1,
      limit: 3,
      sort: '-publishedAt',
    }),
  ])

  const testimonials = testimonialsResult.docs
  const posts = postsResult.docs

  const heroHeadline = settings?.hero?.headline?.trim()
  const heroSubheadline = settings?.hero?.subheadline?.trim()

  return (
    <>
      {/* HERO — light, type-led, side product mock */}
      <section
        style={{
          position: 'relative',
          padding: '40px 56px 64px',
          background: 'var(--c-paper)',
          overflow: 'hidden',
        }}
        data-testid="home-hero"
      >
        {/* Soft warm wash on the right — decorative. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at 95% 0%, rgba(0,165,104,0.08) 0%, transparent 50%)',
          }}
        />
        {/* Oversized faded mark — decorative flourish, per the design. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 680,
            height: 680,
            opacity: 0.025,
            right: -160,
            top: 40,
          }}
        >
          <Mark size={680} color="#ffffff" />
        </div>

        <div className="container" style={{ position: 'relative', paddingTop: 64 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr',
              gap: 64,
              alignItems: 'center',
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: 32 }}>
                K-12 budget software · since day one
              </div>
              <h1 className="h1" style={{ marginBottom: 36 }}>
                {heroHeadline ?? (
                  <>
                    Many tools.
                    <br />
                    <em>One platform.</em>
                    <br />
                    <strong>Built by operators.</strong>
                  </>
                )}
              </h1>
              <p className="lead" style={{ fontSize: 22, maxWidth: '48ch', marginBottom: 40 }}>
                {heroSubheadline ||
                  'flowlyst replaces three apps and five spreadsheets with one platform — designed by former school CFOs, supplementary to your ERP.'}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/request-demo" className="btn btn--primary btn--lg">
                  Request a demo <ArrowRight />
                </Link>
                <Link href="/about" className="btn btn--ghost btn--lg">
                  Read the manifesto
                </Link>
              </div>
            </div>

            <ProductMock />
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <Marquee items={MARQUEE_ITEMS} />
        </div>
      </section>

      {/* FLAGSHIP — Budget Software on cream */}
      <section className="section section--cream" data-testid="home-flagship">
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
                Flagship · Budget Software
              </div>
              <h2 className="h2" style={{ marginBottom: 32 }}>
                The platform we <em>wished existed</em> when we ran the budget.
              </h2>
              <p className="lead" style={{ fontSize: 19, marginBottom: 32 }}>
                Department entry. Real-time tracking. Salary projections. Board-ready reports. One
                source of truth that sits alongside the ERP you’ve already paid for.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  marginBottom: 40,
                }}
              >
                {FLAGSHIP_FEATURES.map((feature) => (
                  <div
                    key={feature}
                    style={{ display: 'flex', gap: 10, fontSize: 15, fontWeight: 700 }}
                  >
                    <span className="accent" aria-hidden="true" style={{ fontWeight: 800 }}>
                      ✦
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/solutions/budget-software" className="btn btn--primary btn--lg">
                Tour the software <ArrowRight />
              </Link>
            </div>

            {/* The design's BigNumberBlock is a pass-through that renders the same
                ProductMock as the hero (see report — flagged for the lead). */}
            <div style={{ position: 'relative' }}>
              <ProductMock />
            </div>
          </div>
        </div>
      </section>

      {/* STAT BAND — green punctuation */}
      <section
        className="section--green"
        style={{ padding: '140px 56px' }}
        data-testid="home-stats"
      >
        <div className="container" style={{ maxWidth: 1080 }}>
          <h2 className="h2" style={{ color: '#fff', marginBottom: 56 }}>
            <span className="accent--yellow">100%</span> workshop satisfaction.
            <br />
            <span className="accent--yellow">2,000+</span> leaders trained.
            <br />
            <span className="accent--yellow">500+</span> hours saved.
          </h2>
          {/* Size + white come from the .section--green WCAG 1.4.3 amendment in
              styles.css (large-text contrast on the brand-green band). */}
          <p
            style={{
              lineHeight: 1.55,
              maxWidth: '54ch',
              margin: 0,
            }}
          >
            Every number is a district leader who got their evening back, a board meeting that ran
            clean, or a budget that closed on time.
          </p>
        </div>
      </section>

      {/* OFFERINGS — tabular, light */}
      <section className="section" data-testid="home-offerings">
        <div className="container">
          <div style={{ marginBottom: 64 }}>
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              What we offer
            </div>
            <h2 className="h2" style={{ maxWidth: '22ch' }}>
              One vendor. <em>Four ways</em> to work with us.
            </h2>
          </div>

          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {OFFERINGS.map((offering) => (
              <div key={offering.num} className="t-row t-row--light" data-testid="offering-row">
                <div className="t-row__num">{offering.num}</div>
                <div className="t-row__tag">{offering.tag}</div>
                <div>
                  <h3 className="t-row__title">{offering.title}</h3>
                  <p className="t-row__copy">{offering.copy}</p>
                </div>
                <Link href={offering.href} className="t-row__cta">
                  {offering.cta} <ArrowRight />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER PULL QUOTE — sage tint */}
      <section
        className="section section--sage"
        style={{ padding: '160px 56px' }}
        data-testid="home-founder-quote"
      >
        <div className="container" style={{ maxWidth: 1100 }}>
          <div className="eyebrow" style={{ marginBottom: 48 }}>
            Aziz Aghayev · Founder
          </div>
          <blockquote className="pull" style={{ color: 'var(--c-ink)', margin: 0 }}>
            “I sat in <em>your seat</em> for fifteen years. flowlyst is the partner I wished I’d had
            — built without the vendor distance.”
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 56 }}>
            <FounderAvatar size={64} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Aziz Aghayev</div>
              <div style={{ fontSize: 14, color: 'var(--c-ink-3)', marginTop: 4 }}>
                Founder &amp; Lead Consultant · former school CFO · 15+ years
              </div>
            </div>
            <Link href="/about" className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }}>
              Read the full story <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — cream, white cards. CMS-driven; omitted when none published. */}
      {testimonials.length > 0 && (
        <section
          className="section section--cream"
          style={{ padding: '140px 56px' }}
          data-testid="home-testimonials"
        >
          <div className="container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 64,
                marginBottom: 56,
                alignItems: 'flex-end',
              }}
            >
              <h2 className="h2">
                In their <em>own words.</em>
              </h2>
              <p
                style={{
                  fontSize: 18,
                  color: 'var(--c-ink-2)',
                  maxWidth: '54ch',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                District leaders we’ve worked with — operators, not personas. Names redacted on
                request.
              </p>
            </div>

            <div className="grid-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card" data-testid="testimonial-card">
                  <div
                    aria-hidden="true"
                    style={{
                      fontSize: 72,
                      fontWeight: 800,
                      lineHeight: 0.4,
                      color: 'var(--fl-green)',
                      marginBottom: 24,
                    }}
                  >
                    “
                  </div>
                  <p
                    style={{
                      fontSize: 21,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      margin: '0 0 32px',
                      color: 'var(--c-ink)',
                    }}
                  >
                    {t.quote}
                  </p>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--c-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      fontWeight: 800,
                    }}
                  >
                    {testimonialAttribution(t)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 48, textAlign: 'center' }}>
              <Link href="/testimonials" className="btn btn--ghost">
                All testimonials <ArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* BLOG TEASER — paper. CMS-driven; omitted when none published. */}
      {posts.length > 0 && (
        <section className="section" data-testid="home-blog">
          <div className="container">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: 56,
              }}
            >
              <div>
                <div className="eyebrow" style={{ marginBottom: 32 }}>
                  From the blog
                </div>
                <h2 className="h2" style={{ maxWidth: '20ch' }}>
                  Notes from the office that <em>runs the district.</em>
                </h2>
              </div>
              <Link href="/blog" className="btn btn--ghost">
                All posts <ArrowRight />
              </Link>
            </div>

            <div className="grid-3">
              {posts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  data-testid="blog-teaser-card"
                >
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <BlogTileArt index={i} />
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
                        {blogTag(post)}
                      </div>
                      {/* Plain text, not dangerouslySetInnerHTML (issue #6 AC#7). */}
                      <h3 className="h4" style={{ marginBottom: 14, lineHeight: 1.3 }}>
                        {post.title}
                      </h3>
                      <div style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>
                        by {authorName(post)}
                        {formatDate(post.publishedAt) ? ` · ${formatDate(post.publishedAt)}` : ''}
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

// ---------------- supporting presentational elements ----------------
// Ported from design/site/site.jsx + home.jsx. Pure/decorative; inline styles
// reference brand tokens only (no invented values).

function ArrowRight() {
  return (
    <span className="arr" aria-hidden="true" style={{ display: 'inline-block' }}>
      →
    </span>
  )
}

function Marquee({ items }: { items: string[] }) {
  // Duplicated for a seamless CSS loop (design/site/site.css `.marquee`).
  const looped = [...items, ...items]
  return (
    <div className="marquee">
      <div className="marquee__track">
        {looped.map((item, i) => (
          <React.Fragment key={i}>
            <span>{item}</span>
            <span className="marquee__star" aria-hidden="true">
              ✦
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// Light-UI product screenshot mock (matches the light-theme product; no dark mode).
function ProductMock() {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '4/3',
        background: 'var(--c-paper)',
        border: '1px solid var(--c-line)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 32px 80px -16px rgba(14,20,16,0.18)',
      }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--c-line-2)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            background: 'var(--c-cream)',
          }}
        >
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}
          />
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}
          />
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}
          />
          <span
            style={{
              marginLeft: 12,
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--c-ink-3)',
            }}
          >
            flowlyst · FY26 budget
          </span>
        </div>
        <div style={{ padding: 24, flex: 1, color: 'var(--c-ink)' }}>
          <div
            style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 4 }}
          >
            $84.2M
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--c-ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 28,
              fontWeight: 800,
            }}
          >
            Total district budget · FY 2025–26
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {(
              [
                ['Encumbered', '$61.7M', '73% of plan'],
                ['Variance', '−$240K', 'Under budget'],
              ] as const
            ).map(([label, num, detail]) => (
              <div
                key={label}
                style={{
                  padding: '14px 16px',
                  border: '1px solid var(--c-line)',
                  borderRadius: 4,
                  background: 'var(--c-sage)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--c-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    margin: '6px 0 2px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {num}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fl-green-700)', fontWeight: 800 }}>
                  {detail}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
            {[40, 65, 50, 78, 55, 92, 72, 68, 85, 60, 75, 88].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: h + '%',
                  background: i === 5 ? 'var(--fl-green)' : 'rgba(0,165,104,0.22)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FounderAvatar({ size = 64 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: 'linear-gradient(135deg, #3a4a40, #1a2520)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <circle cx="32" cy="26" r="11" fill="rgba(255,210,170,0.4)" />
        <path d="M 10 64 Q 10 44 32 42 Q 54 44 54 64 Z" fill="rgba(20,30,25,0.7)" />
      </svg>
    </div>
  )
}

// Geometric blog-tile placeholders — distinct per index, light-theme-friendly.
function BlogTileArt({ index = 0 }: { index?: number }) {
  const variants = [
    <svg
      key="a"
      viewBox="0 0 400 160"
      aria-hidden="true"
      style={{ width: '100%', height: 160, display: 'block', background: 'var(--c-sage)' }}
    >
      <rect x="20" y="60" width="40" height="80" fill="rgba(0,165,104,0.35)" />
      <rect x="80" y="40" width="40" height="100" fill="rgba(0,165,104,0.55)" />
      <rect x="140" y="20" width="40" height="120" fill="var(--fl-green)" />
      <rect x="200" y="50" width="40" height="90" fill="rgba(0,165,104,0.45)" />
      <rect x="260" y="70" width="40" height="70" fill="rgba(0,165,104,0.3)" />
      <rect x="320" y="30" width="40" height="110" fill="rgba(0,165,104,0.5)" />
    </svg>,
    <svg
      key="b"
      viewBox="0 0 400 160"
      aria-hidden="true"
      style={{ width: '100%', height: 160, display: 'block', background: 'var(--fl-green)' }}
    >
      <path
        d="M 20 130 Q 100 130 140 90 T 280 60 T 380 30"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 20 130 Q 100 130 140 90 T 280 60 T 380 30 L 380 160 L 20 160 Z"
        fill="rgba(255,255,255,0.15)"
      />
      <circle cx="280" cy="60" r="6" fill="#fff" />
      <circle cx="380" cy="30" r="6" fill="#FFE9A0" />
    </svg>,
    <svg
      key="c"
      viewBox="0 0 400 160"
      aria-hidden="true"
      style={{ width: '100%', height: 160, display: 'block', background: 'var(--c-cream)' }}
    >
      {Array(8)
        .fill(0)
        .map((_, x) =>
          Array(4)
            .fill(0)
            .map((_, y) => (
              <circle
                key={x + '-' + y}
                cx={30 + x * 48}
                cy={30 + y * 35}
                r={x === 5 && y === 1 ? 12 : 5}
                fill={x === 5 && y === 1 ? 'var(--fl-green)' : 'rgba(14,20,16,0.35)'}
              />
            )),
        )}
    </svg>,
  ]
  return variants[index % variants.length]
}
