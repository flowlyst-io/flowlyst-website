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
import { envValue } from '@/utilities/envValue'
import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'
import {
  notifyContactMessage,
  notifyDemoRequest,
  notifySpeakingRequest,
  sendNewsletterConfirmation,
  sendTimeout,
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
    headers: new Headers({
      'Content-Type': 'application/json',
      'Content-Length': String(text.length),
    }),
    text: async () => text,
  } as unknown as PayloadRequest
}

async function subscribe(body: Record<string, unknown>): Promise<{ status: number; json: any }> {
  const res = await subscribeHandler()(subscribeReq(body))
  return { status: res.status, json: await res.json() }
}

/**
 * The endpoint returns a UNIFORM `200 { ok: true }` for EVERY outcome — new signup,
 * re-subscribe, honeypot, and malformed email are indistinguishable from the
 * outside (anti-enumeration: a caller can't learn whether an email already exists).
 * Every endpoint call is checked against this shape; the DISTINCT behaviors are
 * proven by asserting the persisted effect (a guard-bypassing DB read), not the
 * response.
 */
function expectUniformOk(result: { status: number; json: unknown }): void {
  expect(result.status, 'uniform 200 for every /subscribe outcome').toBe(200)
  expect(result.json, 'uniform { ok: true } body — no id / resubscribed leak').toEqual({ ok: true })
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
    data: {
      email: `lf-admin-${stamp}@flowlyst.test`,
      password: pw,
      name: 'LF Admin',
      role: 'admin',
    },
  })
  editor = await payload.create({
    collection: 'users',
    data: {
      email: `lf-editor-${stamp}@flowlyst.test`,
      password: pw,
      name: 'LF Editor',
      role: 'editor',
    },
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
        data: {
          fullName: 'No Consent',
          workEmail: `demo-false-${stamp}@district.k12.us`,
          consent: false,
        },
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
  const REASONS = [
    'press',
    'partnership',
    'training',
    'assessment',
    'pricing',
    'support',
    'other',
  ] as const

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

  it('accepts every reason value', async () => {
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
    expectUniformOk(await subscribe({ email, source: '/blog' }))

    // Effect: the row persisted, subscribed, with the source captured.
    const found = await findSubscribers(email)
    expect(found.totalDocs).toBe(1)
    expect(found.docs[0].status).toBe('subscribed')
    expect(found.docs[0].source).toBe('/blog')
  })

  it('re-subscribes the same email in a different case with no duplicate row', async () => {
    const mixed = `News-Case-${stamp}@Example.COM`
    const lower = mixed.trim().toLowerCase()

    expectUniformOk(await subscribe({ email: mixed }))
    expectUniformOk(await subscribe({ email: lower.toUpperCase() }))

    // Effect: case-folded to a single canonical row — no duplicate.
    const found = await findSubscribers(lower)
    expect(found.totalDocs, 'exactly one canonical (lower-cased) row').toBe(1)
    expect(found.docs[0].status).toBe('subscribed')
  })

  it('honeypot: returns the uniform ok and persists nothing', async () => {
    const email = `news-bot-${stamp}@example.org`
    expectUniformOk(await subscribe({ email, botField: 'i am a bot' }))
    const found = await findSubscribers(email.toLowerCase())
    expect(found.totalDocs, 'a honeypot signup must persist nothing').toBe(0)
  })

  it('malformed email: returns the uniform ok and persists nothing (no error leak)', async () => {
    expectUniformOk(await subscribe({ email: 'not-an-email' }))
    const found = await findSubscribers('not-an-email')
    expect(found.totalDocs, 'a malformed signup must persist nothing').toBe(0)
  })

  it('re-subscribe flips an unsubscribed row back to subscribed', async () => {
    const email = `news-resub-${stamp}@example.org`
    expectUniformOk(await subscribe({ email }))

    const row = (await findSubscribers(email)).docs[0]
    expect(row, 'the subscribe created a row').toBeTruthy()

    // Admin flips the row to unsubscribed (field-level lock bypassed via overrideAccess).
    await payload.update({
      collection: 'newsletter-subscribers',
      id: row.id,
      data: { status: 'unsubscribed' },
      overrideAccess: true,
    })
    expect(
      (await payload.findByID({ collection: 'newsletter-subscribers', id: row.id })).status,
    ).toBe('unsubscribed')

    // Re-subscribing through the endpoint flips it back — same row.
    expectUniformOk(await subscribe({ email }))
    const after = await findSubscribers(email)
    expect(after.totalDocs, 'still one row (updated, not duplicated)').toBe(1)
    expect(after.docs[0].status, 'status flipped back to subscribed').toBe('subscribed')
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

  it('denies an anonymous RAW create — public signup must go through /subscribe', async () => {
    // Raw collection `create` is Admin-only (the public path is the idempotent,
    // honeypot-guarded, anti-enumeration `/subscribe` endpoint). An anonymous raw
    // create must be rejected.
    await expect(
      payload.create({
        collection: 'newsletter-subscribers',
        data: { email: `news-rawanon-${stamp}@example.org` },
        overrideAccess: false, // anonymous
      }),
    ).rejects.toThrow()
    // And nothing persisted under that identity.
    const found = await findSubscribers(`news-rawanon-${stamp}@example.org`)
    expect(found.totalDocs, 'a denied raw create must persist nothing').toBe(0)
  })

  it('allows an Admin raw create but denies an Editor (admin-only write)', async () => {
    const created = await payload.create({
      collection: 'newsletter-subscribers',
      data: { email: `news-rawadmin-${stamp}@example.org` },
      overrideAccess: false,
      user: admin,
    })
    expect(created.id, 'an Admin may raw-create').toBeDefined()

    await expect(
      payload.create({
        collection: 'newsletter-subscribers',
        data: { email: `news-raweditor-${stamp}@example.org` },
        overrideAccess: false,
        user: editor, // content role — not the lead inboxes (PRD §9)
      }),
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

  it('sets reply-to to the submitter on demo, contact and speaking notifications', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key-int')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const speakingDoc = {
      eventName: 'Summit',
      eventDate: '2026-11-01',
      contactName: 'Sam Host',
      email: 'sam@host.org',
    } as SpeakingRequest
    try {
      await notifyDemoRequest(payload, demoDoc)
      await notifyContactMessage(payload, { ...contactDoc, reason: 'pricing' })
      await notifySpeakingRequest(payload, speakingDoc)
      expect(send.mock.calls.map(([m]) => m.replyTo)).toEqual([
        'iron@district.k12.us',
        'iron@example.org',
        'sam@host.org',
      ])
      expect(String(send.mock.calls[1][0].text)).toContain('Reason: Pricing')
    } finally {
      send.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('routes to the per-form override, else LEAD_NOTIFY_TO, else info@flowlyst.io', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key-int')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const speakingDoc = { eventName: 'S', eventDate: 'd', email: 'a@b.org' } as SpeakingRequest
    const sendAll = async () => {
      send.mockClear()
      await notifyDemoRequest(payload, demoDoc)
      await notifyContactMessage(payload, contactDoc)
      await notifySpeakingRequest(payload, speakingDoc)
      return send.mock.calls.map(([m]) => m.to)
    }
    try {
      for (const k of ['SALES', 'CONTACT', 'SPEAKING']) vi.stubEnv(`${k}_NOTIFY_TO`, '')
      vi.stubEnv('LEAD_NOTIFY_TO', '')
      expect(await sendAll()).toEqual(['info@flowlyst.io', 'info@flowlyst.io', 'info@flowlyst.io'])

      vi.stubEnv('LEAD_NOTIFY_TO', 'lead@x.org')
      expect(await sendAll()).toEqual(['lead@x.org', 'lead@x.org', 'lead@x.org'])

      vi.stubEnv('SALES_NOTIFY_TO', 'sales@x.org')
      expect(await sendAll()).toEqual(['sales@x.org', 'lead@x.org', 'sales@x.org'])

      vi.stubEnv('CONTACT_NOTIFY_TO', 'contact@x.org')
      vi.stubEnv('SPEAKING_NOTIFY_TO', 'speak@x.org')
      expect(await sendAll()).toEqual(['sales@x.org', 'contact@x.org', 'speak@x.org'])
    } finally {
      send.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('trims padded recipient env values and falls through on whitespace-only ones', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key-int')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const speakingDoc = { eventName: 'S', eventDate: 'd', email: 'a@b.org' } as SpeakingRequest
    try {
      vi.stubEnv('SALES_NOTIFY_TO', ' sales@x.org\n')
      vi.stubEnv('CONTACT_NOTIFY_TO', '   ')
      vi.stubEnv('SPEAKING_NOTIFY_TO', '\t')
      vi.stubEnv('LEAD_NOTIFY_TO', '  lead@x.org ')
      await notifyDemoRequest(payload, demoDoc)
      await notifyContactMessage(payload, contactDoc)
      await notifySpeakingRequest(payload, speakingDoc)
      expect(send.mock.calls.map(([m]) => m.to)).toEqual([
        'sales@x.org',
        'lead@x.org',
        'sales@x.org',
      ])

      send.mockClear()
      vi.stubEnv('LEAD_NOTIFY_TO', '  ')
      await notifyContactMessage(payload, contactDoc)
      expect(send.mock.calls[0][0].to).toBe('info@flowlyst.io')
    } finally {
      send.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('CCs the internal notifications from LEAD_NOTIFY_CC, never the newsletter confirmation', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key-int')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const speakingDoc = { eventName: 'S', eventDate: 'd', email: 'a@b.org' } as SpeakingRequest
    const sendAll = async () => {
      send.mockClear()
      await notifyDemoRequest(payload, demoDoc)
      await notifyContactMessage(payload, contactDoc)
      await notifySpeakingRequest(payload, speakingDoc)
      return send.mock.calls.map(([m]) => m.cc)
    }
    try {
      for (const k of ['SALES', 'CONTACT', 'SPEAKING']) vi.stubEnv(`${k}_NOTIFY_TO`, '')
      vi.stubEnv('LEAD_NOTIFY_TO', 'lead@x.org')

      vi.stubEnv('LEAD_NOTIFY_CC', '')
      expect(await sendAll()).toEqual([undefined, undefined, undefined])

      vi.stubEnv('LEAD_NOTIFY_CC', 'cc1@example.test,cc2@example.test')
      const both = ['cc1@example.test', 'cc2@example.test']
      expect(await sendAll()).toEqual([both, both, both])

      vi.stubEnv('LEAD_NOTIFY_CC', ' cc1@example.test , ,cc2@example.test,, ')
      expect(await sendAll()).toEqual([both, both, both])

      vi.stubEnv('LEAD_NOTIFY_CC', 'not-an-email,cc1@example.test')
      const one = ['cc1@example.test']
      expect(await sendAll()).toEqual([one, one, one])

      vi.stubEnv('LEAD_NOTIFY_CC', 'cc1@example.test,CC1@example.test')
      expect(await sendAll()).toEqual([one, one, one])

      vi.stubEnv('LEAD_NOTIFY_CC', 'Lead@X.org,cc2@example.test')
      expect(await sendAll()).toEqual([
        ['cc2@example.test'],
        ['cc2@example.test'],
        ['cc2@example.test'],
      ])

      vi.stubEnv('LEAD_NOTIFY_CC', 'lead@x.org')
      expect(await sendAll()).toEqual([undefined, undefined, undefined])

      vi.stubEnv('LEAD_NOTIFY_CC', 'cc1@example.test,cc2@example.test')
      send.mockClear()
      await sendNewsletterConfirmation(payload, 'sub@example.test')
      expect(send).toHaveBeenCalledTimes(1)
      expect(send.mock.calls[0][0].to).toBe('sub@example.test')
      expect(send.mock.calls[0][0].cc).toBeUndefined()
    } finally {
      send.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('treats a whitespace-only RESEND_API_KEY as unset', async () => {
    vi.stubEnv('RESEND_API_KEY', ' \n')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    try {
      await notifyDemoRequest(payload, demoDoc)
      expect(send).not.toHaveBeenCalled()
    } finally {
      send.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('logs the error cause on a transport failure, never the key or body', async () => {
    vi.stubEnv('RESEND_API_KEY', 'secret-key-value')
    const failure = new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })
    const send = vi.spyOn(payload, 'sendEmail').mockRejectedValue(failure)
    const errorSpy = vi.spyOn(payload.logger, 'error')
    try {
      await notifyContactMessage(payload, contactDoc)
      const logged = String(errorSpy.mock.calls[0][0])
      expect(logged).toContain('fetch failed')
      expect(logged).toContain('ENOTFOUND')
      expect(logged).not.toContain('secret-key-value')
      expect(logged).not.toContain(contactDoc.message)
    } finally {
      send.mockRestore()
      errorSpy.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('envValue trims, and returns undefined for unset or whitespace-only', () => {
    vi.stubEnv('ENV_VALUE_PROBE', '  abc \n')
    expect(envValue('ENV_VALUE_PROBE')).toBe('abc')
    vi.stubEnv('ENV_VALUE_PROBE', '  ')
    expect(envValue('ENV_VALUE_PROBE')).toBeUndefined()
    vi.unstubAllEnvs()
    expect(envValue('ENV_VALUE_PROBE')).toBeUndefined()
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

// ============== afterChange hooks await their notification (PR #118) ==========

describe('Lead hooks — the send settles before create resolves, and never fails it', () => {
  type LeadCase = {
    label: string
    collection:
      'demo-requests' | 'contact-messages' | 'speaking-requests' | 'newsletter-subscribers'
    data: (tag: string) => Record<string, unknown>
    where: (tag: string) => Record<string, { equals: string }>
  }

  const cases: LeadCase[] = [
    {
      label: 'demo request',
      collection: 'demo-requests',
      data: (tag) => ({
        fullName: 'Await Demo',
        workEmail: `demo-${tag}-${stamp}@district.k12.us`,
        consent: true,
      }),
      where: (tag) => ({ workEmail: { equals: `demo-${tag}-${stamp}@district.k12.us` } }),
    },
    {
      label: 'contact message',
      collection: 'contact-messages',
      data: (tag) => ({
        name: 'Await Contact',
        email: `contact-${tag}-${stamp}@example.org`,
        reason: 'other',
        message: 'hello',
      }),
      where: (tag) => ({ email: { equals: `contact-${tag}-${stamp}@example.org` } }),
    },
    {
      label: 'speaking request',
      collection: 'speaking-requests',
      data: (tag) => ({
        contactName: 'Await Speaking',
        email: `speak-${tag}-${stamp}@assoc.org`,
        eventName: `Await ${tag} ${stamp}`,
        eventDate: 'Fall 2026',
      }),
      where: (tag) => ({ eventName: { equals: `Await ${tag} ${stamp}` } }),
    },
    {
      label: 'newsletter subscriber',
      collection: 'newsletter-subscribers',
      data: (tag) => ({ email: `news-${tag}-${stamp}@example.org` }),
      where: (tag) => ({ email: { equals: `news-${tag}-${stamp}@example.org` } }),
    },
  ]

  async function createLead(c: LeadCase, tag: string) {
    return payload.create({
      collection: c.collection,
      data: c.data(tag) as never,
      // Newsletter create is admin-only; the public path is the /subscribe endpoint.
      overrideAccess: c.collection === 'newsletter-subscribers',
    })
  }

  async function countLeads(c: LeadCase, tag: string) {
    const found = await payload.find({
      collection: c.collection,
      where: c.where(tag),
      overrideAccess: true,
    })
    return found.totalDocs
  }

  for (const c of cases) {
    it(`${c.label}: the send has settled by the time create resolves`, async () => {
      vi.stubEnv('RESEND_API_KEY', 'test-key-int')
      let settled = false
      const send = vi.spyOn(payload, 'sendEmail').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        settled = true
        return undefined as never
      })
      try {
        await createLead(c, 'awaited')
        expect(send).toHaveBeenCalledTimes(1)
        expect(settled, 'create resolved before the send finished (fire-and-forget)').toBe(true)
        expect(await countLeads(c, 'awaited')).toBe(1)
      } finally {
        send.mockRestore()
        vi.unstubAllEnvs()
      }
    })

    it(`${c.label}: a rejecting send leaves the create successful and the row persisted`, async () => {
      vi.stubEnv('RESEND_API_KEY', 'test-key-int')
      const send = vi.spyOn(payload, 'sendEmail').mockRejectedValue(new Error('fetch failed'))
      try {
        const created = await createLead(c, 'rejects')
        expect(created.id).toBeDefined()
        expect(send).toHaveBeenCalledTimes(1)
        expect(await countLeads(c, 'rejects')).toBe(1)
      } finally {
        send.mockRestore()
        vi.unstubAllEnvs()
      }
    })

    it(`${c.label}: a send that never resolves is abandoned at the timeout and the row persists`, async () => {
      vi.stubEnv('RESEND_API_KEY', 'test-key-int')
      const previous = sendTimeout.ms
      sendTimeout.ms = 150
      const send = vi.spyOn(payload, 'sendEmail').mockImplementation(() => new Promise(() => {}))
      const errorSpy = vi.spyOn(payload.logger, 'error')
      try {
        const started = Date.now()
        const created = await createLead(c, 'hangs')
        expect(created.id).toBeDefined()
        expect(Date.now() - started).toBeLessThan(3000)
        expect(send).toHaveBeenCalledTimes(1)
        expect(errorSpy.mock.calls.some(([m]) => String(m).includes('send TIMED OUT'))).toBe(true)
        expect(await countLeads(c, 'hangs')).toBe(1)
      } finally {
        sendTimeout.ms = previous
        errorSpy.mockRestore()
        send.mockRestore()
        vi.unstubAllEnvs()
      }
    })

    it(`${c.label}: a synchronously throwing send leaves the create successful`, async () => {
      vi.stubEnv('RESEND_API_KEY', 'test-key-int')
      const send = vi.spyOn(payload, 'sendEmail').mockImplementation(() => {
        throw new Error('sync boom')
      })
      try {
        const created = await createLead(c, 'throws')
        expect(created.id).toBeDefined()
        expect(send).toHaveBeenCalledTimes(1)
        expect(await countLeads(c, 'throws')).toBe(1)
      } finally {
        send.mockRestore()
        vi.unstubAllEnvs()
      }
    })
  }
})
