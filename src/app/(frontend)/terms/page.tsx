import React from 'react'
import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'
import { termsDoc } from '@/content/legal/terms'

/**
 * Terms of service (`/terms`) — issue #22, PRD §11. Fully server-rendered, fully static
 * (invariant a). Nav/Footer and the site-wide Organization JSON-LD come from the
 * frontend layout; this route renders the LegalPage shell + the copy.
 */
export const metadata: Metadata = {
  title: 'Terms of service — flowlyst',
  description:
    'The terms that govern your use of the flowlyst website, including acceptable use, intellectual property, disclaimers, and how these terms change.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of service — flowlyst',
    description:
      'The terms that govern your use of the flowlyst website — acceptable use, intellectual property, disclaimers, and more.',
    url: '/terms',
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of service — flowlyst',
    description:
      'The terms that govern your use of the flowlyst website — acceptable use, intellectual property, and disclaimers.',
  },
}

export default function TermsPage() {
  return <LegalPage doc={termsDoc} />
}
