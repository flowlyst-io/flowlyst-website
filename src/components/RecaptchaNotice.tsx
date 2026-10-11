import type { CSSProperties } from 'react'

import { recaptchaSiteKey } from '@/utilities/recaptchaClient'

const linkStyle: CSSProperties = { color: 'inherit', textDecoration: 'underline' }

/**
 * Google requires this sentence in the user flow because the badge is hidden
 * (styles.css). Rendered only when reCAPTCHA is enabled.
 */
export function RecaptchaNotice({ style }: { style?: CSSProperties }) {
  if (!recaptchaSiteKey()) return null
  return (
    <p
      style={{
        margin: 0,
        fontSize: 'var(--fs-caption)',
        color: 'var(--fg-secondary)',
        ...style,
      }}
    >
      This site is protected by reCAPTCHA and the Google{' '}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        Terms of Service
      </a>{' '}
      apply.
    </p>
  )
}
