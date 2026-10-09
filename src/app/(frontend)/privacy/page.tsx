import React from 'react'
import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'
import { privacyDoc } from '@/content/legal/privacy'

/**
 * Privacy policy (`/privacy`) — issue #22, PRD §10.4 / §11. Fully server-rendered,
 * fully static: every legal string is in the initial HTML with no client-only content
 * and no data fetching (invariant a). Nav/Footer and the site-wide Organization JSON-LD
 * come from the frontend layout; this route renders the LegalPage shell + the copy.
 */
export const metadata: Metadata = {
  title: 'Privacy policy — flowlyst',
  description:
    'How flowlyst collects, uses, shares, and protects the personal information you provide through our website — and your privacy rights and choices.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy policy — flowlyst',
    description:
      'How flowlyst collects, uses, and protects the information you provide through our website, and your privacy rights and choices.',
    url: '/privacy',
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy policy — flowlyst',
    description:
      'How flowlyst collects, uses, and protects your information, and the privacy rights and choices you have.',
  },
}

export default function PrivacyPage() {
  return <LegalPage doc={privacyDoc} />
}
