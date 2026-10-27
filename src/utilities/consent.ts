/**
 * Cookie-consent persistence (issue #22, PRD §10.4).
 *
 * The public site records the visitor's cookie choice in a first-party cookie so the
 * decision survives reloads and is readable both here (client-side) and, should a
 * non-essential script ever be server-rendered, server-side. The cookie stores only
 * the decision — no identifier — so it is itself strictly necessary and exempt from
 * the consent it records (documented on /cookies).
 *
 * Google Analytics is the one non-essential script: it gates on `hasConsent()` and starts
 * only after the visitor accepts. Any non-essential script added later must do the same.
 */

export const CONSENT_COOKIE = 'fl_cookie_consent'

export type ConsentValue = 'accepted' | 'declined'

// ~6 months. Long enough not to nag returning visitors; short enough that consent is
// periodically renewed rather than granted once forever.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180

const VALUE_RE = new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(accepted|declined)(?:;|$)`)

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

/**
 * True only when the visitor has ACTIVELY accepted non-essential cookies. The gate every
 * non-essential script (Google Analytics today) must pass before it runs.
 */
export function hasConsent(): boolean {
  return getConsent() === 'accepted'
}
