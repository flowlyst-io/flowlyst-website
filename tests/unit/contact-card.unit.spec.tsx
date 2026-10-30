import React from 'react'
import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { ContactCard } from '@/components/card/ContactCard'
import { cardSocials } from '@/utilities/cardSocials'
import type { Card } from '@/payload-types'

const card: Card = {
  id: 1,
  name: 'Aziz Aghayev',
  title: 'Founder & CEO',
  phone: '+1 (312) 555-0100',
  email: 'a@example.com',
  linkedIn: 'https://www.linkedin.com/in/example',
  website: 'https://flowlyst.io',
  slug: 'aziz-aghayev-7hk2mp',
  updatedAt: '',
  createdAt: '',
}

const allSocials = {
  socialLinks: [
    { platform: 'linkedin' as const, url: 'https://linkedin.com/company/x' },
    { platform: 'facebook' as const, url: 'https://facebook.com/x' },
    { platform: 'twitter' as const, url: 'https://x.com/x' },
    { platform: 'instagram' as const, url: 'https://instagram.com/x' },
  ],
}

describe('ContactCard', () => {
  afterEach(cleanup)

  it('renders one h1 with the name, the title and the lowercase brand', () => {
    const { container, getByText } = render(<ContactCard card={card} settings={null} />)
    const h1s = container.querySelectorAll('h1')
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent).toBe('Aziz Aghayev')
    expect(getByText('Founder & CEO')).toBeTruthy()
    expect(getByText('flowlyst', { exact: true })).toBeTruthy()
  })

  it('links Add to contacts to the vCard route', () => {
    const { getByRole } = render(<ContactCard card={card} settings={null} />)
    expect(getByRole('link', { name: /add to contacts/i }).getAttribute('href')).toBe(
      '/card/aziz-aghayev-7hk2mp/vcard',
    )
  })

  it('builds the four tile hrefs and drops Call without a phone', () => {
    const { getByRole, queryByRole, rerender } = render(<ContactCard card={card} settings={null} />)
    expect(getByRole('link', { name: 'Call' }).getAttribute('href')).toBe('tel:+13125550100')
    expect(getByRole('link', { name: 'Email' }).getAttribute('href')).toBe('mailto:a@example.com')
    expect(getByRole('link', { name: 'LinkedIn' }).getAttribute('href')).toBe(card.linkedIn)
    expect(getByRole('link', { name: 'Website' }).getAttribute('href')).toBe(card.website)
    rerender(<ContactCard card={{ ...card, phone: null }} settings={null} />)
    expect(queryByRole('link', { name: 'Call' })).toBeNull()
  })

  it('shows only the company socials that have a URL, in X, Instagram, Facebook, LinkedIn order', () => {
    const settings = {
      socialLinks: [
        { platform: 'linkedin' as const, url: 'https://linkedin.com/company/x' },
        { platform: 'twitter' as const, url: 'https://x.com/x' },
        { platform: 'instagram' as const, url: '' },
      ],
    }
    const { container } = render(<ContactCard card={card} settings={settings} />)
    const labels = [...container.querySelectorAll('.card__social')].map((a) =>
      a.getAttribute('aria-label'),
    )
    expect(labels).toEqual(['flowlyst on X', 'flowlyst on LinkedIn'])
  })

  it('orders all four socials fixed regardless of settings order', () => {
    expect(cardSocials(allSocials).map((s) => s.label)).toEqual([
      'flowlyst on X',
      'flowlyst on Instagram',
      'flowlyst on Facebook',
      'flowlyst on LinkedIn',
    ])
  })

  it('hides "follow flowlyst" with no socials and shows it in lowercase with socials', () => {
    const none = render(<ContactCard card={card} settings={{ socialLinks: [] }} />)
    expect(none.queryByText(/follow flowlyst/i)).toBeNull()
    none.unmount()
    const some = render(<ContactCard card={card} settings={allSocials} />)
    expect(some.getByText('follow flowlyst', { exact: true })).toBeTruthy()
  })

  it('has no nav or footer element', () => {
    const { container } = render(<ContactCard card={card} settings={allSocials} />)
    expect(container.querySelector('nav')).toBeNull()
    expect(container.querySelector('footer')).toBeNull()
  })
})
