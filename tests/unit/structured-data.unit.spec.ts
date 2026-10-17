import { describe, it, expect } from 'vitest'

import { serializeJsonLd } from '@/utilities/jsonLd'
import {
  buildFounderPersonSchema,
  buildOrganizationSchema,
  organizationId,
} from '@/utilities/structuredData'

const serverURL = 'https://x.test'

describe('buildOrganizationSchema', () => {
  it('carries @id and logo, and omits sameAs when there are no links', () => {
    const node = buildOrganizationSchema({ serverURL, sameAs: [] })
    expect(node['@id']).toBe('https://x.test/#organization')
    expect(node.logo).toBe('https://x.test/images/flowlyst-logo.svg')
    expect('sameAs' in node).toBe(false)
  })

  it('includes sameAs when links are given', () => {
    const node = buildOrganizationSchema({ serverURL, sameAs: ['https://example.com/a'] })
    expect(node).toHaveProperty('sameAs', ['https://example.com/a'])
  })

  it('serializes without any "<" and round-trips a hostile sameAs value', () => {
    const hostile = 'https://example.com/</script><script>alert(1)</script>'
    const out = serializeJsonLd(buildOrganizationSchema({ serverURL, sameAs: [hostile] }))
    expect(out).not.toContain('<')
    expect(JSON.parse(out).sameAs).toEqual([hostile])
  })
})

describe('buildFounderPersonSchema', () => {
  it('has no sameAs without a LinkedIn URL and worksFor references the Organization @id', () => {
    const node = buildFounderPersonSchema({ serverURL, linkedIn: undefined })
    expect('sameAs' in node).toBe(false)
    expect(node.worksFor['@id']).toBe(organizationId(serverURL))
  })

  it('sets sameAs to the LinkedIn URL when given', () => {
    const node = buildFounderPersonSchema({ serverURL, linkedIn: 'https://example.com/aziz' })
    expect(node).toHaveProperty('sameAs', ['https://example.com/aziz'])
  })
})
