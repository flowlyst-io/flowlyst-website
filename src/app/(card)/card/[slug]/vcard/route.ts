import { getPayload } from 'payload'

import config from '@/payload.config'
import { loadCardPhoto } from '@/utilities/cardPhoto'
import { normalizeCrop } from '@/utilities/headshotCropShared'
import { buildVCard } from '@/utilities/vcard'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'cards',
    where: { slug: { equals: slug } },
    overrideAccess: true,
    depth: 1,
    limit: 1,
  })
  const card = docs[0]
  if (!card) return new Response('Not found', { status: 404 })

  // Drop the trailing random code so the file is named after the person.
  const filename = `${slug.replace(/-[^-]+$/, '') || 'card'}.vcf`
  const photo =
    card.headshot && typeof card.headshot === 'object'
      ? await loadCardPhoto(payload, card.headshot, normalizeCrop(card.headshotCrop))
      : null
  return new Response(buildVCard(card, photo), {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
