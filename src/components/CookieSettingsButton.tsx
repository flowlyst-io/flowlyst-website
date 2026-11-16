'use client'

import React from 'react'

import { openCookieSettings } from '@/utilities/consent'

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="footer__link-button"
      data-testid="cookie-settings"
      onClick={openCookieSettings}
    >
      Cookie settings
    </button>
  )
}
