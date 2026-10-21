// @vitest-environment node
// The lead flow with Bigin (issue #116): REST-shaped creates through the real
// reCAPTCHA guard and the real afterChange hook. Siteverify and Bigin are stubbed at
// `fetch`; nothing here can reach a real Bigin or Zoho (the router throws on "zoho").
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { biginTiming, resetBiginToken } from '@/crm/biginClient'
import { sendTimeout } from '@/email/leadNotifications'
import { RECAPTCHA_HEADER } from '@/utilities/recaptchaShared'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let payload: Payload
const stamp = Date.now()
const realFetch = globalThis.fetch

type Call = { url: string; method: string; body: unknown }
let allUrls: string[]
let biginCalls: Call[]
let dealStatus: number | 'ok' | 'hang'
let siteverifyCalls: number

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const ok = (id: string) => json({ data: [{ code: 'SUCCESS', details: { id } }] })

function stubFetch() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    allUrls.push(url)
    if (url.includes('zoho')) throw new Error(`test reached a real Zoho URL: ${url}`)
    if (url.includes('google.com/recaptcha/api/siteverify')) {
      siteverifyCalls++
      const response = new URLSearchParams(String(init?.body)).get('response') ?? ''
      return json({ success: true, score: 0.9, action: response.replace('fake:', '') })
    }
    if (url.includes('bigin.test')) {
      biginCalls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body && !url.endsWith('/token') ? JSON.parse(String(init.body)) : undefined,
      })
      if (dealStatus === 'hang') return new Promise<Response>(() => {})
      if (url.endsWith('/oauth/v2/token'))
        return json({ access_token: 'tok-int', api_domain: 'https://api.bigin.test' })
      if (url.includes('/search')) return new Response(null, { status: 204 })
      if (url.endsWith('/Accounts')) return ok('acc-1')
      if (url.endsWith('/Contacts')) return ok('con-1')
      if (url.endsWith('/Pipelines'))
        return dealStatus === 'ok' ? ok('deal-1') : json({ code: 'X' }, dealStatus)
    }
    return realFetch(input, init)
  })
}

const api = () => biginCalls.filter((c) => c.url.startsWith('https://api.bigin.test/'))
const pipelines = () => api().filter((c) => c.url.endsWith('/Pipelines'))
const deal = (n = 0) => (pipelines()[n].body as { data: Record<string, unknown>[] }).data[0]

type CrmRow = {
  crmStatus?: string | null
  crmDealId?: string | null
  crmAttempts?: number | null
  crmLastError?: string | null
}
type Kind = 'demo-requests' | 'contact-messages' | 'speaking-requests'
const ACTION: Record<Kind, string> = {
  'demo-requests': 'demo_request',
  'contact-messages': 'contact',
  'speaking-requests': 'speaking_request',
}

/** An anonymous create shaped like the forms' REST POST, through access, guard and hooks. */
function createRest(collection: Kind, data: Record<string, unknown>, withToken = true) {
  const headers = new Headers(withToken ? { [RECAPTCHA_HEADER]: `fake:${ACTION[collection]}` } : {})
  return payload.create({
    collection,
    data: data as never,
    overrideAccess: false,
    req: { payloadAPI: 'REST', headers } as never,
  })
}

const email = (tag: string) => `bg-${tag}-${stamp}@district.test`
const district = `Sample USD ${stamp}`
const demoData = (tag: string, extra: Record<string, unknown> = {}) => ({
  fullName: 'Jordan Rivera',
  workEmail: email(tag),
  district,
  interests: ['budget-software', 'ai-training'],
  message: 'We would like a walkthrough',
  consent: true,
  ...extra,
})

const row = (collection: Kind, id: number) =>
  payload.findByID({ collection, id, overrideAccess: true }) as unknown as Promise<CrmRow>
const retryJobs = () =>
  payload.find({
    collection: 'payload-jobs',
    where: { taskSlug: { equals: 'biginRetry' } },
    overrideAccess: true,
    limit: 50,
  })

