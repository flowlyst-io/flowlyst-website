import type { RecaptchaAction } from './recaptchaShared'

type Grecaptcha = {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

const TOKEN_TIMEOUT_MS = 5000

let loading: Promise<void> | null = null

// The literal property access is what lets Next inline the value at build time.
export function recaptchaSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || undefined
}

export function loadRecaptcha(): Promise<void> {
  const siteKey = recaptchaSiteKey()
  if (!siteKey) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      loading = null
      reject(new Error('reCAPTCHA script failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Resolves `null` rather than throwing when no token can be had (no key, script
 * blocked, timeout): the form still submits and the server decides what an absent
 * token means. Tokens expire after two minutes, so call this on every attempt.
 */
export async function getRecaptchaToken(action: RecaptchaAction): Promise<string | null> {
  const siteKey = recaptchaSiteKey()
  if (!siteKey) return null

  const fetchToken = async (): Promise<string> => {
    await loadRecaptcha()
    const grecaptcha = (window as unknown as { grecaptcha: Grecaptcha }).grecaptcha
    await new Promise<void>((resolve) => grecaptcha.ready(resolve))
    return grecaptcha.execute(siteKey, { action })
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS)
  })
  try {
    return await Promise.race([fetchToken().catch(() => null), timeout])
  } finally {
    clearTimeout(timer)
  }
}
