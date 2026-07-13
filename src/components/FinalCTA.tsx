import React from 'react'
import Link from 'next/link'

/**
 * Closing call-to-action band (design/site/site.jsx `FinalCTA`).
 *
 * Server component — pure content. The full-bleed green band that sits just above
 * the footer on the marketing pages. The two-button actions row carries the
 * design's own `flexWrap: 'wrap'`, which is what keeps it from overflowing the
 * narrow (390px) viewport the retro flagged for the footer's separate `.footer__cta`
 * band; the buttons wrap rather than clip. Inline styles are carried over verbatim
 * from site.jsx (brand tokens / cream-at-opacity — no invented values).
 *
 * The `.html` hrefs in the comp map to the real app routes (PRD §7 / §11).
 */
export function FinalCTA() {
  return (
    <section
      className="section--green"
      style={{ padding: '160px 56px', textAlign: 'center' }}
      data-testid="home-final-cta"
    >
      <div className="container">
        <h2 className="h1" style={{ color: '#fff', maxWidth: 1080, margin: '0 auto 32px' }}>
          See it run on <span className="accent--yellow">your district’s</span> data.
        </h2>
        {/* Size + white come from the .section--green WCAG 1.4.3 amendment in
            styles.css (large-text contrast on the brand-green band). */}
        <p
          style={{
            lineHeight: 1.5,
            margin: '0 auto 48px',
            maxWidth: '52ch',
          }}
        >
          A 30-minute walkthrough with someone who’s done your job. No slide deck required.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/request-demo" className="btn btn--dark btn--lg">
            Request a demo{' '}
            <span className="arr" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/about" className="btn btn--ghost-light btn--lg">
            Talk to Aziz
          </Link>
        </div>
      </div>
    </section>
  )
}
