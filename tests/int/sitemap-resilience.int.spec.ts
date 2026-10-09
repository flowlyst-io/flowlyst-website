// @vitest-environment node
// sitemap.ts resilience (review note N2). A request-time DB failure must degrade to a
// STATIC-only sitemap — the 14 public routes still served — rather than a 500. The
// static entries carry no DB dependency, and the content queries are wrapped in a
// log-and-continue guard (the same never-throw posture the content collections take).
//
// We simulate the failure by mocking `getPayload` to reject. The mock is isolated to
// THIS file (vitest module mocks are per-file), so tests/int/sitemap.int.spec.ts keeps
// the real Payload for its seeding. `importOriginal` preserves the rest of the module
// (e.g. `buildConfig`) so `@payload-config` still loads when sitemap.ts imports it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(async () => {
      throw new Error('simulated request-time DB failure')
    }),
  }
})

import sitemap from '@/app/sitemap'
import { getServerURL } from '@/utilities/serverURL'

const base = getServerURL()

const STATIC_PATHS = [
  '/',
  '/about',
  '/solutions/budget-software',
  '/solutions/ai-training',
  '/solutions/consulting',
  '/solutions/keynotes',
  '/request-demo',
  '/contact',
  '/blog',
  '/testimonials',
  '/case-studies',
  '/privacy',
  '/terms',
  '/cookies',
]

describe('sitemap() — resilience (content query failure degrades to static-only)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Suppress + capture the expected degradation log.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('returns the static routes (no throw, no 500) when the DB query fails', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)

    // Every static route is still present…
    for (const path of STATIC_PATHS) {
      expect(urls, `static route ${path} still present`).toContain(`${base}${path}`)
    }
    // …and ONLY the static routes — no dynamic entries survived the failure.
    expect(entries.length, 'exactly the static set, nothing dynamic').toBe(STATIC_PATHS.length)
  })

  it('logs the degradation and never throws', async () => {
    await expect(sitemap(), 'sitemap resolves rather than rejecting').resolves.toBeDefined()
    expect(errorSpy, 'the failure was logged (log-and-continue)').toHaveBeenCalled()
  })
})
