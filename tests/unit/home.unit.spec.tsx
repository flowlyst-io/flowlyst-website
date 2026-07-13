import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

import HomePage from '@/app/(frontend)/page'

afterEach(() => cleanup())

describe('HomePage (placeholder)', () => {
  it('renders a single H1 with the placeholder headline', () => {
    render(<HomePage />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    // The display treatment renders "rebuilt" inside an <em>; textContent is unaffected.
    expect(headings[0]).toHaveTextContent('The flowlyst site is being rebuilt.')
  })

  // The <main> landmark now lives in the (frontend) layout, not the page — the
  // page owns only its single H1. Landmark structure is asserted end-to-end.
  it('renders the under-construction intro copy', () => {
    render(<HomePage />)
    expect(screen.getByText(/the full site is under construction\./i)).toBeInTheDocument()
  })
})
