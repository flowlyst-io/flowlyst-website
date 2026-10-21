/**
 * SERVER-ONLY: holds the Zoho OAuth secrets. Never import this from a client component.
 *
 * Plain `fetch` against the Bigin REST API (ADR 0004). Every call is bounded by one
 * overall deadline and nothing here logs a token, a secret or a request body: logs
 * carry the path, the HTTP status and Zoho's error code only.
 */
import type { BiginConfig } from './biginConfig'

/** Mutable only so tests can shorten it; production always uses the defaults. */
export const biginTiming = { callMs: 4000, budgetMs: 8000, retryDelayMs: 500 }

const TOKEN_TTL_MS = 55 * 60 * 1000

export type BiginLogger = { warn: (message: string) => void; error: (message: string) => void }

export class BiginError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'BiginError'
  }
}

type TokenCache = { key: string; token: string; apiDomain: string | undefined; expiresAt: number }
let tokenCache: TokenCache | null = null

export function resetBiginToken(): void {
  tokenCache = null
}

export type BiginContext = { config: BiginConfig; deadline: AbortSignal; log?: BiginLogger }

/**
 * Rejects when `signal` aborts even if the underlying promise ignores it, so a hung
 * transport (or a test stub that never settles) cannot outlive the deadline.
 */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  promise.catch(() => {})
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'))
    const onAbort = () => reject(new Error('aborted'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

const callSignal = (deadline: AbortSignal) =>
  AbortSignal.any([AbortSignal.timeout(biginTiming.callMs), deadline])

async function pause(ms: number, deadline: AbortSignal): Promise<void> {
  await abortable(new Promise<void>((resolve) => setTimeout(resolve, ms)), deadline)
}

async function getToken(
  ctx: BiginContext,
): Promise<{ token: string; apiDomain: string | undefined }> {
  const { config, deadline } = ctx
  const key = `${config.accountsUrl}|${config.clientId}|${config.refreshToken}`
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt > Date.now()) return tokenCache

  const signal = callSignal(deadline)
  let res: Response
  try {
    res = await abortable(
      fetch(`${config.accountsUrl}/oauth/v2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId ?? '',
          client_secret: config.clientSecret ?? '',
          refresh_token: config.refreshToken ?? '',
        }),
        signal,
      }),
      signal,
    )
  } catch {
    throw new BiginError('token request failed: network or timeout')
  }
  let data: { access_token?: string; api_domain?: string; error?: string } = {}
  try {
    data = (await abortable(res.json(), signal)) as typeof data
  } catch {
    // Non-JSON body: handled by the checks below.
  }
  if (!res.ok || !data.access_token) {
    throw new BiginError(
      `token request rejected: ${data.error ?? 'no access_token'}`,
      res.ok ? undefined : res.status,
    )
  }
  tokenCache = {
    key,
    token: data.access_token,
    apiDomain: data.api_domain,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  }
  return tokenCache
}

type BiginResponse = {
  code?: string
  message?: string
  data?: Array<{ id?: string; code?: string; message?: string; details?: { id?: string } }>
}

/**
 * One call to `/bigin/v2/<path>` with the retry rules (401 once with a fresh token,
 * 429/5xx/network once after a pause). Returns the final status and parsed body;
 * interpreting it is the caller's job.
 */
async function biginCall(
  ctx: BiginContext,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; parsed: BiginResponse }> {
  const { config, deadline, log } = ctx
  const label = path.split('?')[0]
  let authRetried = false
  let transientRetried = false

  for (;;) {
    const { token, apiDomain } = await getToken(ctx)
    const base = config.apiDomain ?? apiDomain
    if (!base) throw new BiginError('no API domain: set BIGIN_API_DOMAIN')
    const signal = callSignal(deadline)

    let res: Response | undefined
    try {
      res = await abortable(
        fetch(`${base.replace(/\/+$/, '')}/bigin/v2/${path}`, {
          method,
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal,
        }),
        signal,
      )
    } catch {
      if (deadline.aborted || transientRetried) {
        log?.warn(`[bigin] ${label}: network error or timeout`)
        throw new BiginError(`${label}: network error or timeout`)
      }
      transientRetried = true
      await pause(biginTiming.retryDelayMs, deadline)
      continue
    }

    if (res.status === 401 && !authRetried) {
      authRetried = true
      resetBiginToken()
      continue
    }
    if ((res.status === 429 || res.status >= 500) && !transientRetried) {
      transientRetried = true
      await pause(biginTiming.retryDelayMs, deadline)
      continue
    }

    let parsed: BiginResponse = {}
    try {
      parsed = (await abortable(res.json(), signal)) as BiginResponse
    } catch {
      // 204 or a non-JSON error page: the status alone is reported.
    }
    return { status: res.status, parsed }
  }
}

function failure(
  ctx: BiginContext,
  path: string,
  status: number,
  parsed: BiginResponse,
): BiginError {
  const first = parsed.data?.[0]
  const code = first?.code ?? parsed.code ?? 'UNKNOWN'
  const message = first?.message ?? parsed.message ?? ''
  ctx.log?.warn(`[bigin] ${path}: HTTP ${status} ${code}`)
  return new BiginError(`${path}: HTTP ${status} ${code}${message ? `: ${message}` : ''}`, status)
}

/** Inserts one record and returns its id. Success only when `data[0].code === 'SUCCESS'`. */
async function insertRecord(ctx: BiginContext, path: string, body: unknown): Promise<string> {
  const { status, parsed } = await biginCall(ctx, 'POST', path, body)
  const first = parsed.data?.[0]
  if (status >= 200 && status < 300 && first?.code === 'SUCCESS' && first.details?.id)
    return first.details.id
  throw failure(ctx, path, status, parsed)
}

/**
 * Looks a record up and returns the id of the first match, or undefined for none
 * (Bigin answers 204 with no body). A match is only ever linked, never written to.
 */
async function findId(ctx: BiginContext, path: string): Promise<string | undefined> {
  const { status, parsed } = await biginCall(ctx, 'GET', path)
  if (status === 204) return undefined
  const id = parsed.data?.[0]?.id
  if (status === 200 && id) return id
  if (status === 200) return undefined
  throw failure(ctx, path.split('?')[0], status, parsed)
}

// Zoho criteria values escape these characters with a backslash.
const escapeCriteria = (value: string) => value.replace(/([\\():,])/g, '\\$1')

/** An existing account is reused untouched; a new name is inserted. */
export async function findOrCreateAccount(ctx: BiginContext, name: string): Promise<string> {
  const criteria = encodeURIComponent(`(Account_Name:equals:${escapeCriteria(name)})`)
  return (
    (await findId(ctx, `Accounts/search?criteria=${criteria}`)) ??
    (await insertRecord(ctx, 'Accounts', { data: [{ Account_Name: name }] }))
  )
}

/**
 * An existing contact is reused with its fields untouched, so a form can never rewrite
 * someone else's record by typing their email; a new email is inserted.
 */
export async function findOrCreateContact(
  ctx: BiginContext,
  fields: Record<string, unknown> & { Email: string },
): Promise<string> {
  return (
    (await findId(ctx, `Contacts/search?email=${encodeURIComponent(fields.Email)}`)) ??
    (await insertRecord(ctx, 'Contacts', { data: [fields] }))
  )
}

export const createDeal = (ctx: BiginContext, fields: Record<string, unknown>): Promise<string> =>
  insertRecord(ctx, 'Pipelines', { data: [fields], trigger: ['workflow'] })
