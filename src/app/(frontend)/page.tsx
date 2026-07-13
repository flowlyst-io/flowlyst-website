import React from 'react'

/**
 * Placeholder homepage for the flowlyst.io rewrite.
 *
 * Server component (no "use client") so the page is server-rendered — a hard
 * requirement for SEO / AI discoverability (PRD §10.1). It now sits inside the
 * shared shell (header/nav + footer, from the (frontend) layout) and owns the
 * single page H1. The real homepage, built against the hi-fi design, lands in
 * issue #6.
 */
export default function HomePage() {
  return (
    <section className="section section--cream text-c">
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 24 }}>
          Under construction
        </div>
        <h1 className="h1" style={{ maxWidth: '16ch', margin: '0 auto 24px' }}>
          The flowlyst site is being <em>rebuilt</em>.
        </h1>
        <p className="lead" style={{ margin: '0 auto', maxWidth: '52ch' }}>
          Software, training, and consulting for K–12 school districts, built by the people who used
          to do the job. The full site is under construction.
        </p>
      </div>
    </section>
  )
}
