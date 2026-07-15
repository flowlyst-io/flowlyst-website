import React from 'react'
import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'
import { cookiesDoc } from '@/content/legal/cookies'

/**
 * Cookie policy (`/cookies`) — issue #22, PRD §10.4 / §11. Fully server-rendered, fully
 * static (invariant a). Nav/Footer and the site-wide Organization JSON-LD come from the
 * frontend layout; this route renders the LegalPage shell + the copy. It documents the
 * cookies the site actually sets, including the consent banner's own necessary cookie.
 */
export const metadata: Metadata = {
  title: 'Cookie policy — flowlyst',
  description:
    'The cookies and similar technologies the flowlyst website uses, why they run, and how you control your choices in the cookie banner.',
  alternates: { canonical: '/cookies' },
  openGraph: {
    title: 'Cookie policy — flowlyst',
    description:
      'The cookies and similar technologies the flowlyst website uses, why they run, and how you control your choices.',
    url: '/cookies',
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookie policy — flowlyst',
    description:
      'The cookies the flowlyst website uses, why they run, and how you control your choices in the cookie banner.',
  },
}

export default function CookiesPage() {
  return <LegalPage doc={cookiesDoc} />
}
