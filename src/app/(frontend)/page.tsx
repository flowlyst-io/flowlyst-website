import React from 'react'
import './styles.css'

/**
 * Placeholder homepage for the flowlyst.io rewrite.
 *
 * This is a server component (no "use client") so the page is server-rendered —
 * a hard requirement for SEO / AI discoverability (PRD §10.1). It has no data
 * dependencies on purpose: the real homepage, built against the hi-fi design and
 * the Flowlyst Design System, lands in issue #6.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">flowlyst</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        The flowlyst site is being rebuilt.
      </h1>
      <p className="text-lg text-neutral-600">
        Software, training, and consulting for K&#8211;12 school districts, built by the people who
        used to do the job. The full site is under construction.
      </p>
    </main>
  )
}
