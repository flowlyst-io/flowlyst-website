'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

import {
  getConsent,
  getRegion,
  hasGpc,
  setConsent,
  subscribeConsent,
  subscribeCookieSettings,
  type ConsentValue,
} from '@/utilities/consent'
import { bannerVariant, decide, type BannerVariant } from '@/utilities/consentShared'
import { syncGaWithConsent } from '@/utilities/googleAnalytics'

/**
 * Cookie-consent banner (issue #22, #161; PRD §10.4, GDPR/CCPA-ready).
 *
 * Mounted once in the frontend layout so it governs the whole site. It renders NOTHING
 * until it has mounted on the client, and then only the banner `decide()` calls for: the
 * Accept/Decline banner in the opt-in region, the opt-out notice elsewhere, and none for
 * a returning visitor or a Global Privacy Control browser. Being `position: fixed` (see
 * styles.css `.cookie-consent`) it overlays the page rather than pushing content, so
 * its appearance shifts no layout — CLS stays 0 (PRD §10.2, invariant c).
 *
 * The footer's Cookie settings control reopens it without clearing the stored choice. For
 * a GPC browser it opens a note with only Close: nothing is stored and nothing is counted.
 *
 * Accessibility: a labelled `role="region"` containing real <button>s — reachable in
 * tab order and operable by keyboard. It is intentionally NON-modal (a bottom bar, not
 * a dialog): the page stays usable, so no focus trap is imposed and focus is not stolen
 * on load. Visible focus rings come from the shared global focus styles.
 */
export function CookieConsent() {
  const [dismissed, setDismissed] = useState(false)
  const [reopened, setReopened] = useState<BannerVariant | null>(null)
  const [focusTick, setFocusTick] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  // The server snapshot ('ssr') renders nothing during SSR and hydration, so the server
  // HTML is identical for everyone and there is no hydration mismatch. After hydration
  // the client snapshot reads the cookie, so the banner appears only client-side.
  const stored = useSyncExternalStore(
    subscribeConsent,
    () => getConsent() ?? 'none',
    () => 'ssr' as const,
  )

  useEffect(() => {
    syncGaWithConsent()
  }, [])

  useEffect(() => {
    return subscribeCookieSettings(() => {
      setReopened(bannerVariant(getRegion(), hasGpc()))
      setDismissed(false)
      setFocusTick((n) => n + 1)
    })
  }, [])

  useEffect(() => {
    if (focusTick > 0) root.current?.querySelector('button')?.focus()
  }, [focusTick])

  let variant: BannerVariant | null = null
  if (stored !== 'ssr') {
    variant =
      reopened ??
      (dismissed
        ? null
        : decide({
            choice: getConsent(),
            region: getRegion(),
            gpc: hasGpc(),
          }).banner)
  }

  function choose(value: ConsentValue | null) {
    if (value) {
      setConsent(value)
      syncGaWithConsent()
    }
    if (reopened) {
      document.querySelector<HTMLElement>('[data-testid="cookie-settings"]')?.focus()
    }
    setReopened(null)
    setDismissed(true)
  }

  if (!variant) return null

  const policy = (
    <Link href="/cookies" className="cookie-consent__link">
      cookie policy
    </Link>
  )

  return (
    <div
      ref={root}
      className="cookie-consent"
      role="region"
      aria-label="Cookie consent"
      data-testid="cookie-consent"
      data-variant={variant}
    >
      <div className="cookie-consent__inner">
        {variant === 'opt-in' && (
          <>
            <p className="cookie-consent__text">
              We use essential cookies, including one that remembers this choice. If you accept, we
              also use Google Analytics cookies to understand how the site is used. Read our{' '}
              {policy}.
            </p>
            <div className="cookie-consent__actions">
              <button
                type="button"
                className="btn btn--ghost-light btn--sm"
                onClick={() => choose('accepted')}
                data-testid="cookie-accept"
              >
                Accept
              </button>
              <button
                type="button"
                className="btn btn--ghost-light btn--sm"
                onClick={() => choose('declined')}
                data-testid="cookie-decline"
              >
                Decline
              </button>
            </div>
          </>
        )}
        {variant === 'opt-out' && (
          <>
            <p className="cookie-consent__text">
              We use essential cookies to make this site work, and Google Analytics cookies to
              understand how it&apos;s used. You can opt out of analytics cookies at any time. Read
              our {policy}.
            </p>
            <div className="cookie-consent__actions">
              <button
                type="button"
                className="btn btn--ghost-light btn--sm"
                onClick={() => choose('acknowledged')}
                data-testid="cookie-got-it"
              >
                Got it
              </button>
              <button
                type="button"
                className="btn btn--ghost-light btn--sm"
                onClick={() => choose('declined')}
                data-testid="cookie-opt-out"
              >
                Opt out
              </button>
            </div>
          </>
        )}
        {variant === 'gpc' && (
          <>
            <p className="cookie-consent__text">
              Your browser sends a Global Privacy Control signal, so we use only essential cookies
              and analytics is off. Read our {policy}.
            </p>
            <div className="cookie-consent__actions">
              <button
                type="button"
                className="btn btn--ghost-light btn--sm"
                onClick={() => choose(null)}
                data-testid="cookie-gpc-close"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
