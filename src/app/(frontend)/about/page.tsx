import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Mark } from '@/components/Mark'
import { FinalCTA } from '@/components/FinalCTA'
import { getServerURL } from '@/utilities/serverURL'
import { serializeJsonLd } from '@/utilities/jsonLd'

/**
 * About (`/about`) — the real page for issue #7, built against the settled design
 * `design/site/pages.jsx` → `AboutPage` (composed with `design/site/site.jsx`).
 *
 * Fully server-rendered and fully static: every crawlable string is in the initial
 * HTML with no client-only content and no data fetching (PRD §10.1, review invariant
 * a). The shared chrome — Nav, Footer, and the site-wide Organization JSON-LD — comes
 * from the frontend layout; this page renders its own sections + the closing FinalCTA,
 * exactly as the homepage does.
 *
 * The founder's LinkedIn (design href="#") is intentionally OMITTED: no real URL
 * exists yet (SiteSettings.socialLinks is company-level, not Aziz's personal profile,
 * and none is populated). A dead link is worse than none; the real profile lands with
 * the founder-portrait work (#42 / #40).
 */

const serverURL = getServerURL()

export const metadata: Metadata = {
  title: 'About flowlyst — built by former school CFOs for K–12 districts',
  description:
    'flowlyst is K–12 first. Founder Aziz Aghayev is a former school CFO with 15+ years in district finance and a national speaker at ASBO International, NJASBO, and CPS.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About flowlyst — built by former school CFOs for K–12 districts',
    description:
      'K–12 first, by former school CFOs and admin leaders. Meet founder Aziz Aghayev and the operator-credibility mission behind flowlyst.',
    url: '/about',
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About flowlyst — built by former school CFOs for K–12 districts',
    description:
      'K–12 first, by former school CFOs and admin leaders. Meet founder Aziz Aghayev and the mission behind flowlyst.',
  },
}

/**
 * schema.org Person for Aziz Aghayev (PRD §6; review invariant a — Person on About).
 * Emitted alongside the layout's site-wide Organization node. `image` and `sameAs`
 * are omitted intentionally — no public headshot (#42) or founder social URL exists
 * yet, and the node is valid without them.
 */
const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Aziz Aghayev',
  jobTitle: 'Founder & Lead Consultant',
  url: `${serverURL}/about`,
  worksFor: {
    '@type': 'Organization',
    name: 'flowlyst',
    url: serverURL,
  },
  description:
    'Former school CFO with 15+ years in K–12 finance and leadership. National speaker on AI in K–12 administration and school finance modernization.',
  knowsAbout: [
    'K–12 school finance',
    'AI in district administration',
    'Automation for school operations',
    'School budget modernization',
  ],
}

type Pillar = { num: string; title: string; copy: string }

const PILLARS: Pillar[] = [
  {
    num: '01',
    title: 'Operator credibility',
    copy: 'We ran districts. We know which problems are real and which are vendor-invented.',
  },
  {
    num: '02',
    title: 'Partner, not vendor',
    copy: 'We walk with each district from onboarding through long-term support.',
  },
  {
    num: '03',
    title: 'K-12 first',
    copy: 'Every product, training, and engagement starts from K-12 — not adapted from elsewhere.',
  },
]

type Offering = { title: string; href: string }

const OFFERINGS: Offering[] = [
  { title: 'Budget Software', href: '/solutions/budget-software' },
  { title: 'AI Training', href: '/solutions/ai-training' },
  { title: 'Consulting', href: '/solutions/consulting' },
  { title: 'Keynotes', href: '/solutions/keynotes' },
]

const AZIZ_CHIPS = ['Former school CFO', 'ASBO International speaker', 'NJASBO · CPS', 'AASA']

