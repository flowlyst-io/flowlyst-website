// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { biginTiming, resetBiginToken } from '@/crm/biginClient'
import { biginConfig, DEFAULT_PRODUCT_INTEREST_VALUES } from '@/crm/biginConfig'
import { splitName, toBiginLead } from '@/crm/leadToBigin'
import { pushLead } from '@/crm/pushLead'
import type { DemoRequest } from '@/payload-types'

const SECRET = 'client-secret-xyz'
const REFRESH = 'refresh-token-abc'

const demo = {
  fullName: 'Jordan Rivera',
  workEmail: 'jordan@district.test',
  district: 'Sample Unified School District',
  interests: ['budget-software'],
} as DemoRequest

type Call = { url: string; init?: RequestInit }
let calls: Call[]
let route: (call: Call) => Response | Promise<Response>
let tokenCount: number
const logs: string[] = []
const log = {
  warn: (m: string) => void logs.push(m),
  error: (m: string) => void logs.push(m),
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const ok = (id: string) => json({ data: [{ code: 'SUCCESS', details: { id } }] })

function happyRoute({ url }: Call): Response {
  if (url.endsWith('/oauth/v2/token'))
    return json({ access_token: `tok-${++tokenCount}`, api_domain: 'https://api.bigin.test' })
  if (url.includes('/Accounts/search') || url.includes('/Contacts/search'))
    return new Response(null, { status: 204 })
  if (url.endsWith('/Accounts')) return ok('acc-1')
  if (url.endsWith('/Contacts')) return ok('con-1')
  if (url.endsWith('/Pipelines')) return ok('deal-1')
  return json({}, 404)
}

beforeEach(() => {
  calls = []
  logs.length = 0
  tokenCount = 0
  route = happyRoute
  resetBiginToken()
  Object.assign(biginTiming, { callMs: 4000, budgetMs: 8000, retryDelayMs: 1 })
  for (const [k, v] of Object.entries({
    BIGIN_CLIENT_ID: 'client-id-1',
    BIGIN_CLIENT_SECRET: SECRET,
    BIGIN_REFRESH_TOKEN: REFRESH,
    BIGIN_ACCOUNTS_URL: 'https://accounts.bigin.test',
    BIGIN_API_DOMAIN: '',
    BIGIN_PIPELINE_ID: '',
    BIGIN_LEAD_SOURCE_FIELD: '',
    BIGIN_PRODUCT_INTEREST_FIELD: '',
    BIGIN_PRODUCT_INTEREST_VALUES: '',
  }))
    vi.stubEnv(k, v)
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('zoho')) throw new Error(`test reached a real Zoho URL: ${url}`)
    const call = { url, init }
    calls.push(call)
    return route(call)
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const bodyOf = (c: Call) => JSON.parse(String(c.init?.body))
const callsTo = (suffix: string) => calls.filter((c) => c.url.endsWith(suffix))

describe('splitName', () => {
  it('splits first and last, keeps a middle name in the first part, and allows one word', () => {
    expect(splitName('Jordan Rivera')).toEqual({ First_Name: 'Jordan', Last_Name: 'Rivera' })
    expect(splitName('Mary Ann Lee')).toEqual({ First_Name: 'Mary Ann', Last_Name: 'Lee' })
    expect(splitName('Cher')).toEqual({ Last_Name: 'Cher' })
  })
})

describe('biginConfig', () => {
  it('has the documented defaults when nothing is set', () => {
    for (const name of [
      'BIGIN_CLIENT_ID',
      'BIGIN_CLIENT_SECRET',
      'BIGIN_REFRESH_TOKEN',
      'BIGIN_ACCOUNTS_URL',
    ])
      vi.stubEnv(name, '')
    const c = biginConfig()
    expect(c.enabled).toBe(false)
    expect(c.accountsUrl).toBe('https://accounts.zoho.com')
    expect(c.pipelineName).toBe('Sales Pipeline')
    expect(c.stage).toBe('Form Submitted')
    expect(c.subPipeline).toEqual({ demo: 'sales', contact: 'sales', speaking: 'Keynotes' })
    expect(c.leadSource).toEqual({
      demo: 'Website – Demo',
      contact: 'Website – Contact',
      speaking: 'Website – Speaking',
    })
    expect(c.leadSourceField).toBeUndefined()
    expect(c.productInterestField).toBeUndefined()
    expect(c.productInterestValues).toEqual(DEFAULT_PRODUCT_INTEREST_VALUES)
    expect(c.closingDays).toBe(30)
  })

  it('is enabled only with all three credentials', () => {
    expect(biginConfig().enabled).toBe(true)
    vi.stubEnv('BIGIN_REFRESH_TOKEN', '  ')
    expect(biginConfig().enabled).toBe(false)
  })

  it('falls back to the defaults, with one warning, on malformed product values', () => {
    vi.stubEnv('BIGIN_PRODUCT_INTEREST_VALUES', '{not json')
    const warn = vi.fn()
    expect(biginConfig(warn).productInterestValues).toEqual(DEFAULT_PRODUCT_INTEREST_VALUES)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('merges valid product values over the defaults', () => {
    vi.stubEnv('BIGIN_PRODUCT_INTEREST_VALUES', '{"consulting":"Automation"}')
    expect(biginConfig().productInterestValues).toEqual({
      ...DEFAULT_PRODUCT_INTEREST_VALUES,
      consulting: 'Automation',
    })
  })
})

describe('toBiginLead', () => {
  it('builds the deal with the closing date counted in UTC days', () => {
    const lead = toBiginLead('demo', demo, biginConfig(), new Date('2026-10-20T23:30:00Z'))
    expect(lead.deal.Closing_Date).toBe('2026-11-19')
    expect(lead.deal.Deal_Name).toBe('Sample Unified School District / Jordan Rivera')
    expect(lead.deal).not.toHaveProperty('Lead_Source')
  })
})

describe('pushLead', () => {
  it('sends account, contact and deal with the OAuth header and one token for two pushes', async () => {
    expect(await pushLead('demo', demo, log)).toEqual({ ok: true, dealId: 'deal-1' })
    expect(await pushLead('demo', demo, log)).toEqual({ ok: true, dealId: 'deal-1' })

    const tokenCalls = callsTo('/oauth/v2/token')
    expect(tokenCalls).toHaveLength(1)
    const form = new URLSearchParams(String(tokenCalls[0].init?.body))
    expect(Object.fromEntries(form)).toEqual({
      grant_type: 'refresh_token',
      client_id: 'client-id-1',
      client_secret: SECRET,
      refresh_token: REFRESH,
    })
    const api = calls.filter((c) => c.url.startsWith('https://api.bigin.test/bigin/v2/'))
    expect(api).toHaveLength(10)
    for (const c of api)
      expect((c.init?.headers as Record<string, string>).Authorization).toBe(
        'Zoho-oauthtoken tok-1',
      )
    expect(bodyOf(callsTo('/Pipelines')[0]).trigger).toEqual(['workflow'])
  })

  it('refreshes the token once on a 401 and retries the call with the new one', async () => {
    let first = true
    route = (call) => {
      if (call.url.includes('/Contacts/search') && first) {
        first = false
        return json({ code: 'INVALID_TOKEN', message: 'expired', status: 'error' }, 401)
      }
      return happyRoute(call)
    }
    expect(await pushLead('demo', demo, log)).toEqual({ ok: true, dealId: 'deal-1' })
    expect(callsTo('/oauth/v2/token')).toHaveLength(2)
    const contacts = calls.filter((c) => c.url.includes('/Contacts/search'))
    expect(contacts).toHaveLength(2)
    expect((contacts[1].init?.headers as Record<string, string>).Authorization).toBe(
      'Zoho-oauthtoken tok-2',
    )
  })

  it('retries once after a 429', async () => {
    let first = true
    route = (call) => {
      if (call.url.endsWith('/Pipelines') && first) {
        first = false
        return json({ code: 'TOO_MANY_REQUESTS' }, 429)
      }
      return happyRoute(call)
    }
    expect(await pushLead('demo', demo, log)).toEqual({ ok: true, dealId: 'deal-1' })
    expect(callsTo('/Pipelines')).toHaveLength(2)
  })

  it('gives up after a second 503 and reports the status', async () => {
    route = (call) => (call.url.endsWith('/Pipelines') ? json({}, 503) : happyRoute(call))
    const result = await pushLead('demo', demo, log)
    expect(callsTo('/Pipelines')).toHaveLength(2)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('503')
  })

  it('does not retry a rejected request and reports Zoho code', async () => {
    route = (call) =>
      call.url.endsWith('/Pipelines')
        ? json({ code: 'INVALID_DATA', message: 'bad stage', status: 'error' }, 400)
        : happyRoute(call)
    const result = await pushLead('demo', demo, log)
    expect(callsTo('/Pipelines')).toHaveLength(1)
    expect(!result.ok && result.error).toContain('INVALID_DATA')
  })

  it('is not a success when a 200 carries a non-SUCCESS code', async () => {
    route = (call) =>
      call.url.endsWith('/Contacts')
        ? json({ data: [{ code: 'MANDATORY_NOT_FOUND', message: 'Last_Name' }] })
        : happyRoute(call)
    const result = await pushLead('demo', demo, log)
    expect(result.ok).toBe(false)
    expect(callsTo('/Pipelines')).toHaveLength(0)
  })

  it('returns not-ok within the budget when the transport never answers', async () => {
    biginTiming.budgetMs = 300
    route = () => new Promise<Response>(() => {})
    const started = Date.now()
    const result = await pushLead('demo', demo, log)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(result.ok).toBe(false)
  })

  it('reports a missing API domain instead of throwing', async () => {
    vi.stubEnv('BIGIN_API_DOMAIN', '')
    route = (call) =>
      call.url.endsWith('/oauth/v2/token') ? json({ access_token: 'tok' }) : happyRoute(call)
    const result = await pushLead('demo', demo, log)
    expect(result.ok).toBe(false)
  })

  it('does nothing when Bigin is not configured', async () => {
    vi.stubEnv('BIGIN_CLIENT_ID', '')
    expect(await pushLead('demo', demo, log)).toEqual({
      ok: false,
      error: 'Bigin is not configured',
    })
    expect(calls).toHaveLength(0)
  })

  it('links an existing contact and account without writing to them', async () => {
    route = (call) => {
      if (call.url.includes('/Accounts/search'))
        return json({ data: [{ id: 'acc-old', Account_Name: 'x' }] })
      if (call.url.includes('/Contacts/search'))
        return json({ data: [{ id: 'con-old', Email: 'jordan@district.test' }] })
      return happyRoute(call)
    }
    expect(await pushLead('demo', demo, log)).toEqual({ ok: true, dealId: 'deal-1' })

    const api = calls.filter((c) => c.url.startsWith('https://api.bigin.test/'))
    expect(api.filter((c) => c.init?.method === 'POST').map((c) => c.url)).toEqual([
      'https://api.bigin.test/bigin/v2/Pipelines',
    ])
    expect(calls.some((c) => /upsert|PUT/.test(c.url + (c.init?.method ?? '')))).toBe(false)
    expect(decodeURIComponent(api[0].url)).toContain(
      'Accounts/search?criteria=(Account_Name:equals:Sample Unified School District)',
    )
    expect(api[1].url).toContain('Contacts/search?email=jordan%40district.test')
    const deal = bodyOf(callsTo('/Pipelines')[0]).data[0]
    expect(deal.Contact_Name).toEqual({ id: 'con-old' })
    expect(deal.Account_Name).toEqual({ id: 'acc-old' })
  })

  it('inserts the account and contact when the search finds nothing', async () => {
    expect(await pushLead('demo', demo, log)).toEqual({ ok: true, dealId: 'deal-1' })
    expect(bodyOf(callsTo('/Accounts')[0])).toEqual({
      data: [{ Account_Name: 'Sample Unified School District' }],
    })
    const contact = bodyOf(callsTo('/Contacts')[0]).data[0]
    expect(contact).toMatchObject({
      First_Name: 'Jordan',
      Last_Name: 'Rivera',
      Email: 'jordan@district.test',
      Account_Name: { id: 'acc-1' },
    })
  })

  it('never logs a secret, a refresh token or an access token', async () => {
    route = (call) => (call.url.endsWith('/Pipelines') ? json({}, 503) : happyRoute(call))
    await pushLead('demo', demo, log)
    expect(logs.length).toBeGreaterThan(0)
    for (const line of logs) {
      expect(line).not.toContain(SECRET)
      expect(line).not.toContain(REFRESH)
      expect(line).not.toContain('tok-1')
    }
  })
})
