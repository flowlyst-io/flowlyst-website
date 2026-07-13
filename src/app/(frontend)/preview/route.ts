import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { isValidPreviewSecret } from '@/utilities/previewUrl'

/**
 * Draft-preview entry point (Payload `admin.preview` → here).
 *
 * Validates the shared secret, enables Next.js Draft Mode, then redirects to the
 * server-rendered draft page. Idiomatic Payload/Next preview flow; the rendered
 * page itself is a placeholder until the public templates land in Phase 2.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const collection = searchParams.get('collection')
  const slug = searchParams.get('slug')
  const secret = searchParams.get('secret')

  if (!isValidPreviewSecret(secret)) {
    return new Response('Invalid or missing preview secret.', { status: 401 })
  }
  if (collection !== 'blog-posts' && collection !== 'case-studies') {
    return new Response('Unknown preview collection.', { status: 400 })
  }
  if (!slug) {
    return new Response('Missing slug.', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(`/preview/${collection}/${slug}`)
}
