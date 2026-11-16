import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getConsent,
  getRegion,
  hasConsent,
  hasGpc,
  isCounted,
  openCookieSettings,
  setConsent,
  subscribeConsent,
  subscribeCookieSettings,
} from '@/utilities/consent'
import {
  bannerVariant,
  decide,
  regionForCountry,
  type ConsentChoice,
  type ConsentRegion,
} from '@/utilities/consentShared'

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

describe('consent regions and decisions', () => {
  beforeEach(() => {
    document.cookie = 'fl_consent_region=; Max-Age=0; Path=/'
    delete (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl
  })

  it('C1: regionForCountry is opt-out for a non-listed country, any case and padding', () => {
    expect(regionForCountry('US')).toBe('opt-out')
    expect(regionForCountry('ca')).toBe('opt-out')
    expect(regionForCountry(' BR ')).toBe('opt-out')
  })

  it('C2: regionForCountry fails closed to opt-in', () => {
    for (const code of ['DE', 'FR', 'GB', 'CH', 'NO', 'IS', 'LI', 'GF', 'JE', 'EU', 'UK']) {
      expect(regionForCountry(code), code).toBe('opt-in')
    }
    for (const bad of [null, '', 'XX', 'USA', '1']) {
      expect(regionForCountry(bad), String(bad)).toBe('opt-in')
    }
  })

  it('C3: decide covers every row without GPC', () => {
    const d = (choice: ConsentChoice | null, region: ConsentRegion) =>
      decide({ choice, region, gpc: false })
    expect(d('accepted', 'opt-in')).toEqual({ counted: true, banner: null })
    expect(d('accepted', 'opt-out')).toEqual({ counted: true, banner: null })
    expect(d('declined', 'opt-in')).toEqual({ counted: false, banner: null })
    expect(d('declined', 'opt-out')).toEqual({ counted: false, banner: null })
    expect(d(null, 'opt-out')).toEqual({ counted: true, banner: 'opt-out' })
    expect(d('acknowledged', 'opt-out')).toEqual({ counted: true, banner: null })
    expect(d(null, 'opt-in')).toEqual({ counted: false, banner: 'opt-in' })
    expect(d('acknowledged', 'opt-in')).toEqual({ counted: false, banner: 'opt-in' })
  })

  it('C3b: GPC beats every stored choice in every region: not counted, no banner', () => {
    const choices: Array<ConsentChoice | null> = ['accepted', 'declined', 'acknowledged', null]
    for (const region of ['opt-in', 'opt-out'] as const) {
      for (const choice of choices) {
        expect(decide({ choice, region, gpc: true }), `${region}/${choice}`).toEqual({
          counted: false,
          banner: null,
        })
      }
    }
  })

  it('C4: the footer opens the GPC note for a GPC visitor, else the region banner', () => {
    expect(bannerVariant('opt-out', true)).toBe('gpc')
    expect(bannerVariant('opt-in', true)).toBe('gpc')
    expect(bannerVariant('opt-out', false)).toBe('opt-out')
    expect(bannerVariant('opt-in', false)).toBe('opt-in')
  })

  it('C5: acknowledged round-trips through the cookie', () => {
    setConsent('acknowledged')
    expect(getConsent()).toBe('acknowledged')
  })

  it('C6: getRegion is opt-in unless the cookie is exactly opt-out', () => {
    expect(getRegion()).toBe('opt-in')
    document.cookie = 'fl_consent_region=bogus; Path=/'
    expect(getRegion()).toBe('opt-in')
    document.cookie = 'fl_consent_region=opt-out; Path=/'
    expect(getRegion()).toBe('opt-out')
  })

  it('C7: openCookieSettings notifies settings listeners only and keeps the choice', () => {
    setConsent('declined')
    const settings = vi.fn()
    const consent = vi.fn()
    const offSettings = subscribeCookieSettings(settings)
    const offConsent = subscribeConsent(consent)
    openCookieSettings()
    expect(settings).toHaveBeenCalledTimes(1)
    expect(consent).not.toHaveBeenCalled()
    expect(getConsent()).toBe('declined')
    offSettings()
    offConsent()
  })

  it('C8: isCounted follows the live cookies and the GPC signal', () => {
    expect(isCounted()).toBe(false)
    document.cookie = 'fl_consent_region=opt-out; Path=/'
    expect(isCounted()).toBe(true)
    setConsent('accepted')
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true })
    expect(hasGpc()).toBe(true)
    expect(isCounted()).toBe(false)
  })
})
