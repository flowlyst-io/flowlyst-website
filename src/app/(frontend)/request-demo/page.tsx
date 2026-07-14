import React from 'react'
import type { Metadata } from 'next'

import { DemoRequestForm } from '@/components/DemoRequestForm'

/**
 * Request-a-demo page (`/request-demo`, PRD §8.1 / §7 / §11 — a preserved URL).
 * The primary lead-gen form and highest-intent commercial page. Built against the
 * settled design design/site/pages.jsx `RequestDemoPage`.
 *
 * Fully server-rendered: the heading, lead, proof points, and response note are in
 * the initial HTML (PRD §10.1, review invariant a). No CMS-driven content, so the
 * page renders statically for a fast LCP; the ONLY client island is the form
 * (DemoRequestForm). Nav / Footer come from the frontend layout; this page owns its
 * single H1 (the hero heading).
 */

const CANONICAL_PATH = '/request-demo'

const PAGE_TITLE = 'Request a Demo — flowlyst'
const PAGE_DESCRIPTION =
  'See flowlyst on your K–12 district’s data — a 30-minute personalized walkthrough with a former school CFO, not a generic vendor demo. No slide deck; tailored to your district.'

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

// Proof points beside the form (design RequestDemoPage). Static content.
const BULLETS = [
  'No slide deck — we open the product and show you',
  'Tailored to your district size and priorities',
  'Aziz or a senior consultant on the call',
  '1-week typical implementation if it’s a fit',
]

export default function RequestDemoPage() {
  return (
    <section style={{ padding: '64px 56px 96px' }} data-testid="request-demo">
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 80,
            alignItems: 'flex-start',
          }}
        >
          {/* Left — proof column (server-rendered). Sticks beside the tall form on
              desktop; the request-demo__aside rule drops the sticky ≤680px. */}
          <div className="request-demo__aside">
            <div className="eyebrow mb-32">30-minute walkthrough</div>
            <h1 className="h1" style={{ marginBottom: 24, fontSize: 'clamp(44px, 5vw, 72px)' }}>
              See flowlyst on <em>your district’s</em> data.
            </h1>
            <p className="lead" style={{ marginBottom: 40 }}>
              A 30-minute walkthrough with someone who’s done your job. Personalized, not a generic
              vendor demo.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 40px',
                display: 'grid',
                gap: 16,
              }}
            >
              {BULLETS.map((b) => (
                <li
                  key={b}
                  style={{ display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: 17 }}
                >
                  <span
                    className="accent"
                    aria-hidden="true"
                    style={{ color: 'var(--fl-green)', fontWeight: 800, fontSize: 20 }}
                  >
                    ✦
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div style={{ padding: 24, background: 'var(--c-cream)', borderRadius: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--fl-green-700)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Average response
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                Same business day, from Aziz or a senior consultant.
              </div>
            </div>
          </div>

          {/* Right — the client island. */}
          <DemoRequestForm />
        </div>
      </div>
    </section>
  )
}
