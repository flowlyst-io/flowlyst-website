/**
 * Cookie-consent persistence (issue #22, PRD §10.4).
 *
 * The public site records the visitor's cookie choice in a first-party cookie so the
 * decision survives reloads and is readable both here (client-side) and, should a
 * non-essential script ever be server-rendered, server-side. The cookie stores only
 * the decision — no identifier — so it is itself strictly necessary and exempt from
 * the consent it records (documented on /cookies).
 *
 * Google Analytics is the one non-essential script. Whether it runs depends on the
 * visitor's region, stored choice and Global Privacy Control signal (`isCounted()`, rules
 * in consentShared.ts). Any non-essential script added later must gate on `isCounted()`.
 */

import { REGION_COOKIE, decide, type ConsentChoice, type ConsentRegion } from './consentShared'

export const CONSENT_COOKIE = 'fl_cookie_consent'

export type ConsentValue = ConsentChoice

// ~6 months. Long enough not to nag returning visitors; short enough that consent is
// periodically renewed rather than granted once forever.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180

const VALUE_RE = new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(accepted|declined|acknowledged)(?:;|$)`)

/** The stored decision, or null if the visitor has not chosen yet. Client-only. */
export function getConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(VALUE_RE)
  return match ? (match[1] as ConsentValue) : null
}

const listeners = new Set<() => void>()

/** Called after every `setConsent`; lets a gated script start in the same page view. */
export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Persist the visitor's decision. First-party, SameSite=Lax, path=/. Client-only. */
export function setConsent(value: ConsentValue): void {
  if (typeof document === 'undefined') return
  // Secure only over HTTPS so the cookie still sets on local http dev.
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
  listeners.forEach((listener) => listener())
}

/** True only when the visitor has actively clicked Accept; says nothing about counting. */
export function hasConsent(): boolean {
  return getConsent() === 'accepted'
}

/** The banner region the proxy recorded; anything but exactly `opt-out` is `opt-in`. */
export function getRegion(): ConsentRegion {
  if (typeof document === 'undefined') return 'opt-in'
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REGION_COOKIE}=([^;]*)`))
  return match?.[1] === 'opt-out' ? 'opt-out' : 'opt-in'
}

export function hasGpc(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  )
}

/** The gate every non-essential script (Google Analytics today) must pass before it runs. */
export function isCounted(): boolean {
  if (typeof document === 'undefined') return false
  return decide({ choice: getConsent(), region: getRegion(), gpc: hasGpc() }).counted
}

const settingsListeners = new Set<() => void>()

/** Asks the banner to open again. It never touches the stored choice. */
export function openCookieSettings(): void {
  settingsListeners.forEach((listener) => listener())
}

export function subscribeCookieSettings(listener: () => void): () => void {
  settingsListeners.add(listener)
  return () => {
    settingsListeners.delete(listener)
  }
}
