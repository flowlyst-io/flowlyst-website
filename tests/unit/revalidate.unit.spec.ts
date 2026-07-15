import { describe, it, expect, vi, beforeEach } from 'vitest'

// The shared revalidation helper (`src/utilities/revalidate.ts`) that BlogPosts,
// Testimonials, and CaseStudies afterChange/afterDelete hooks now share (#67). Its
// contract: revalidate each truthy path, honor the `disableRevalidate` opt-out, and
// NEVER throw — `next/cache`'s `revalidatePath` throws when called outside a Next
// request scope (Local-API seeds, scheduled publish, the integration tests that
// `payload.create` content), and a throw here would 500 an already-committed write.
//
// `next/cache` is mocked so the outside-scope throw is reproduced deterministically,
// without booting Payload or a request. The two collection-level never-throw tests
// (blog + case-studies int specs) exercise the same guarantee through the real hook.
const { revalidatePathMock } = vi.hoisted(() => ({ revalidatePathMock: vi.fn() }))

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))

import { revalidatePaths } from '@/utilities/revalidate'

const warn = vi.fn()
const req = { payload: { logger: { warn } } }

beforeEach(() => {
  revalidatePathMock.mockReset()
  warn.mockReset()
})

describe('revalidatePaths (shared content revalidation helper)', () => {
  it('revalidates each truthy path and skips falsy entries', () => {
    revalidatePaths(['/blog', '/blog/hello', false, null, undefined, ''], req)
    expect(revalidatePathMock.mock.calls.flat()).toEqual(['/blog', '/blog/hello'])
  })

  it('never throws when revalidatePath is unavailable (no request scope), and logs', () => {
    revalidatePathMock.mockImplementation(() => {
      throw new Error('revalidatePath was called outside a request scope')
    })
    expect(() => revalidatePaths(['/testimonials'], req)).not.toThrow()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('never throws even without a payload logger to warn through', () => {
    revalidatePathMock.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => revalidatePaths(['/blog'])).not.toThrow()
  })

  it('skips revalidation entirely when context.disableRevalidate is set', () => {
    revalidatePaths(['/blog', '/blog/hello'], {
      context: { disableRevalidate: true },
      payload: { logger: { warn } },
    })
    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })
})
