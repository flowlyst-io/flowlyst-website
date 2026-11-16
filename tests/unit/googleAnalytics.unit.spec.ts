import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setConsent } from '@/utilities/consent'
import {
  gaCookieDomains,
  gaMeasurementId,
  initGtag,
  isGaActive,
  resetGtagForTests,
  stopGa,
  syncGaWithConsent,
  trackLead,
} from '@/utilities/googleAnalytics'

const entries = () => (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>))

const expire = (name: string) => (document.cookie = name + '=; Max-Age=0; Path=/')
const flag = () => (window as unknown as Record<string, unknown>)['ga-disable-G-E2ETEST000']

beforeEach(() => {
  document.cookie = 'fl_cookie_consent=; Max-Age=0; Path=/'
  ;['fl_consent_region', '_ga', '_ga_E2ETEST000'].forEach(expire)
  delete (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl
  delete window.dataLayer
  delete window.gtag
  resetGtagForTests()
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '')
})

describe('googleAnalytics', () => {
  it('A1: trims the measurement id and treats blank as unset', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '')
    expect(gaMeasurementId()).toBeUndefined()
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '   ')
    expect(gaMeasurementId()).toBeUndefined()
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', ' G-ABC123 ')
    expect(gaMeasurementId()).toBe('G-ABC123')
  })

  it('A2: is active only with an id and an accept', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-ABC123')
    expect(isGaActive()).toBe(false)
    setConsent('declined')
    expect(isGaActive()).toBe(false)
    setConsent('accepted')
    expect(isGaActive()).toBe(true)
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '')
    expect(isGaActive()).toBe(false)
  })

  it('A3: initGtag is idempotent', () => {
    initGtag('G-ABC123')
    initGtag('G-ABC123')
    const configs = entries().filter((e) => e[0] === 'config')
    expect(configs).toEqual([['config', 'G-ABC123']])
  })

  it('A4: trackLead pushes one generate_lead with only form_name', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-ABC123')
    setConsent('accepted')
    trackLead('demo')
    const events = entries().filter((e) => e[0] === 'event')
    expect(events).toHaveLength(1)
    expect(events[0][1]).toBe('generate_lead')
    expect(events[0][2]).toEqual({ form_name: 'demo' })
  })

  it('A5: trackLead does nothing without consent', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-ABC123')
    trackLead('contact')
    expect(window.dataLayer).toBeUndefined()
  })

  it('A6: trackLead does nothing without an id', () => {
    setConsent('accepted')
    trackLead('newsletter')
    expect(window.dataLayer).toBeUndefined()
  })

  it('A7: trackLead before any init queues config ahead of the event', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-ABC123')
    setConsent('accepted')
    expect(() => trackLead('demo')).not.toThrow()
    const names = entries().map((e) => e[0])
    expect(names.indexOf('config')).toBeGreaterThanOrEqual(0)
    expect(names.indexOf('config')).toBeLessThan(names.indexOf('event'))
  })
})

describe('googleAnalytics opt-out region, GPC and teardown', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-E2ETEST000')
  })

  it('A8: in the opt-out region with no choice, GA is active and a lead is tracked', () => {
    document.cookie = 'fl_consent_region=opt-out; Path=/'
    expect(isGaActive()).toBe(true)
    trackLead('demo')
    const events = entries().filter((e) => e[0] === 'event')
    expect(events).toHaveLength(1)
    expect(events[0][1]).toBe('generate_lead')
    expect(events[0][2]).toEqual({ form_name: 'demo' })
  })

  it('A9: GPC makes GA inactive and tracks nothing, even after an accept', () => {
    document.cookie = 'fl_consent_region=opt-out; Path=/'
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true })
    expect(isGaActive()).toBe(false)
    setConsent('accepted')
    expect(isGaActive()).toBe(false)
    trackLead('demo')
    expect(window.dataLayer).toBeUndefined()
  })

  it('A10: stopGa sets the disable flag and removes both _ga cookies but not the choice', () => {
    document.cookie = '_ga=x; Path=/'
    document.cookie = '_ga_E2ETEST000=y; Path=/'
    setConsent('declined')
    stopGa()
    expect(flag()).toBe(true)
    expect(document.cookie).not.toMatch(/(^|;\s*)_ga/)
    expect(document.cookie).toContain('fl_cookie_consent=declined')
  })

  it('A11: gaCookieDomains lists host-only, the host and each dotted parent', () => {
    expect(gaCookieDomains('www.flowlyst.io')).toEqual([
      '',
      'www.flowlyst.io',
      '.www.flowlyst.io',
      '.flowlyst.io',
    ])
    expect(gaCookieDomains('localhost')).toEqual(['', 'localhost'])
  })

  it('A12: syncGaWithConsent re-enables after an accept and stops after a decline', () => {
    setConsent('accepted')
    syncGaWithConsent()
    expect(flag()).toBe(false)
    setConsent('declined')
    syncGaWithConsent()
    expect(flag()).toBe(true)
  })

  it('A13: syncGaWithConsent does nothing without a measurement id', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '')
    document.cookie = '_ga=x; Path=/'
    syncGaWithConsent()
    expect(document.cookie).toContain('_ga=x')
  })
})
