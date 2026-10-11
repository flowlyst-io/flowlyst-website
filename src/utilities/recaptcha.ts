import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import { RECAPTCHA_HEADER, type RecaptchaAction } from './recaptchaShared'

/**
 * Server-side reCAPTCHA v3 verification (ADR 0002). Imports `payload`, so client
 * code must use `recaptchaShared.ts` / `recaptchaClient.ts` instead.
 *
 * Policy: reject only what a real browser running Google's script cannot
 * produce (`fail`); accept and mark everything else, so a blocked script, an
 * unreachable Google or a mistyped secret never loses a lead.
 */

export type RecaptchaOutcome = 'skipped' | 'missing' | 'pass' | 'fail' | 'error'

export type RecaptchaResult = { outcome: RecaptchaOutcome; score?: number; codes?: string[] }

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
const DEFAULT_MIN_SCORE = 0.5
const SECRET_SIDE_CODES = ['missing-input-secret', 'invalid-input-secret']
const TOKEN_SIDE_CODES = ['invalid-input-response', 'timeout-or-duplicate', 'bad-request']

type SiteverifyResponse = {
  success?: boolean
  score?: number
  action?: string
  'error-codes'?: string[]
}

const enabled = (): boolean =>
  Boolean(process.env.RECAPTCHA_SECRET_KEY && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY)

function minScore(): number {
  const parsed = Number.parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? '')
  if (Number.isNaN(parsed)) return DEFAULT_MIN_SCORE
  return Math.min(1, Math.max(0, parsed))
}

export async function verifyRecaptcha(
  token: string | null | undefined,
  action: RecaptchaAction,
): Promise<RecaptchaResult> {
  if (!enabled()) return { outcome: 'skipped' }
  if (!token) return { outcome: 'missing' }

  let body: SiteverifyResponse
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY as string,
        response: token,
      }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return { outcome: 'error' }
    body = (await res.json()) as SiteverifyResponse
  } catch {
    return { outcome: 'error' }
  }

  const codes = body['error-codes'] ?? []
  if (!body.success) {
    if (
      codes.some((c) => TOKEN_SIDE_CODES.includes(c)) &&
      !codes.some((c) => SECRET_SIDE_CODES.includes(c))
    ) {
      return { outcome: 'fail', codes }
    }
    return { outcome: 'error', codes }
  }
  if (typeof body.score !== 'number') return { outcome: 'error' }
  if (body.action !== action || body.score < minScore()) {
    return { outcome: 'fail', score: body.score }
  }
  return { outcome: 'pass', score: body.score }
}

export function recaptchaOutcomeOf(context: unknown): RecaptchaOutcome | undefined {
  const marked = (context as { recaptcha?: { outcome?: RecaptchaOutcome } } | undefined)?.recaptcha
  return marked?.outcome
}

/**
 * Anonymous REST and GraphQL creates only: the Local API (seeds, int tests,
 * `/subscribe`'s own `payload.create`) and the admin UI are never gated. A filled
 * honeypot returns early because the field validator rejects it without Google.
 * The mark in `req.context` is how `afterChange` learns to flag the notification.
 */
export function recaptchaGuard(action: RecaptchaAction): CollectionBeforeChangeHook {
  return async ({ data, operation, req }) => {
    if (operation !== 'create' || req.user || req.payloadAPI === 'local') return data
    if ((data as { botField?: unknown } | undefined)?.botField) return data

    const result = await verifyRecaptcha(req.headers?.get(RECAPTCHA_HEADER), action)
    const detail = `action=${action} outcome=${result.outcome} score=${result.score ?? 'n/a'}`

    if (result.outcome === 'fail') {
      req.payload.logger.warn(
        `[recaptcha] rejected: ${detail} codes=${result.codes?.join(',') ?? ''}`,
      )
      throw new APIError('This submission was flagged as spam.', 400)
    }
    if (result.outcome === 'missing' || result.outcome === 'error') {
      req.payload.logger.warn(`[recaptcha] accepted unverified: ${detail}`)
      req.context.recaptcha = { outcome: result.outcome, score: result.score }
    }
    return data
  }
}
