import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export async function findActiveLink(
  payload: Payload,
  key: string,
): Promise<{ id: number; destination: string } | null> {
  const k = key.toLowerCase()
  const { docs } = await payload.find({
    collection: 'links',
    where: {
      and: [
        { active: { equals: true } },
        { or: [{ code: { equals: k } }, { slug: { equals: k } }] },
      ],
    },
    overrideAccess: true,
    depth: 0,
    limit: 1,
    select: { destination: true },
  })
  const doc = docs[0]
  return doc ? { id: doc.id, destination: doc.destination } : null
}

// One UPDATE, not payload.update: concurrent scans must not lose counts, and a scan is
// not an edit, so `updatedAt` stays put. A failed count never blocks the redirect.
export async function recordScan(payload: Payload, id: number): Promise<void> {
  try {
    await payload.db.drizzle.execute(
      sql`UPDATE "links" SET "scan_count" = COALESCE("scan_count", 0) + 1, "last_scanned_at" = now() WHERE "id" = ${id}`,
    )
  } catch (err) {
    payload.logger.error({ err }, 'link scan count failed')
  }
}
