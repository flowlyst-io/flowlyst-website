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
    expect(headings[0]).toHaveTextContent('The flowlyst site is being rebuilt.')
  })

  it('renders inside a <main> landmark', () => {
    render(<HomePage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
