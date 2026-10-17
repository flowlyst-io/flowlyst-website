import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getPayloadMock, cacheCallbacks } = vi.hoisted(() => ({
  getPayloadMock: vi.fn(),
  cacheCallbacks: [] as Array<() => Promise<unknown>>,
}))

vi.mock('payload', () => ({ getPayload: getPayloadMock }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>) => {
    cacheCallbacks.push(fn)
    return fn
  },
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { companyLinkedIn, companySameAs, founderLinkedIn } from '@/utilities/socialLinks'
import { getSiteSettings } from '@/utilities/siteSettings'

beforeEach(() => {
  getPayloadMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('socialLinks helpers', () => {
  it('companyLinkedIn is undefined for null and for no rows', () => {
    expect(companyLinkedIn(null)).toBeUndefined()
    expect(companyLinkedIn({ socialLinks: [] })).toBeUndefined()
  })

  it('companyLinkedIn returns the trimmed linkedin row and ignores other platforms', () => {
    expect(
      companyLinkedIn({
        socialLinks: [
          { platform: 'twitter', url: 'https://example.com/t' },
          { platform: 'linkedin', url: '  https://example.com/co  ' },
        ],
      }),
    ).toBe('https://example.com/co')
  })

  it('companyLinkedIn is undefined for a blank linkedin url', () => {
    expect(companyLinkedIn({ socialLinks: [{ platform: 'linkedin', url: '   ' }] })).toBeUndefined()
  })

  it('companySameAs returns trimmed urls, drops blanks, de-duplicates, keeps order', () => {
    expect(
      companySameAs({
        socialLinks: [
          { platform: 'twitter', url: 'https://example.com/t' },
          { platform: 'linkedin', url: '  https://example.com/co  ' },
          { platform: 'facebook', url: '   ' },
          { platform: 'youtube', url: 'https://example.com/t' },
        ],
      }),
    ).toEqual(['https://example.com/t', 'https://example.com/co'])
    expect(companySameAs(null)).toEqual([])
  })

  it('founderLinkedIn is undefined when blank or missing, else the trimmed url', () => {
    expect(founderLinkedIn({ founderLinkedIn: '  ' })).toBeUndefined()
    expect(founderLinkedIn(undefined)).toBeUndefined()
    expect(founderLinkedIn({ founderLinkedIn: 'https://example.com/aziz' })).toBe(
      'https://example.com/aziz',
    )
  })
})

describe('getSiteSettings', () => {
  it('resolves to null when the read fails, so no page goes down', async () => {
    getPayloadMock.mockRejectedValue(new Error('db down'))
    await expect(getSiteSettings()).resolves.toBeNull()
  })

  it('hands unstable_cache a loader that rejects on failure, never a cacheable null', async () => {
    getPayloadMock.mockRejectedValue(new Error('db down'))
    expect(cacheCallbacks.length).toBeGreaterThan(0)
    await expect(cacheCallbacks[0]!()).rejects.toThrow('db down')
  })
})
