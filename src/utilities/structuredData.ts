export const organizationId = (serverURL: string) => `${serverURL}/#organization`
export const founderId = (serverURL: string) => `${serverURL}/about#aziz-aghayev`

export function buildOrganizationSchema({
  serverURL,
  sameAs,
}: {
  serverURL: string
  sameAs: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(serverURL),
    name: 'flowlyst',
    legalName: 'flowlyst LLC',
    url: serverURL,
    logo: `${serverURL}/images/flowlyst-logo.svg`,
    email: 'info@flowlyst.io',
    description:
      'flowlyst gives K–12 public school district leaders software, training, and consulting built and delivered by a former school CFO.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lucas',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
    founder: {
      '@type': 'Person',
      '@id': founderId(serverURL),
      name: 'Aziz Aghayev',
      url: `${serverURL}/about`,
    },
    areaServed: 'US',
    ...(sameAs.length > 0 && { sameAs }),
  }
}

export function buildFounderPersonSchema({
  serverURL,
  linkedIn,
}: {
  serverURL: string
  linkedIn?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': founderId(serverURL),
    name: 'Aziz Aghayev',
    image: `${serverURL}/images/aziz-aghayev.jpg`,
    jobTitle: 'Founder & CEO',
    url: `${serverURL}/about`,
    worksFor: {
      '@type': 'Organization',
      '@id': organizationId(serverURL),
      name: 'flowlyst',
      url: serverURL,
    },
    description:
      'Former school CFO with 15+ years in K–12 finance and leadership. National speaker on AI in K–12 administration and school finance modernization.',
    knowsAbout: [
      'K–12 school finance',
      'AI in district administration',
      'Automation for school operations',
      'School budget modernization',
    ],
    ...(linkedIn && { sameAs: [linkedIn] }),
  }
}
