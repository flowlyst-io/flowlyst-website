// @vitest-environment node
// Phase 3 lead-capture foundation (issues #14/#15/#16, PRD §8/§9).
//
// Runs in Node (not jsdom): these drive the Payload Local API and the newsletter
// `/subscribe` REST endpoint handler directly — backend concerns. Under jsdom the
// file-type library's cross-realm `instanceof` checks break Payload (see the note
// atop tests/int/cms.int.spec.ts).
//
// Access control is exercised the *real* way — `overrideAccess: false` plus an
// explicit `user` — because the Local API defaults to `overrideAccess: true`, which
// skips access control entirely (a test that omits it proves nothing). Models on
// tests/int/keynotes-cms.int.spec.ts.
//
// Coverage: DemoRequests (consent gate + honeypot + PII + field locks),
// ContactMessages (reason enum realignment + honeypot + PII), NewsletterSubscribers
// and its idempotent `/subscribe` endpoint (create / case-folded resubscribe /
// honeypot no-persist / status flip / unique index / PII), the shared email
// notifier's IRON RULE (a mail failure never throws / never fails persistence), and
// a SpeakingRequests regression (create still works after the notifier was wired).
import { getPayload, type Payload, type PayloadRequest } from 'payload'

import config from '@/payload.config'
import type { ContactMessage, DemoRequest } from '@/payload-types'
import {
  notifyContactMessage,
  notifyDemoRequest,
} from '@/email/leadNotifications'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let payload: Payload
let admin: { id: number; role?: string | null }
let editor: { id: number; role?: string | null }

const stamp = Date.now()
const pw = 'test-password-123'

// ---- /subscribe endpoint helpers --------------------------------------------

/** The idempotent public signup endpoint handler, pulled off the sanitized config. */
function subscribeHandler() {
  const col = payload.config.collections.find((c) => c.slug === 'newsletter-subscribers')
  const ep = col?.endpoints ? col.endpoints.find((e) => e.path === '/subscribe') : undefined
  if (!ep) throw new Error('newsletter /subscribe endpoint not found on the collection config')
  return ep.handler
}

/**
 * A minimal PayloadRequest that satisfies `addDataAndFileToRequest` (which the
 * handler calls first): POST + a truthy `body` + JSON content-type + `text()`
 * returning the JSON. That populates `req.data` exactly as the real HTTP path would.
 */
function subscribeReq(body: Record<string, unknown>): PayloadRequest {
  const text = JSON.stringify(body)
  return {
    payload,
    method: 'POST',
    body: text,
    headers: new Headers({ 'Content-Type': 'application/json', 'Content-Length': String(text.length) }),
    text: async () => text,
  } as unknown as PayloadRequest
}

async function subscribe(body: Record<string, unknown>): Promise<{ status: number; json: any }> {
  const res = await subscribeHandler()(subscribeReq(body))
  return { status: res.status, json: await res.json() }
}

