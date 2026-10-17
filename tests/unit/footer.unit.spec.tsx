import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'

import { Footer } from '@/components/Footer'

describe('Footer LinkedIn icon', () => {
  it('renders no LinkedIn link when no URL is given, and keeps the rest of the footer', () => {
    const { queryByRole, getByRole } = render(<Footer />)
    expect(queryByRole('link', { name: /linkedin/i })).toBeNull()
    expect(getByRole('link', { name: 'Privacy' })).toBeTruthy()
    expect(getByRole('link', { name: 'info@flowlyst.io' })).toBeTruthy()
  })

  it('renders an external, noopener link with an aria-hidden glyph when a URL is given', () => {
    const { getByRole } = render(<Footer linkedInUrl="https://example.com/co" />)
    const link = getByRole('link', { name: /linkedin/i })
    expect(link.getAttribute('href')).toBe('https://example.com/co')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})
