import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setConsent } from '@/utilities/consent'
import {
  gaMeasurementId,
  initGtag,
  isGaActive,
  resetGtagForTests,
  trackLead,
} from '@/utilities/googleAnalytics'

const entries = () => (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>))

beforeEach(() => {
  document.cookie = 'fl_cookie_consent=; Max-Age=0; Path=/'
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