export default function AboutPage() {
  return (
    <>
      {/* Founder structured data (PRD §6). The layout owns the Organization node. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(personSchema) }}
      />

      {/* HERO — cream, type-led, soft warm wash + oversized faded mark */}
      <section
        style={{
          position: 'relative',
          padding: '64px 56px 96px',
          background: 'var(--c-cream)',
          color: 'var(--c-ink)',
          overflow: 'hidden',
          borderBottom: '1px solid var(--c-cream-2)',
        }}
        data-testid="about-hero"
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at 30% 60%, rgba(0,165,104,0.16) 0%, transparent 55%)',
          }}
        />
        {/* Oversized faded mark — decorative flourish, per the design. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 680,
            height: 680,
            opacity: 0.05,
            left: -160,
            top: 40,
          }}
        >
          <Mark size={680} color="#ffffff" />
        </div>

        <div className="container" style={{ position: 'relative', paddingTop: 64 }}>
          <div className="eyebrow" style={{ marginBottom: 32 }}>
            About flowlyst
          </div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            We sat in <em>your seat.</em>
            <br />
            Now we build for it.
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '54ch' }}>
            flowlyst is K-12 first. The founder and consultants are former school CFOs and admin
            leaders — not generalist ed-tech vendors. Everything we ship runs through that lens.
          </p>
        </div>
      </section>

      {/* MEET AZIZ — cream, portrait + bio */}
      <section className="section section--cream" data-testid="about-founder">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr',
              gap: 80,
              alignItems: 'center',
            }}
          >
            <FounderPortrait />
            <div>
              <div className="eyebrow" style={{ marginBottom: 32 }}>
                Founder &amp; Lead Consultant
              </div>
              <h2 className="h2" style={{ marginBottom: 32 }}>
                Aziz Aghayev
              </h2>
              <p
                style={{
                  fontSize: 22,
                  lineHeight: 1.45,
                  marginBottom: 24,
                  color: 'var(--c-ink)',
                  fontWeight: 600,
                  maxWidth: '50ch',
                }}
              >
                15+ years in K-12 finance and leadership. Former school CFO. National speaker.
              </p>
              <p className="p" style={{ fontSize: 17, marginBottom: 32, maxWidth: '54ch' }}>
                Aziz built flowlyst because the tools and partners he wished he had as a CFO didn’t
                exist. Today he leads the consulting practice, delivers most keynotes, and writes
                most of the blog.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
                {AZIZ_CHIPS.map((chip) => (
                  <span key={chip} className="chip chip--green">
                    {chip}
                  </span>
                ))}
              </div>
              {/* LinkedIn (design href="#") omitted — no real URL yet (see file header).
                  "What districts say" → /testimonials satisfies issue #7's testimonials CTA,
                  styled identically to the design's inline links. */}
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <MeetAzizLink href="/solutions/keynotes">Speaking reel</MeetAzizLink>
                <MeetAzizLink href="/contact">Email Aziz</MeetAzizLink>
                <MeetAzizLink href="/testimonials">What districts say</MeetAzizLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION + PILLARS — paper */}
      <section className="section" data-testid="about-mission">
        <div className="container">
          <div style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              Our mission
            </div>
            <h2 className="h2" style={{ maxWidth: '22ch', margin: 0 }}>
              Equip K-12 districts with the tools and partners <em>we wished we’d had.</em>
            </h2>
          </div>
          <div className="grid-3">
            {PILLARS.map((pillar) => (
              <div key={pillar.num} className="card">
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 300,
                    color: 'rgba(0,0,0,0.18)',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    marginBottom: 16,
                  }}
                >
                  {pillar.num}
                </div>
                <h3 className="h3" style={{ marginBottom: 12, fontSize: 24 }}>
                  {pillar.title}
                </h3>
                <p className="p">{pillar.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO QUOTE — brand-green band. Two WCAG 1.4.3 fixes vs the design, which
          puts yellow on #00A568 (fails AA at any size): the kicker is sized up to WCAG
          large text and recolored white (see inline note); the .accent--yellow "your
          seat" span is recolored white by the shared styles.css green-band rule. */}
      <section
        className="section--green"
        style={{ padding: '140px 56px' }}
        data-testid="about-manifesto"
      >
        <div className="container" style={{ maxWidth: 1100 }}>
          {/* Size is load-bearing for contrast: white on #00A568 is 3.19:1, which
              clears AA only as WCAG large text (>=18.66px at weight >=700). The design's
              11px kicker fails at that size, so it's bumped to 19px/700 — mirrors the
              homepage ghost-light label fix (#6). Sized here, not in the shared
              .section--green block (the homepage reuses it). A tester guards this. */}
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 40,
            }}
          >
            ─── Aziz on flowlyst
          </div>
          <blockquote
            className="h1"
            style={{ color: '#fff', margin: 0, fontSize: 'clamp(40px, 5vw, 72px)' }}
          >
            “I sat in <span className="accent--yellow">your seat</span> for fifteen years. flowlyst
            is the partner I wished I’d had — built without the vendor distance.”
          </blockquote>
        </div>
      </section>

      {/* WHAT WE OFFER — cream, cross-link grid */}
      <section className="section section--cream" data-testid="about-offerings">
        <div className="container">
          <div style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              What we offer
            </div>
            <h2 className="h2" style={{ maxWidth: '20ch', margin: 0 }}>
              Four ways to <em>work with us.</em>
            </h2>
          </div>
          <div className="grid-4">
            {OFFERINGS.map((offering) => (
              <Link
                key={offering.title}
                href={offering.href}
                className="card"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                {/* Semantic h3 (visual h4) keeps the page heading order h1→h2→h3 with
                    no skipped level (PRD §10.3); mirrors the homepage blog-teaser cards. */}
                <h3 className="h4" style={{ marginBottom: 16 }}>
                  {offering.title}
                </h3>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fl-green-700)' }}>
                  Learn more <ArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational elements ----------------
// Ported from design/site/pages.jsx + site.jsx. Pure/decorative; inline styles
// reference brand tokens only (no invented values).

function ArrowRight() {
  return (
    <span className="arr" aria-hidden="true" style={{ display: 'inline-block' }}>
      →
    </span>
  )
}

// Meet-Aziz inline link — the design's underlined green-accent text link, as a
// Next Link so internal routes get client transitions and prefetch.
function MeetAzizLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--c-ink)',
        textDecoration: 'none',
        borderBottom: '1.5px solid var(--fl-green)',
        paddingBottom: 3,
      }}
    >
      {children} <ArrowRight />
    </Link>
  )
}

// Founder portrait placeholder (design/site/pages.jsx `FounderPortrait`). Pure SVG,
// server-renderable; the real headshot lands in #42. The gradient art is decorative
// (aria-hidden); the visible caption states it's a placeholder.
function FounderPortrait() {
  return (
    <div
      style={{
        aspectRatio: '4/5',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(160deg, #3a4a40 0%, #1a2520 100%)',
      }}
    >
      <svg
        viewBox="0 0 400 500"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <radialGradient id="founder-rim" cx="35%" cy="40%" r="65%">
            <stop offset="0%" stopColor="rgba(255,220,180,0.5)" />
            <stop offset="100%" stopColor="rgba(255,220,180,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="200" rx="82" ry="96" fill="rgba(255,210,170,0.35)" />
        <path d="M 75 500 Q 75 340 200 320 Q 325 340 325 500 Z" fill="rgba(20,30,25,0.85)" />
        <ellipse cx="200" cy="200" rx="82" ry="96" fill="url(#founder-rim)" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 24,
          bottom: 24,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Portrait placeholder
      </div>
    </div>
  )
}
