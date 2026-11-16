import React from 'react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'

import { Footer } from '@/components/Footer'
import { subscribeCookieSettings } from '@/utilities/consent'

afterEach(cleanup)

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

describe('Footer Cookie settings', () => {
  it('F1: is a button in the Legal list, right after the Cookies link', () => {
    const { container } = render(<Footer />)
    const button = within(container).getByRole('button', { name: 'Cookie settings' })
    const link = within(container).getByRole('link', { name: 'Cookies' })
    expect(button.closest('ul')).toBe(link.closest('ul'))
    expect(button.closest('li')?.previousElementSibling).toBe(link.closest('li'))
  })

  it('F2: clicking it asks the banner to open', () => {
    const listener = vi.fn()
    const off = subscribeCookieSettings(listener)
    const { container } = render(<Footer />)
    fireEvent.click(within(container).getByRole('button', { name: 'Cookie settings' }))
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })
})
