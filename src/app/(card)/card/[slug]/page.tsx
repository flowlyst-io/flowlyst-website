import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ContactCard } from '@/components/card/ContactCard'
import { getSiteSettings } from '@/utilities/siteSettings'

export const dynamic = 'force-dynamic'

async function findCard(slug: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'cards',
    where: { slug: { equals: slug } },
    overrideAccess: true,
    depth: 1,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const card = await findCard(slug)
  return {
    title: card ? `${card.name} · flowlyst` : 'Page not found — flowlyst',
    robots: { index: false, follow: false },
  }
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const card = await findCard(slug)
  if (!card) notFound()
  const settings = await getSiteSettings()
  return <ContactCard card={card} settings={settings} />
}
