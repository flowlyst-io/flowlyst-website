// @vitest-environment node
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it } from 'vitest'

import { config, proxy } from '@/proxy'

const req = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers })

const region = (
  res: Response & { cookies: { get: (n: string) => { value: string } | undefined } },
) => res.cookies.get('fl_consent_region')?.value

describe('proxy region cookie', () => {
  it('P1: US sets opt-out', () => {
    expect(region(proxy(req('http://localhost/', { 'x-vercel-ip-country': 'US' })))).toBe('opt-out')
  })

  it('P2: DE sets opt-in', () => {
    expect(region(proxy(req('http://localhost/', { 'x-vercel-ip-country': 'DE' })))).toBe('opt-in')
  })

  it('P3: no header sets opt-in', () => {
    expect(region(proxy(req('http://localhost/')))).toBe('opt-in')
  })

  it('P4: a request already carrying the right value sets no cookie', () => {
    const res = proxy(
      req('http://localhost/', {
        'x-vercel-ip-country': 'US',
        cookie: 'fl_consent_region=opt-out',
      }),
    )
    expect(region(res)).toBeUndefined()
  })

  it('P4b: a stale value is rewritten when the country changes', () => {
    const res = proxy(
      req('http://localhost/', {
        'x-vercel-ip-country': 'DE',
        cookie: 'fl_consent_region=opt-out',
      }),
    )
    expect(region(res)).toBe('opt-in')
  })

  it('P5: the cookie is Secure over https only, and is not httpOnly', () => {
    const https = proxy(req('https://flowlyst.io/', { 'x-vercel-ip-country': 'US' }))
    expect(https.headers.get('set-cookie')).toMatch(/Secure/i)
    expect(https.headers.get('set-cookie')).not.toMatch(/HttpOnly/i)
    const http = proxy(req('http://localhost/', { 'x-vercel-ip-country': 'US' }))
    expect(http.headers.get('set-cookie')).not.toMatch(/Secure/i)
  })
})

describe('proxy matcher', () => {
  const matches = (url: string, headers?: Record<string, string>) =>
    unstable_doesMiddlewareMatch({ config, url, headers })

  it('P6: runs on public pages, including look-alikes of excluded words', () => {
    for (const url of ['/', '/about', '/solutions/budget-software', '/cards', '/golf']) {
      expect(matches(url), url).toBe(true)
    }
  })

  it('P6: skips admin, api, card, go, files, og image and build assets', () => {
    for (const url of [
      '/admin',
      '/admin/collections/x',
      '/api/users',
      '/card/x',
      '/go/abc',
      '/robots.txt',
      '/opengraph-image',
      '/_next/static/x.js',
    ]) {
      expect(matches(url), url).toBe(false)
    }
  })

  it('P6: skips prefetch requests', () => {
    expect(matches('/', { 'next-router-prefetch': '1' })).toBe(false)
  })
})
