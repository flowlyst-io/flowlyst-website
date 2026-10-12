import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found — flowlyst',
  description: 'The page you were looking for does not exist.',
}

export default function NotFound() {
  return (
    <section
      className="section section--cream"
      style={{ padding: '160px 56px' }}
      data-testid="not-found"
    >
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 32 }}>
          404
        </div>
        <h1 className="h1" style={{ marginBottom: 32 }}>
          We can’t find <em>that page.</em>
        </h1>
        <p className="lead" style={{ fontSize: 22, maxWidth: '48ch', marginBottom: 40 }}>
          It may have moved, or the link may be mistyped. Head back home or see flowlyst running on
          your district’s budget.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn--primary btn--lg">
            Back to home
          </Link>
          <Link href="/request-demo" className="btn btn--ghost btn--lg">
            Request a demo
          </Link>
        </div>
      </div>
    </section>
  )
}