async function findSubscribers(email: string) {
  return payload.find({
    collection: 'newsletter-subscribers',
    where: { email: { equals: email } },
    overrideAccess: true, // teeth: bypass access so a persisted row WOULD be found
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  // Stamped users — no global user wipe, so this file stays decoupled from the other
  // int specs (fileParallelism is off; they run serially).
  admin = await payload.create({
    collection: 'users',
    data: { email: `lf-admin-${stamp}@flowlyst.test`, password: pw, name: 'LF Admin', role: 'admin' },
  })
  editor = await payload.create({
    collection: 'users',
    data: { email: `lf-editor-${stamp}@flowlyst.test`, password: pw, name: 'LF Editor', role: 'editor' },
  })
})

afterAll(async () => {
  // Best-effort cleanup of rows this file created (throwaway per-worktree DB).
  const byStamp = { contains: String(stamp) }
  await Promise.allSettled([
    payload.delete({ collection: 'demo-requests', where: { workEmail: byStamp } }),
    payload.delete({ collection: 'contact-messages', where: { email: byStamp } }),
    payload.delete({ collection: 'newsletter-subscribers', where: { email: byStamp } }),
    payload.delete({ collection: 'speaking-requests', where: { eventName: byStamp } }),
  ])
})

// ============================ DemoRequests (#14/§8.1) =========================

describe('DemoRequests — consent gate, honeypot, PII, field locks', () => {
  it('creates a public submission when consent is true (status defaults to "pending")', async () => {
    const workEmail = `demo-ok-${stamp}@district.k12.us`
    const created = await payload.create({
      collection: 'demo-requests',
      data: { fullName: 'Sam Lead', workEmail, consent: true },
      overrideAccess: false, // anonymous
    })
    expect(created.status).toBe('pending')
    // Persistence proven (findable through the guard-bypassing read).
    const found = await payload.find({
      collection: 'demo-requests',
      where: { workEmail: { equals: workEmail } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
  })

  it('rejects a submission when consent is false', async () => {
    await expect(
      payload.create({
        collection: 'demo-requests',
        data: { fullName: 'No Consent', workEmail: `demo-false-${stamp}@district.k12.us`, consent: false },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects a submission when consent is omitted', async () => {
    await expect(
      payload.create({
        collection: 'demo-requests',
        data: { fullName: 'Missing Consent', workEmail: `demo-omit-${stamp}@district.k12.us` },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects a honeypot-tripped submission and persists nothing', async () => {
    const workEmail = `demo-bot-${stamp}@district.k12.us`
    await expect(
      payload.create({
        collection: 'demo-requests',
        data: { fullName: 'Bot', workEmail, consent: true, botField: 'i am a bot' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const found = await payload.find({
      collection: 'demo-requests',
      where: { workEmail: { equals: workEmail } },
      overrideAccess: true,
    })
    expect(found.totalDocs, 'a honeypot-tripped create must persist nothing').toBe(0)
  })

  it('ignores anon-injected status / internalNotes (field-level admin lock)', async () => {
    const created = await payload.create({
      collection: 'demo-requests',
      data: {
        fullName: 'Injector',
        workEmail: `demo-inject-${stamp}@district.k12.us`,
        consent: true,
        status: 'completed', // attacker-supplied triage status …
        internalNotes: 'i set this myself', // … and internal notes
      },
      overrideAccess: false,
    })
    expect(created.status).toBe('pending') // injected status ignored → default wins
    expect(created.internalNotes).toBeFalsy() // notes stripped
  })

  it('does not expose the inbox to the public (PII, admin-only)', async () => {
    await expect(
      payload.find({ collection: 'demo-requests', overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('does not let an Editor read the inbox (PII, admin-only)', async () => {
    await expect(
      payload.find({ collection: 'demo-requests', overrideAccess: false, user: editor }),
    ).rejects.toThrow()
  })
})

// ========================== ContactMessages (#15/§8.2) =======================

describe('ContactMessages — reason realignment, honeypot, PII', () => {
  const REASONS = ['press', 'partnership', 'training', 'support', 'other'] as const

  it('creates a valid public message (status defaults to "new")', async () => {
    const created = await payload.create({
      collection: 'contact-messages',
      data: {
        name: 'Pat Press',
        email: `contact-ok-${stamp}@example.org`,
        reason: 'press',
        message: 'Please get in touch about a story.',
      },
      overrideAccess: false, // anonymous
    })
    expect(created.status).toBe('new')
    expect(created.reason).toBe('press')
  })

  it('accepts each of the five realigned reason values', async () => {
    for (const reason of REASONS) {
      const created = await payload.create({
        collection: 'contact-messages',
        data: {
          name: `Reason ${reason}`,
          email: `contact-${reason}-${stamp}@example.org`,
          reason,
          message: 'Testing the reason enum.',
        },
        overrideAccess: false,
      })
      expect(created.reason, `reason "${reason}" is accepted`).toBe(reason)
    }
  })

  it('rejects the retired "general" reason value', async () => {
    await expect(
      payload.create({
        collection: 'contact-messages',
        data: {
          name: 'Old Reason',
          email: `contact-general-${stamp}@example.org`,
          // @ts-expect-error 'general' was intentionally removed from the enum.
          reason: 'general',
          message: 'This reason should be rejected.',
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects a honeypot-tripped submission and persists nothing', async () => {
    const email = `contact-bot-${stamp}@example.org`
    await expect(
      payload.create({
        collection: 'contact-messages',
        data: { name: 'Bot', email, reason: 'other', message: 'spam', botField: 'i am a bot' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const found = await payload.find({
      collection: 'contact-messages',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    expect(found.totalDocs, 'a honeypot-tripped create must persist nothing').toBe(0)
  })

  it('ignores anon-injected status / internalNotes (field-level admin lock)', async () => {
    const created = await payload.create({
      collection: 'contact-messages',
      data: {
        name: 'Injector',
        email: `contact-inject-${stamp}@example.org`,
        reason: 'support',
        message: 'hi',
        status: 'handled', // attacker-supplied …
        internalNotes: 'mine', // … admin-only fields
      },
      overrideAccess: false,
    })
    expect(created.status).toBe('new') // injected status ignored → default
    expect(created.internalNotes).toBeFalsy()
  })

  it('does not expose the inbox to the public (PII, admin-only)', async () => {
    await expect(
      payload.find({ collection: 'contact-messages', overrideAccess: false }),
    ).rejects.toThrow()
  })
})

// ===================== NewsletterSubscribers + /subscribe (#16/§8.3) =========

describe('NewsletterSubscribers — /subscribe endpoint, uniqueness, PII', () => {
  it('creates a new subscriber (status subscribed) on first subscribe', async () => {
    const email = `news-new-${stamp}@example.org`
    const { status, json } = await subscribe({ email, source: '/blog' })
    expect(status, 'new email → 201 Created').toBe(201)
    expect(json.ok).toBe(true)
    expect(json.id, 'the created row id is returned').toBeTruthy()

    const found = await findSubscribers(email)
    expect(found.totalDocs).toBe(1)
    expect(found.docs[0].status).toBe('subscribed')
    expect(found.docs[0].source).toBe('/blog')
  })

  it('re-subscribes the same email in a different case with no duplicate row', async () => {
    const mixed = `News-Case-${stamp}@Example.COM`
    const lower = mixed.trim().toLowerCase()

    const first = await subscribe({ email: mixed })
    expect(first.status, 'first (mixed case) → 201').toBe(201)

    const second = await subscribe({ email: lower.toUpperCase() })
    expect(second.status, 'same email, different case → 200 (idempotent)').toBe(200)
    expect(second.json.resubscribed, 'flagged as a re-subscribe, not a new create').toBe(true)

    // Case-folded to a single canonical row — no duplicate.
    const found = await findSubscribers(lower)
    expect(found.totalDocs, 'exactly one canonical (lower-cased) row').toBe(1)
  })

  it('honeypot: returns a 200-shaped ok and persists nothing', async () => {
    const email = `news-bot-${stamp}@example.org`
    const { status, json } = await subscribe({ email, botField: 'i am a bot' })
    expect(status, 'honeypot path returns 200 (trap not revealed)').toBe(200)
    expect(json.ok).toBe(true)
    const found = await findSubscribers(email.toLowerCase())
    expect(found.totalDocs, 'a honeypot signup must persist nothing').toBe(0)
  })

  it('re-subscribe flips an unsubscribed row back to subscribed', async () => {
    const email = `news-resub-${stamp}@example.org`
    const created = await subscribe({ email })
    expect(created.status).toBe(201)

    // Admin flips the row to unsubscribed (field-level lock bypassed via overrideAccess).
    await payload.update({
      collection: 'newsletter-subscribers',
      id: created.json.id,
      data: { status: 'unsubscribed' },
      overrideAccess: true,
    })
    const before = await payload.findByID({
      collection: 'newsletter-subscribers',
      id: created.json.id,
    })
    expect(before.status).toBe('unsubscribed')

    // Re-subscribing through the endpoint flips it back.
    const again = await subscribe({ email })
    expect(again.status).toBe(200)
    expect(again.json.resubscribed).toBe(true)
    const after = await payload.findByID({
      collection: 'newsletter-subscribers',
      id: created.json.id,
    })
    expect(after.status, 'status flipped back to subscribed').toBe('subscribed')
  })

  it('rejects an invalid email at the endpoint (400)', async () => {
    const { status, json } = await subscribe({ email: 'not-an-email' })
    expect(status).toBe(400)
    expect(Array.isArray(json.errors)).toBe(true)
  })

  it('enforces the unique email index on a raw duplicate create', async () => {
    const email = `news-unique-${stamp}@example.org`
    await payload.create({
      collection: 'newsletter-subscribers',
      data: { email },
      overrideAccess: true,
    })
    // Same stored (lower-case) value → unique index rejects the duplicate.
    await expect(
      payload.create({
        collection: 'newsletter-subscribers',
        data: { email },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('does not expose the list to the public (PII, admin-only)', async () => {
    await expect(
      payload.find({ collection: 'newsletter-subscribers', overrideAccess: false }),
    ).rejects.toThrow()
  })
})

// ===================== Email notifier — the IRON RULE (§8, invariant d) =======

describe('Lead notifier — a mail problem never throws / never fails persistence', () => {
  const demoDoc = { fullName: 'Iron Rule', workEmail: 'iron@district.k12.us' } as DemoRequest
  const contactDoc = {
    name: 'Iron Rule',
    email: 'iron@example.org',
    reason: 'other',
    message: 'hi',
  } as ContactMessage

  it('skips-and-logs (no throw) when RESEND_API_KEY is unset', async () => {
    // The local/CI env leaves RESEND_API_KEY unset — the skip-and-log branch.
    expect(process.env.RESEND_API_KEY, 'precondition: email transport unconfigured').toBeFalsy()
    const infoSpy = vi.spyOn(payload.logger, 'info')
    try {
      await expect(notifyDemoRequest(payload, demoDoc)).resolves.toBeUndefined()
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('skipped'))
    } finally {
      infoSpy.mockRestore()
    }
  })

  it('swallows a transport failure (logs, does not rethrow) when configured', async () => {
    // Configure email, then force the transport to throw: the notifier must still
    // resolve, so an afterChange caller can never turn a mail error into a failed
    // create (the iron rule).
    const prevKey = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = 'test-key-int'
    const sendSpy = vi.spyOn(payload, 'sendEmail').mockRejectedValue(new Error('transport boom'))
    const errorSpy = vi.spyOn(payload.logger, 'error')
    try {
      await expect(notifyContactMessage(payload, contactDoc)).resolves.toBeUndefined()
      expect(sendSpy, 'the transport was actually attempted').toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('FAILED'))
    } finally {
      sendSpy.mockRestore()
      errorSpy.mockRestore()
      if (prevKey === undefined) delete process.env.RESEND_API_KEY
      else process.env.RESEND_API_KEY = prevKey
    }
  })

  it('persists a demo request even though the create fires the (skipping) notifier hook', async () => {
    // End-to-end proof of the iron rule through the real hook: the afterChange
    // notifier runs on create (skip-and-log here) and never blocks persistence.
    const workEmail = `demo-hook-${stamp}@district.k12.us`
    const created = await payload.create({
      collection: 'demo-requests',
      data: { fullName: 'Hooked', workEmail, consent: true },
      overrideAccess: false,
    })
    expect(created.id).toBeDefined()
    const found = await payload.find({
      collection: 'demo-requests',
      where: { workEmail: { equals: workEmail } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
  })
})

// ===================== SpeakingRequests regression (#13 post-notifier) ========

describe('SpeakingRequests — create still works after the notifier was wired', () => {
  it('accepts an anonymous create with the default pending status (no behavior change)', async () => {
    const eventName = `Regression Event ${stamp}`
    const created = await payload.create({
      collection: 'speaking-requests',
      data: {
        contactName: 'Regression Organizer',
        email: `speak-${stamp}@assoc.org`,
        eventName,
        eventDate: 'Fall 2026',
      },
      overrideAccess: false, // anonymous
    })
    expect(created.status).toBe('pending')
    const found = await payload.find({
      collection: 'speaking-requests',
      where: { eventName: { equals: eventName } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
  })
})
