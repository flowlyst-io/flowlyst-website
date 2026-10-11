import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { recaptchaGuard, verifyRecaptcha } from '@/utilities/recaptcha'
import { RECAPTCHA_HEADER } from '@/utilities/recaptchaShared'

const fetchMock = vi.fn()

function siteverify(body: object, init: { ok?: boolean } = {}) {
  fetchMock.mockResolvedValueOnce({ ok: init.ok ?? true, json: async () => body })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('RECAPTCHA_SECRET_KEY', 'secret')
  vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site')
  vi.stubEnv('RECAPTCHA_MIN_SCORE', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('verifyRecaptcha', () => {
  it('is skipped with no keys and never calls fetch', async () => {
    vi.stubEnv('RECAPTCHA_SECRET_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '')
    expect(await verifyRecaptcha('tok', 'contact')).toEqual({ outcome: 'skipped' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is skipped when only one key is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '')
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('skipped')
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site')
    vi.stubEnv('RECAPTCHA_SECRET_KEY', '')
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is missing with keys but no token, without calling fetch', async () => {
    expect((await verifyRecaptcha(null, 'contact')).outcome).toBe('missing')
    expect((await verifyRecaptcha('', 'contact')).outcome).toBe('missing')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes a matching action at a high score and posts secret + response', async () => {
    siteverify({ success: true, score: 0.9, action: 'contact' })
    expect(await verifyRecaptcha('tok', 'contact')).toEqual({ outcome: 'pass', score: 0.9 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://www.google.com/recaptcha/api/siteverify')
    const sent = new URLSearchParams(init.body as URLSearchParams)
    expect(sent.get('secret')).toBe('secret')
    expect(sent.get('response')).toBe('tok')
  })

  it('fails a low score', async () => {
    siteverify({ success: true, score: 0.1, action: 'contact' })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('fail')
  })

  it('fails an action mismatch', async () => {
    siteverify({ success: true, score: 0.9, action: 'newsletter' })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('fail')
  })

  it('fails Google’s public test-secret shape (success with no action or score)', async () => {
    siteverify({ success: true, hostname: 'testkey.google.com' })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('fail')
  })

  it('fails a token-side error code but treats a secret-side code as error', async () => {
    siteverify({ success: false, 'error-codes': ['timeout-or-duplicate'] })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('fail')
    siteverify({ success: false, 'error-codes': ['invalid-input-secret'] })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('error')
  })

  it('is error when fetch rejects or times out', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'))
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('error')
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('error')
  })

  it('is error on a 500', async () => {
    siteverify({}, { ok: false })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('error')
  })

  it('honours RECAPTCHA_MIN_SCORE and falls back to 0.5 on garbage', async () => {
    vi.stubEnv('RECAPTCHA_MIN_SCORE', '0.95')
    siteverify({ success: true, score: 0.9, action: 'contact' })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('fail')
    vi.stubEnv('RECAPTCHA_MIN_SCORE', 'banana')
    siteverify({ success: true, score: 0.6, action: 'contact' })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('pass')
    siteverify({ success: true, score: 0.4, action: 'contact' })
    expect((await verifyRecaptcha('tok', 'contact')).outcome).toBe('fail')
  })
})

describe('recaptchaGuard', () => {
  const logger = { warn: vi.fn(), info: vi.fn() }
  const run = (
    over: {
      payloadAPI?: string
      user?: unknown
      operation?: string
      data?: object
      token?: string
    } = {},
  ) => {
    const req = {
      payloadAPI: over.payloadAPI ?? 'REST',
      user: over.user,
      headers: new Headers(over.token ? { [RECAPTCHA_HEADER]: over.token } : {}),
      payload: { logger },
      context: {} as Record<string, unknown>,
    }
    const result = recaptchaGuard('contact')({
      data: over.data ?? {},
      operation: over.operation ?? 'create',
      req,
    } as never)
    return { req, result: Promise.resolve(result) }
  }

  beforeEach(() => {
    logger.warn.mockReset()
  })

  it('does nothing for the Local API or a signed-in user', async () => {
    await run({ payloadAPI: 'local' }).result
    await run({ user: { id: 1 } }).result
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does nothing on update', async () => {
    await run({ operation: 'update' }).result
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a failed check with a 400 on REST and GraphQL', async () => {
    for (const payloadAPI of ['REST', 'GraphQL']) {
      siteverify({ success: true, score: 0.1, action: 'contact' })
      await expect(run({ payloadAPI, token: 'tok' }).result).rejects.toMatchObject({ status: 400 })
    }
  })

  it('accepts missing and error, warns and marks the context', async () => {
    const missing = run()
    await missing.result
    expect(missing.req.context.recaptcha).toMatchObject({ outcome: 'missing' })

    fetchMock.mockRejectedValueOnce(new Error('down'))
    const errored = run({ token: 'tok' })
    await errored.result
    expect(errored.req.context.recaptcha).toMatchObject({ outcome: 'error' })
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })

  it('leaves the context unset on pass', async () => {
    siteverify({ success: true, score: 0.9, action: 'contact' })
    const passed = run({ token: 'tok' })
    await passed.result
    expect(passed.req.context.recaptcha).toBeUndefined()
  })

  it('skips Google when the honeypot is filled', async () => {
    await run({ data: { botField: 'x' }, token: 'tok' }).result
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