function mailTo(send: { mock: { calls: unknown[][] } }, to: string) {
  return send.mock.calls
    .map(([m]) => m as { to: string; subject: string })
    .filter((m) => m.to === to)
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

beforeEach(async () => {
  allUrls = []
  biginCalls = []
  dealStatus = 'ok'
  siteverifyCalls = 0
  resetBiginToken()
  Object.assign(biginTiming, { callMs: 4000, budgetMs: 8000, retryDelayMs: 1 })
  for (const [k, v] of Object.entries({
    RECAPTCHA_SECRET_KEY: 'secret',
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'site',
    RECAPTCHA_SITEVERIFY_URL: '',
    RESEND_API_KEY: 'test-key-int',
    BIGIN_CLIENT_ID: 'test-id',
    BIGIN_CLIENT_SECRET: 'test-secret',
    BIGIN_REFRESH_TOKEN: 'test-refresh',
    BIGIN_ACCOUNTS_URL: 'https://accounts.bigin.test',
    BIGIN_API_DOMAIN: '',
    BIGIN_LEAD_SOURCE_FIELD: '',
    BIGIN_PRODUCT_INTEREST_FIELD: '',
    BIGIN_SUB_PIPELINE_DEMO: '',
    SALES_NOTIFY_TO: 'sales@team.test',
  }))
    vi.stubEnv(k, v)
  stubFetch()
  await payload.delete({
    collection: 'payload-jobs',
    where: { taskSlug: { equals: 'biginRetry' } },
    overrideAccess: true,
  })
})

afterEach(() => {
  expect(allUrls.filter((u) => u.includes('zoho'))).toEqual([])
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  sendTimeout.ms = 5000
})

afterAll(async () => {
  const byStamp = { contains: String(stamp) }
  await Promise.allSettled([
    payload.delete({ collection: 'demo-requests', where: { workEmail: byStamp } }),
    payload.delete({ collection: 'contact-messages', where: { email: byStamp } }),
    payload.delete({ collection: 'speaking-requests', where: { email: byStamp } }),
    payload.delete({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'biginRetry' } },
      overrideAccess: true,
    }),
  ])
})

describe('a verified lead is pushed to Bigin', () => {
  it('sends account, contact and a new deal with the mapped fields, and records the deal', async () => {
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const created = await createRest('demo-requests', demoData('one'))

    const posts = api().filter((c) => c.method === 'POST')
    expect(posts.map((c) => c.url.split('/bigin/v2/')[1])).toEqual([
      'Accounts',
      'Contacts',
      'Pipelines',
    ])
    expect(posts[0].body).toEqual({ data: [{ Account_Name: district }] })
    const contact = (posts[1].body as { data: Record<string, unknown>[] }).data[0]
    expect(contact).toMatchObject({
      First_Name: 'Jordan',
      Last_Name: 'Rivera',
      Email: email('one'),
      Account_Name: { id: 'acc-1' },
    })
    const d = deal()
    const closing = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    expect(d).toMatchObject({
      Deal_Name: `${district} / Jordan Rivera`,
      Sub_Pipeline: 'sales',
      Stage: 'Form Submitted',
      Pipeline: { name: 'Sales Pipeline' },
      Contact_Name: { id: 'con-1' },
      Account_Name: { id: 'acc-1' },
    })
    expect(Math.abs(Date.parse(String(d.Closing_Date)) - Date.parse(closing))).toBeLessThanOrEqual(
      86400000,
    )
    expect(String(d.Description)).toContain(email('one'))
    expect(String(d.Description)).toContain('We would like a walkthrough')
    expect((posts[2].body as { trigger: string[] }).trigger).toEqual(['workflow'])
    expect(d).not.toHaveProperty('Lead_Source')
    expect(d).not.toHaveProperty('Product_Interest')

    const saved = await row('demo-requests', created.id)
    expect(saved).toMatchObject({
      crmStatus: 'sent',
      crmDealId: 'deal-1',
      crmAttempts: 1,
      crmLastError: null,
    })
    expect(mailTo(send, 'sales@team.test')).toHaveLength(1)
  })

  it('creates a new deal for every request from the same email', async () => {
    await createRest('demo-requests', demoData('twice'))
    await createRest('demo-requests', demoData('twice'))
    expect(pipelines()).toHaveLength(2)
  })

  it('fills Lead Source, Product Interest and the sub-pipeline from configuration', async () => {
    vi.stubEnv('BIGIN_LEAD_SOURCE_FIELD', 'Lead_Source')
    vi.stubEnv('BIGIN_PRODUCT_INTEREST_FIELD', 'Product_Interest')
    vi.stubEnv('BIGIN_SUB_PIPELINE_DEMO', 'Website Leads')

    await createRest('demo-requests', demoData('cfg'))
    expect(deal(0)).toMatchObject({
      Lead_Source: 'Website – Demo',
      Product_Interest: ['Budget Software', 'AI Training'],
      Sub_Pipeline: 'Website Leads',
    })

    await createRest('contact-messages', {
      name: 'Pat Lee',
      email: email('c1'),
      reason: 'training',
      message: 'Training please',
    })
    expect(deal(1)).toMatchObject({
      Deal_Name: 'Pat Lee',
      Lead_Source: 'Website – Contact',
      Product_Interest: ['AI Training'],
      Sub_Pipeline: 'sales',
    })
    expect(api().filter((c) => c.url.includes('Accounts'))).toHaveLength(2) // demo search + insert only

    await createRest('contact-messages', {
      name: 'Pat Lee',
      email: email('c2'),
      reason: 'press',
      message: 'Press question',
    })
    expect(deal(2)).not.toHaveProperty('Product_Interest')
    expect(deal(2)).toMatchObject({ Lead_Source: 'Website – Contact' })

    await createRest('speaking-requests', {
      contactName: 'Sam Host',
      email: email('s1'),
      organization: 'State Association',
      eventName: 'Fall Conference',
      eventDate: 'Fall 2027',
    })
    expect(deal(3)).toMatchObject({
      Deal_Name: 'State Association / Sam Host',
      Sub_Pipeline: 'Keynotes',
      Lead_Source: 'Website – Speaking',
      Product_Interest: ['Keynote'],
    })
  })
})

