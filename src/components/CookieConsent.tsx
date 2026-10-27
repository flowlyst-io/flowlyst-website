'use client'

import React, { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

import { getConsent, setConsent, subscribeConsent, type ConsentValue } from '@/utilities/consent'

/**
 * Cookie-consent banner (issue #22, PRD §10.4; GDPR/CCPA-ready).
 *
 * Mounted once in the frontend layout so it governs the whole site. It renders NOTHING
 * until it has both (a) mounted on the client and (b) confirmed no decision is stored,
 * so it never flashes for returning visitors. Being `position: fixed` (see
 * styles.css `.cookie-consent`) it overlays the page rather than pushing content, so
 * its appearance shifts no layout — CLS stays 0 (PRD §10.2, invariant c).
 *
 * Non-essential scripts gate on `hasConsent()` (src/utilities/consent.ts). Google
 * Analytics is the one today; it starts when the visitor accepts here.
 *
 * Accessibility: a labelled `role="region"` containing real <button>s — reachable in
 * tab order and operable by keyboard. It is intentionally NON-modal (a bottom bar, not
 * a dialog): the page stays usable, so no focus trap is imposed and focus is not stolen
 * on load. Visible focus rings come from the shared global focus styles.
 */
export function CookieConsent() {
  const [dismissed, setDismissed] = useState(false)

  // The server snapshot ('ssr') renders nothing during SSR and hydration, so the server
  // HTML is identical for everyone and there is no hydration mismatch. After hydration
  // the client snapshot reads the cookie: the banner appears only client-side, and only
  // when no decision is stored. Being position:fixed it overlays rather than pushes, so
  // this post-hydration appearance shifts no layout (CLS stays 0).
  const stored = useSyncExternalStore(
    subscribeConsent,
    () => getConsent(),
    () => 'ssr' as const,
  )
  const visible = !dismissed && stored === null

  function choose(value: ConsentValue) {
    setConsent(value)
    setDismissed(true)
  }

  if (!visible) return null

  return (
    <div
      className="cookie-consent"
      role="region"
      aria-label="Cookie consent"
      data-testid="cookie-consent"
    >
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">
          We use essential cookies, including one that remembers this choice. If you accept, we also
          use Google Analytics cookies to understand how the site is used. Read our{' '}
          <Link href="/cookies" className="cookie-consent__link">
            cookie policy
          </Link>
          .
        </p>
        <div className="cookie-consent__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
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
      </div>
    </div>
  )
}
