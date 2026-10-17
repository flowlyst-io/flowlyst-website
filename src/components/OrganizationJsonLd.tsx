import React from 'react'
import { getServerURL } from '@/utilities/serverURL'
import { serializeJsonLd } from '@/utilities/jsonLd'
import { buildOrganizationSchema } from '@/utilities/structuredData'

/**
 * Site-wide Organization structured data (PRD §10.1; review invariant a). Rendered by
 * both root layouts (the frontend layout and global-not-found) so every public page
 * carries it. `sameAs` comes from Site Settings social links and is absent until one
 * is filled; the `@id` is what the About page's Person `worksFor` points at.
 */
export function OrganizationJsonLd({ sameAs }: { sameAs: string[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(buildOrganizationSchema({ serverURL: getServerURL(), sameAs })),
      }}
    />
  )
}
