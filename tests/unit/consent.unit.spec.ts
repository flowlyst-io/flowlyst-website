import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hasConsent, setConsent, subscribeConsent } from '@/utilities/consent'

beforeEach(() => {
  document.cookie = 'fl_cookie_consent=; Max-Age=0; Path=/'
})

describe('consent', () => {
  it('calls a subscribed listener exactly once per setConsent', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeConsent(listener)
    setConsent('accepted')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('stops calling a listener after it unsubscribes', () => {
    const listener = vi.fn()
    subscribeConsent(listener)()
    setConsent('declined')
    expect(listener).not.toHaveBeenCalled()
  })

  it('hasConsent is true only after an accept', () => {
    expect(hasConsent()).toBe(false)
    setConsent('declined')
    expect(hasConsent()).toBe(false)
    setConsent('accepted')
    expect(hasConsent()).toBe(true)
  })
})
