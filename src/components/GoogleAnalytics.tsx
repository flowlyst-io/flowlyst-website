'use client'

import React, { useEffect, useSyncExternalStore } from 'react'
import Script from 'next/script'

import { getConsent, subscribeConsent } from '@/utilities/consent'
import { gaMeasurementId, initGtag } from '@/utilities/googleAnalytics'

/**
 * Renders nothing on the server and during hydration (the server snapshot is null), so
 * the server HTML is unchanged. The script mounts only when the measurement ID is set
 * and the visitor has accepted, in the same page view as the click.
 */
export function GoogleAnalytics() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null)
  const id = gaMeasurementId()
  const active = !!id && consent === 'accepted'

  useEffect(() => {
    if (active && id) initGtag(id)
  }, [active, id])

  if (!active || !id) return null

  return (
    <Script
      id="ga-gtag"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      strategy="afterInteractive"
    />
  )
}
