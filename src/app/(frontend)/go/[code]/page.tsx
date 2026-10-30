import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { findActiveLink, recordScan } from '@/links/resolveLink'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function GoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const payload = await getPayload({ config })
  const link = await findActiveLink(payload, decodeURIComponent(code))
  // Stored destinations are validated as https; this guards rows written around validation.
  if (!link || !link.destination.startsWith('https://')) notFound()
  await recordScan(payload, link.id)
  redirect(link.destination)
}
