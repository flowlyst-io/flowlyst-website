import React from 'react'
import { getServerURL } from '@/utilities/serverURL'
import { serializeJsonLd } from '@/utilities/jsonLd'

/**
 * Site-wide Organization structured data (PRD §10.1; review invariant a). Rendered by
 * both root layouts (the frontend layout and global-not-found) so every public page
 * carries it. Static by design — `logo`/`sameAs` are omitted intentionally: no public
 * logo asset ships yet and no social links are configured, and the schema is valid
 * without them.
 */
export function OrganizationJsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'flowlyst',
    legalName: 'flowlyst LLC',
    url: getServerURL(),
    email: 'info@flowlyst.io',
    description:
      'flowlyst gives K–12 public school district leaders software, training, and consulting built and delivered by someone who used to do their jobs.',
    areaServed: 'US',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }}
    />
  )
}
