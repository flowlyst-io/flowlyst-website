// @vitest-environment node
// Server-side enforcement of the SpeakingRequests lead inbox (issue #13, PRD §8/§9).
//
// Runs in Node (not jsdom): these drive the Payload Local API, a backend concern —
// under jsdom the file-type library's cross-realm `instanceof` checks break Payload
// (see the note atop tests/int/cms.int.spec.ts).
//
// The collection is the DELIVERY PATH for the keynotes speaking-request form
// (invariant d): a public visitor `create`s a row, everything else is Admin-only
// because the rows are lead PII. Access control is exercised the *real* way —
// `overrideAccess: false` plus an explicit `user` — because the Local API defaults
// to `overrideAccess: true`, which skips access control entirely (a test that omits
// it proves nothing). This mirrors the demo-requests block in cms.int.spec.ts and
// adds the honeypot (`botField`) proof: a filled honeypot must be rejected AND
// persist nothing.
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let admin: { id: number; role?: string | null }
let editor: { id: number; role?: string | null }

const stamp = Date.now()
const pw = 'test-password-123'

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  // Stamped users — no global user wipe, so this file stays decoupled from the
  // other int specs (fileParallelism is off; they run serially). The first user in
  // an empty table is force-admin'd by the bootstrap hook, which only reinforces
  // the admin role here; a later admin keeps the role we pass. Editor is created
  // second, so it is never force-admin'd.
  admin = await payload.create({
    collection: 'users',
    data: {
      email: `kn-admin-${stamp}@flowlyst.test`,
      password: pw,
      name: 'KN Admin',
      role: 'admin',
    },
  })
  editor = await payload.create({
    collection: 'users',
    data: {
      email: `kn-editor-${stamp}@flowlyst.test`,
      password: pw,
      name: 'KN Editor',
      role: 'editor',
    },
  })
})

afterAll(async () => {
  // Best-effort cleanup of the rows this file created (throwaway per-worktree DB).
  await payload.delete({
    collection: 'speaking-requests',
    where: { eventName: { contains: `KN-${stamp}` } },
  })
})

describe('SpeakingRequests — public lead capture (PRD §8, invariant d)', () => {
  it('accepts a public submission, defaults status to "pending", and persists the fields', async () => {
    const eventName = `KN-${stamp}-public`
    const created = await payload.create({
      collection: 'speaking-requests',
      data: {
        contactName: 'Sam Organizer',
        email: `sam-${stamp}@assoc.org`,
        organization: 'State ASBO',
        eventName,
        eventDate: 'Fall 2026',
      },
      overrideAccess: false, // anonymous, exactly like the form's REST POST
    })
    // The delivery path is real: the submitted fields round-trip to storage …
    expect(created.contactName).toBe('Sam Organizer')
    expect(created.email).toBe(`sam-${stamp}@assoc.org`)
    expect(created.organization).toBe('State ASBO')
    expect(created.eventName).toBe(eventName)
    expect(created.eventDate).toBe('Fall 2026')
    // … and the server-side default triage status applies.
    expect(created.status).toBe('pending')
  })

  it('ignores anon-injected status / internalNotes (field-level admin lock)', async () => {
    const created = await payload.create({
      collection: 'speaking-requests',
      data: {
        contactName: 'Injector',
        email: `inject-${stamp}@assoc.org`,
        eventName: `KN-${stamp}-inject`,
        eventDate: 'Fall 2026',
        status: 'completed', // attacker-supplied triage status …
        internalNotes: 'i set this myself', // … and internal notes
      },
      overrideAccess: false, // anonymous
    })
    expect(created.status).toBe('pending') // injected status ignored → default wins
    expect(created.internalNotes).toBeFalsy() // notes stripped
  })

  it('rejects a submission whose honeypot (botField) is filled, and persists nothing', async () => {
    const eventName = `KN-${stamp}-bot`
    await expect(
      payload.create({
        collection: 'speaking-requests',
        data: {
          contactName: 'Bot',
          email: `bot-${stamp}@assoc.org`,
          eventName,
          eventDate: 'Fall 2026',
          botField: 'i am a bot', // a field no human can see → server-side spam trip
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    // Validation runs before the DB insert, so the reject must leave no row behind.
    const found = await payload.find({
      collection: 'speaking-requests',
      where: { eventName: { equals: eventName } },
      overrideAccess: true, // bypass access so a leaked row WOULD be found (teeth)
    })
    expect(found.totalDocs, 'a honeypot-tripped create must persist nothing').toBe(0)
  })

  it('accepts a submission with an empty honeypot (a real visitor passes the trap)', async () => {
    const created = await payload.create({
      collection: 'speaking-requests',
      data: {
        contactName: 'Real Visitor',
        email: `real-${stamp}@assoc.org`,
        eventName: `KN-${stamp}-clean`,
        eventDate: 'Fall 2026',
        botField: '', // empty — the state a real browser submits
      },
      overrideAccess: false,
    })
    expect(created.id).toBeDefined()
  })
})

describe('SpeakingRequests — inbox is Admin-only PII', () => {
  it('does not expose the inbox to the public', async () => {
    await expect(
      payload.find({ collection: 'speaking-requests', overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('does not let an Editor read the inbox (admin-only PII)', async () => {
    await expect(
      payload.find({ collection: 'speaking-requests', overrideAccess: false, user: editor }),
    ).rejects.toThrow()
  })

  it('lets an Admin read the inbox', async () => {
    const res = await payload.find({
      collection: 'speaking-requests',
      overrideAccess: false,
      user: admin,
    })
    expect(res.totalDocs).toBeGreaterThanOrEqual(1)
  })
})
