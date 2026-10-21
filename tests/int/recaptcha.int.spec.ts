// @vitest-environment node
// reCAPTCHA wiring on the lead paths (issue #103, ADR 0002). Siteverify is mocked;
// every other fetch falls through to the real one.
import { getPayload, type Payload, type PayloadRequest } from 'payload'

import config from '@/payload.config'
import type { DemoRequest } from '@/payload-types'
import { notifyDemoRequest } from '@/email/leadNotifications'
import { RECAPTCHA_HEADER } from '@/utilities/recaptchaShared'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let payload: Payload
const stamp = Date.now()
const realFetch = globalThis.fetch
const siteverify = vi.fn()

function subscribeHandler() {
  const col = payload.config.collections.find((c) => c.slug === 'newsletter-subscribers')
  const ep = col?.endpoints ? col.endpoints.find((e) => e.path === '/subscribe') : undefined
  if (!ep) throw new Error('newsletter /subscribe endpoint not found on the collection config')
  return ep.handler
}

async function subscribe(email: string, token?: string) {
  const text = JSON.stringify({ email })
  const req = {
    payload,
    method: 'POST',
    body: text,
    headers: new Headers({
      'Content-Type': 'application/json',
      'Content-Length': String(text.length),
      ...(token ? { [RECAPTCHA_HEADER]: token } : {}),
    }),
    text: async () => text,
  } as unknown as PayloadRequest
  const res = await subscribeHandler()(req)
  return { status: res.status, json: await res.json() }
}

const rows = (email: string) =>
  payload.find({
    collection: 'newsletter-subscribers',
    where: { email: { equals: email } },
    overrideAccess: true,
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

beforeEach(() => {
  siteverify.mockReset()
  vi.stubEnv('RECAPTCHA_SECRET_KEY', 'secret')
  vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site')
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).includes('google.com/recaptcha/api/siteverify')
      ? siteverify(input, init)
      : realFetch(input, init),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

afterAll(async () => {
  const byStamp = { contains: String(stamp) }
  await Promise.allSettled([
    payload.delete({ collection: 'demo-requests', where: { workEmail: byStamp } }),
    payload.delete({ collection: 'newsletter-subscribers', where: { email: byStamp } }),
  ])
})

describe('reCAPTCHA on the lead paths', () => {
  it('never gates a Local API create, even with keys set', async () => {
    const created = await payload.create({
      collection: 'demo-requests',
      data: {
        fullName: 'Seed Person',
        workEmail: `rc-local-${stamp}@district.k12.us`,
        consent: true,
      },
    })
    expect(created.id).toBeTruthy()
    expect(siteverify).not.toHaveBeenCalled()
  })

  it('/subscribe rejects a low-score token with the uniform ok and persists nothing', async () => {
    const email = `rc-low-${stamp}@district.k12.us`
    siteverify.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.1, action: 'newsletter' }),
    })
    const res = await subscribe(email, 'tok')
    expect(res).toEqual({ status: 200, json: { ok: true } })
    expect(siteverify).toHaveBeenCalledTimes(1)
    expect((await rows(email)).docs).toHaveLength(0)
  })

  it('/subscribe persists on a passing token', async () => {
    const email = `rc-pass-${stamp}@district.k12.us`
    siteverify.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, score: 0.9, action: 'newsletter' }),
    })
    expect(await subscribe(email, 'tok')).toEqual({ status: 200, json: { ok: true } })
    expect((await rows(email)).docs).toHaveLength(1)
  })

  it('/subscribe accepts a token-less submission and warns', async () => {
    const email = `rc-missing-${stamp}@district.k12.us`
    const warn = vi.spyOn(payload.logger, 'warn')
    expect(await subscribe(email)).toEqual({ status: 200, json: { ok: true } })
    expect(siteverify).not.toHaveBeenCalled()
    expect((await rows(email)).docs).toHaveLength(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('outcome=missing'))
  })

  it('/subscribe still persists when Google is unreachable', async () => {
    const email = `rc-down-${stamp}@district.k12.us`
    siteverify.mockRejectedValue(new Error('network down'))
    expect(await subscribe(email, 'tok')).toEqual({ status: 200, json: { ok: true } })
    expect((await rows(email)).docs).toHaveLength(1)
  })

  describe('newsletter confirmation only on a pass', () => {
    const pass = () =>
      siteverify.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, score: 0.9, action: 'newsletter' }),
      })
    const toSubscriber = (send: { mock: { calls: unknown[][] } }, email: string) =>
      send.mock.calls.filter(([m]) => (m as { to?: string }).to === email)

    beforeEach(() => vi.stubEnv('RESEND_API_KEY', 'test-key-int'))

    it('sends one confirmation on a pass and none without a token', async () => {
      const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
      const passed = `rc-nl-pass-${stamp}@district.k12.us`
      pass()
      await subscribe(passed, 'tok')
      expect(toSubscriber(send, passed)).toHaveLength(1)

      const bare = `rc-nl-none-${stamp}@district.k12.us`
      await subscribe(bare)
      expect(toSubscriber(send, bare)).toHaveLength(0)
      expect((await rows(bare)).docs).toHaveLength(1)
    })

    it('re-subscribe confirms only on a pass', async () => {
      const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
      const email = `rc-nl-resub-${stamp}@district.k12.us`
      await subscribe(email)
      await subscribe(email)
      expect(toSubscriber(send, email)).toHaveLength(0)

      pass()
      await subscribe(email, 'tok')
      expect(toSubscriber(send, email)).toHaveLength(1)
    })
  })

  it('marks the sales notification subject only for an unverified outcome', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key-int')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const doc = { fullName: 'Pat Lee', workEmail: `rc-mail-${stamp}@d.us` } as DemoRequest

    await notifyDemoRequest(payload, doc, 'missing')
    expect(send.mock.calls[0][0].subject).toBe('[Unverified] New demo request — Pat Lee')
    expect(String(send.mock.calls[0][0].text)).toContain('reCAPTCHA could not verify')

    await notifyDemoRequest(payload, doc)
    expect(send.mock.calls[1][0].subject).toBe('New demo request — Pat Lee')
  })
})
