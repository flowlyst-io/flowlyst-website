import { hasConsent } from './consent'

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
  return !!gaMeasurementId() && hasConsent()
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

export function resetGtagForTests(): void {
  initialized = false
}
