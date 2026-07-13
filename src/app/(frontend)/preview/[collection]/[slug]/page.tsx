import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Server-rendered draft preview (PRD §9 "Preview" hard requirement).
 *
 * PLACEHOLDER, by design: the public blog-post / case-study templates ship in
 * Phase 2. This proves the mechanism end-to-end — Draft Mode is on, the draft is
 * fetched with `draft: true`, and it is rendered on the server — without
 * pre-empting the real page design.
 */

export const dynamic = 'force-dynamic'

const PREVIEWABLE = ['blog-posts', 'case-studies'] as const
type PreviewCollection = (typeof PREVIEWABLE)[number]

const isPreviewable = (value: string): value is PreviewCollection =>
  (PREVIEWABLE as readonly string[]).includes(value)

const wrap = { padding: '2rem', fontFamily: 'monospace', maxWidth: '52rem' }

export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>
}) {
  const { collection, slug } = await params
  const { isEnabled } = await draftMode()

  if (!isEnabled) {
    return (
      <main style={wrap}>
        <h1>Draft preview is not enabled</h1>
        <p>Open this page from the “Preview” button inside the CMS admin.</p>
      </main>
    )
  }

  if (!isPreviewable(collection)) {
    return (
      <main style={wrap}>
        <h1>Unknown preview collection: {collection}</h1>
      </main>
    )
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    draft: true,
    overrideAccess: true,
    depth: 1,
    limit: 1,
  })
  const doc = result.docs[0]

  if (!doc) {
    return (
      <main style={wrap}>
        <h1>
          No {collection} found for slug “{slug}”.
        </h1>
      </main>
    )
  }

  return (
    <main style={wrap}>
      <p style={{ background: '#fde68a', padding: '0.5rem 0.75rem', borderRadius: 4 }}>
        DRAFT PREVIEW — unstyled placeholder. The real {collection} page ships in Phase 2.
      </p>
      <h1>{doc.title}</h1>
      <p>
        <strong>Status:</strong> {String(doc._status)}
      </p>
      <p>
        <strong>Collection:</strong> {collection} &nbsp;|&nbsp; <strong>Slug:</strong> {slug}
      </p>
      <hr />
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(doc, null, 2)}
      </pre>
    </main>
  )
}
