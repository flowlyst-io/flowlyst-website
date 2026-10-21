// A local stand-in for Zoho (OAuth + Bigin) and Google reCAPTCHA, for trying the lead flow
// under `pnpm dev` without touching a real account. See docs/development.md,
// "Trying the Bigin push locally". Fake values only; it accepts any credentials.
import { createServer, type IncomingMessage } from 'node:http'

const port = Number(process.env.FAKE_BIGIN_PORT ?? 4555)

type Logged = { method: string; path: string; authorization?: string; body: unknown }
let requests: Logged[] = []
let mode: 'none' | 'deal-503' = 'none'
let counters = { token: 0, acc: 0, con: 0, deal: 0 }
let accounts = new Map<string, string>()
let contacts = new Map<string, string>()

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const success = (id: string) => ({
  data: [{ code: 'SUCCESS', status: 'success', details: { id } }],
})

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  const raw = await readBody(req)
  const send = (status: number, body?: unknown) => {
    res.writeHead(status, body === undefined ? {} : { 'content-type': 'application/json' })
    res.end(body === undefined ? undefined : JSON.stringify(body))
  }

  if (url.pathname.startsWith('/__')) {
    if (url.pathname === '/__requests') return send(200, requests)
    if (url.pathname === '/__reset') {
      requests = []
      counters = { token: 0, acc: 0, con: 0, deal: 0 }
      accounts = new Map()
      contacts = new Map()
      mode = 'none'
      return send(200, { ok: true })
    }
    if (url.pathname === '/__mode') {
      const wanted = (JSON.parse(raw || '{}') as { fail?: string }).fail
      if (wanted !== 'none' && wanted !== 'deal-503') return send(400, { error: 'none|deal-503' })
      mode = wanted
      return send(200, { fail: mode })
    }
    return send(404)
  }

  if (req.method === 'GET' && url.pathname === '/recaptcha/api.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' })
    return res.end(
      `window.grecaptcha = { ready(cb) { cb() }, execute(_k, { action }) { return Promise.resolve('fake:' + action) } };`,
    )
  }

  let body: unknown = raw
  if (raw && (req.headers['content-type'] ?? '').includes('json')) body = JSON.parse(raw)
  else if (raw && url.pathname.endsWith('/token'))
    body = Object.fromEntries(new URLSearchParams(raw))
  requests.push({
    method: req.method ?? 'GET',
    path: url.pathname + url.search,
    authorization: req.headers.authorization ? '[redacted]' : undefined,
    body: url.pathname.endsWith('/token')
      ? { ...(body as object), client_secret: '[redacted]', refresh_token: '[redacted]' }
      : body,
  })

  if (req.method === 'POST' && url.pathname === '/recaptcha/api/siteverify') {
    const token = new URLSearchParams(raw).get('response') ?? ''
    if (!token.startsWith('fake:'))
      return send(200, { success: false, 'error-codes': ['bad-request'] })
    return send(200, { success: true, score: 0.9, action: token.slice('fake:'.length) })
  }
  if (req.method === 'POST' && url.pathname === '/oauth/v2/token') {
    return send(200, {
      access_token: `fake-${++counters.token}`,
      api_domain: `http://localhost:${port}`,
      expires_in: 3600,
    })
  }

  if (url.pathname.startsWith('/bigin/v2/')) {
    const record = (body as { data?: Record<string, string>[] } | undefined)?.data?.[0] ?? {}
    if (req.method === 'GET' && url.pathname === '/bigin/v2/Accounts/search') {
      const name = /Account_Name:equals:(.*)\)$/.exec(url.searchParams.get('criteria') ?? '')?.[1]
      const id = name ? accounts.get(name.replace(/\\(.)/g, '$1')) : undefined
      return id ? send(200, { data: [{ id }] }) : send(204)
    }
    if (req.method === 'GET' && url.pathname === '/bigin/v2/Contacts/search') {
      const id = contacts.get(url.searchParams.get('email') ?? '')
      return id ? send(200, { data: [{ id }] }) : send(204)
    }
    if (req.method === 'POST' && url.pathname === '/bigin/v2/Accounts') {
      const id = `acc-${++counters.acc}`
      accounts.set(record.Account_Name, id)
      return send(201, success(id))
    }
    if (req.method === 'POST' && url.pathname === '/bigin/v2/Contacts') {
      const id = `con-${++counters.con}`
      contacts.set(record.Email, id)
      return send(201, success(id))
    }
    if (req.method === 'POST' && url.pathname === '/bigin/v2/Pipelines') {
      if (mode === 'deal-503')
        return send(503, { code: 'SERVICE_UNAVAILABLE', message: 'fake outage', status: 'error' })
      return send(201, success(`deal-${++counters.deal}`))
    }
  }
  return send(404, { code: 'NOT_FOUND', message: `fake has no ${req.method} ${url.pathname}` })
}).listen(port, () => console.log(`fake Bigin + reCAPTCHA listening on http://localhost:${port}`))
