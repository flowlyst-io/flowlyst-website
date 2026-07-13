import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

import { FinalCTA } from '@/components/FinalCTA'

/**
 * Unit coverage for the homepage's closing CTA band (`home-final-cta`).
 *
 * The real homepage (`src/app/(frontend)/page.tsx`) is an async server component
 * that queries Payload, so it can't be rendered in jsdom — its full render is
 * proven in tests/int/home-cms.int.spec.ts and tests/e2e/home.e2e.spec.ts. FinalCTA
 * is pure/presentational, so it gets a fast unit test here.
 *
 * The load-bearing assertion: the band's big display heading is styled like the
 * hero (`className="h1"`) but must remain a semantic <h2> — a stray second <h1>
 * would violate the one-H1-per-page rule (issue #6 criterion 5 / PRD §10.3). This
 * guards that at the component level; the page-level count is asserted end-to-end.
 */
afterEach(() => cleanup())

describe('FinalCTA (homepage closing band)', () => {
  it('renders the CTA band heading as a semantic H2, not a second H1', () => {
    render(<FinalCTA />)

    // Styled as display-h1 but must be an <h2> so the page keeps exactly one H1.
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toHaveTextContent(/See it run on your district.s data\./)
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('offers the two closing CTAs pointing at the real app routes', () => {
    render(<FinalCTA />)

    expect(screen.getByRole('link', { name: /request a demo/i })).toHaveAttribute(
      'href',
      '/request-demo',
    )
    expect(screen.getByRole('link', { name: /talk to aziz/i })).toHaveAttribute('href', '/about')
  })
})
