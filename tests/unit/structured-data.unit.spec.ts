import { describe, it, expect } from 'vitest'

import { serializeJsonLd } from '@/utilities/jsonLd'
import {
  buildFounderPersonSchema,
  buildOrganizationSchema,
  founderId,
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

describe('buildOrganizationSchema address and founder', () => {
  const node = buildOrganizationSchema({ serverURL, sameAs: [] })

  it('has a locality-only PostalAddress for Lucas, TX', () => {
    expect(node.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Lucas',
      addressRegion: 'TX',
      addressCountry: 'US',
    })
    expect('streetAddress' in node.address).toBe(false)
    expect('postalCode' in node.address).toBe(false)
  })

  it('keeps areaServed US and never mentions Chicago', () => {
    expect(node.areaServed).toBe('US')
    expect(JSON.stringify(node)).not.toMatch(/chicago/i)
  })

  it('names the founder with the same @id as the About Person', () => {
    expect(node.founder['@type']).toBe('Person')
    expect(node.founder.name).toBe('Aziz Aghayev')
    expect(node.founder['@id']).toBe(buildFounderPersonSchema({ serverURL })['@id'])
    expect(node.founder['@id']).toBe('https://x.test/about#aziz-aghayev')
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
