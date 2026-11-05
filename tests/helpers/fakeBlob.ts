import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

export type FakeBlobFile = { bytes: Buffer; contentType: string }

export type FakeBlob = {
  origin: string
  /** Keyed by pathname inside the store, e.g. `photo.jpg` or `p152/photo.jpg`. */
  files: Map<string, FakeBlobFile>
  /** One `METHOD path` entry per request received. */
  requests: string[]
  close(): Promise<void>
}

const UPLOADED_AT = '2026-01-01T00:00:00.000Z'

/**
 * A local stand-in for the Vercel Blob API and CDN, mirroring the `head()` contract of
 * `@vercel/blob` 2.3.1: `GET /api?url=<fileUrl>` answers metadata JSON, an unknown file
 * answers the `not_found` error body, and `GET /store/<pathname>` answers the bytes.
 * Listens on 127.0.0.1 only; nothing here reaches the real service.
 */
export async function startFakeBlob(): Promise<FakeBlob> {
  const files = new Map<string, FakeBlobFile>()
  const requests: string[] = []
  let origin = ''

  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`)
    const url = new URL(req.url ?? '/', origin)

    if (req.method === 'GET' && url.pathname === '/api') {
      const fileUrl = new URL(url.searchParams.get('url') ?? '', origin)
      const pathname = decodeURIComponent(fileUrl.pathname.replace(/^\/store\//, ''))
      const file = files.get(pathname)
      if (!file) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Blob not found' } }))
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          url: `${origin}/store/${pathname}`,
          downloadUrl: `${origin}/store/${pathname}?download=1`,
          pathname,
          size: file.bytes.length,
          contentType: file.contentType,
          contentDisposition: 'inline',
          cacheControl: 'public, max-age=31536000',
          uploadedAt: UPLOADED_AT,
          etag: '"fake-etag"',
        }),
      )
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/store/')) {
      const file = files.get(decodeURIComponent(url.pathname.slice('/store/'.length)))
      if (!file) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, { 'content-type': file.contentType, 'content-length': file.bytes.length })
      res.end(file.bytes)
      return
    }

    res.writeHead(404).end()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  return {
    origin,
    files,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
