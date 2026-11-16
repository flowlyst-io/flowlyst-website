import { isCounted } from './consent'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export type LeadForm = 'demo' | 'contact' | 'newsletter' | 'speaking'

let initialized = false

// The literal property access is what lets Next inline the value at build time.
export function gaMeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined
}

export function isGaActive(): boolean {
  return !!gaMeasurementId() && isCounted()
}

export function initGtag(id: string): void {
  if (initialized) return
  initialized = true
  window.dataLayer = window.dataLayer || []
  // gtag.js reads `arguments` objects from the dataLayer and ignores plain arrays.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id)
}

/** Carries only the form name, never anything the visitor typed. */
export function trackLead(form: LeadForm): void {
  const id = gaMeasurementId()
  if (!id || !isGaActive()) return
  initGtag(id)
  window.gtag!('event', 'generate_lead', { form_name: form })
}

/** Host-only first, then the host and every parent down to two labels, dotted as GA writes them. */
export function gaCookieDomains(hostname: string): string[] {
  const domains = ['', hostname]
  const labels = hostname.split('.')
  for (let i = 0; i <= labels.length - 2; i++) domains.push('.' + labels.slice(i).join('.'))
  return domains
}

const disableKey = (id: string) => 'ga-disable-' + id

/**
 * Stops collection in this page view and deletes GA's cookies. The loaded gtag script
 * cannot be unloaded; Google's documented `ga-disable-<ID>` flag is what halts it.
 */
export function stopGa(): void {
  const id = gaMeasurementId()
  if (!id) return
  ;(window as unknown as Record<string, unknown>)[disableKey(id)] = true
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter((name) => /^_ga(_|$)/.test(name))
  for (const name of names) {
    for (const domain of gaCookieDomains(window.location.hostname)) {
      const scope = domain ? '; Domain=' + domain : ''
      document.cookie = name + '=; Max-Age=0; Path=/' + scope
    }
  }
}

/** Brings the page in line with the current choice: resumes or stops collection. */
export function syncGaWithConsent(): void {
  const id = gaMeasurementId()
  if (!id) return
  if (isGaActive()) (window as unknown as Record<string, unknown>)[disableKey(id)] = false
  else stopGa()
}

export function resetGtagForTests(): void {
  initialized = false
  for (const key of Object.keys(window)) {
    if (key.startsWith('ga-disable-')) delete (window as unknown as Record<string, unknown>)[key]
  }
}