describe('Bigin trouble never loses the lead', () => {
  it('flags a failed push, keeps the row and the team email, and queues a retry', async () => {
    dealStatus = 503
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const created = await createRest('demo-requests', demoData('fail'))

    expect(created.id).toBeDefined()
    const saved = await row('demo-requests', created.id)
    expect(saved.crmStatus).toBe('failed')
    expect(saved.crmLastError).toContain('503')
    expect(mailTo(send, 'sales@team.test')).toHaveLength(1)
    const jobs = await retryJobs()
    expect(jobs.docs).toHaveLength(1)
    expect(jobs.docs[0].input).toEqual({ collection: 'demo-requests', id: created.id })
  })

  it('retries from the queue until it is in Bigin', async () => {
    dealStatus = 503
    const created = await createRest('demo-requests', demoData('retry'))
    dealStatus = 'ok'
    await payload.jobs.run()
    expect(await row('demo-requests', created.id)).toMatchObject({
      crmStatus: 'sent',
      crmAttempts: 2,
      crmDealId: 'deal-1',
    })
  })

  it('a retry that fails again waits for a later run instead of looping', async () => {
    dealStatus = 503
    const created = await createRest('demo-requests', demoData('again'))
    await payload.jobs.run()
    expect(await row('demo-requests', created.id)).toMatchObject({
      crmStatus: 'failed',
      crmAttempts: 2,
    })
    const jobs = await retryJobs()
    expect(jobs.docs).toHaveLength(1)
    expect(Date.parse(String(jobs.docs[0].waitUntil))).toBeGreaterThan(Date.now())
  })

  it('stops retrying at four attempts and leaves the row failed', async () => {
    dealStatus = 503
    const lead = await payload.create({
      collection: 'demo-requests',
      data: { ...demoData('cap'), crmStatus: 'failed', crmAttempts: 3 } as never,
    })
    await payload.jobs.queue({
      task: 'biginRetry',
      input: { collection: 'demo-requests', id: lead.id },
    })
    await payload.jobs.run()
    expect(await row('demo-requests', lead.id)).toMatchObject({
      crmStatus: 'failed',
      crmAttempts: 4,
    })
    expect((await retryJobs()).docs).toHaveLength(0)
  })

  it('a hung Bigin is cut off at the budget and the create still resolves', async () => {
    dealStatus = 'hang'
    biginTiming.budgetMs = 300
    const started = Date.now()
    const created = await createRest('demo-requests', demoData('hang'))
    expect(Date.now() - started).toBeLessThan(3000)
    expect((await row('demo-requests', created.id)).crmStatus).toBe('failed')
  })

  it('a failing status write and a failing queue still return the saved lead', async () => {
    dealStatus = 503
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    vi.spyOn(payload, 'update').mockRejectedValueOnce(new Error('db write failed'))
    vi.spyOn(payload.jobs, 'queue').mockRejectedValue(new Error('queue down'))

    const created = await createRest('demo-requests', demoData('post'))
    expect(created.id).toBeDefined()
    const found = await payload.find({
      collection: 'demo-requests',
      where: { workEmail: { equals: email('post') } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
    expect(mailTo(send, 'sales@team.test')).toHaveLength(1)
  })
})

describe('only a reCAPTCHA pass reaches Bigin and the submitter', () => {
  it('no token: saved, flagged unverified, nothing sent to Bigin, only the team email', async () => {
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const created = await createRest('demo-requests', demoData('notok'), false)

    expect(biginCalls).toHaveLength(0)
    expect((await row('demo-requests', created.id)).crmStatus).toBe('unverified')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].subject).toMatch(/^\[Unverified\]/)
  })

  it('reCAPTCHA keys unset: counted unverified, one team email, no confirmation', async () => {
    vi.stubEnv('RECAPTCHA_SECRET_KEY', '')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const created = await createRest('demo-requests', demoData('nokeys'))

    expect(biginCalls).toHaveLength(0)
    expect((await row('demo-requests', created.id)).crmStatus).toBe('unverified')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].to).toBe('sales@team.test')
  })

  it('pass with Bigin credentials unset: marked off, team email and confirmation sent', async () => {
    vi.stubEnv('BIGIN_REFRESH_TOKEN', '')
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const created = await createRest('demo-requests', demoData('off'))

    expect(biginCalls).toHaveLength(0)
    expect((await row('demo-requests', created.id)).crmStatus).toBe('off')
    expect(send).toHaveBeenCalledTimes(2)
    expect(mailTo(send, email('off'))).toHaveLength(1)
    expect(mailTo(send, 'sales@team.test')).toHaveLength(1)
  })

  it('a plain Local API create touches neither siteverify nor Bigin', async () => {
    const send = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const lead = await payload.create({
      collection: 'demo-requests',
      data: demoData('local') as never,
    })

    expect(siteverifyCalls).toBe(0)
    expect(biginCalls).toHaveLength(0)
    expect((await row('demo-requests', lead.id)).crmStatus).toBe('not-sent')
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe('the lead is durable before any network call', () => {
  it('is visible to another connection while the emails are still sending', async () => {
    sendTimeout.ms = 10000
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const send = vi.spyOn(payload, 'sendEmail').mockImplementation(async () => {
      await gate
      return undefined as never
    })
    const pending = createRest('demo-requests', demoData('commit'))
    await vi.waitFor(() => expect(send).toHaveBeenCalled(), { timeout: 5000 })

    const found = await payload.find({
      collection: 'demo-requests',
      where: { workEmail: { equals: email('commit') } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
    release()
    await pending
  })
})

describe('CRM fields stay private', () => {
  it('are absent from the anonymous response and cannot be set by the submitter', async () => {
    const created = await createRest(
      'demo-requests',
      demoData('priv', { crmStatus: 'sent', crmDealId: 'forged' }),
      false,
    )
    for (const key of ['crmStatus', 'crmDealId', 'crmLastError', 'crmAttempts'])
      expect(created).not.toHaveProperty(key)
    expect(await row('demo-requests', created.id)).toMatchObject({
      crmStatus: 'unverified',
      crmDealId: null,
    })
  })
})
