import type { Payload } from 'payload'

import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'
import { envValue } from '@/utilities/envValue'
import { CONTACT_REASONS } from '@/utilities/contactReasonsShared'
import type { RecaptchaOutcome } from '@/utilities/recaptcha'

/**
 * Lead-capture email notifications (PRD §8). One place that owns the "a lead
 * landed → tell someone" side effect for every lead collection, wired from each
 * collection's `afterChange` (create) hook and from the newsletter `/subscribe`
 * endpoint's re-subscribe branch.
 *
 * IRON RULE (review invariant d): sending email must NEVER fail persistence. By
 * the time an `afterChange` hook runs the document is already written, so these
 * helpers additionally **never throw** — a transport error is logged and
 * swallowed. And when `RESEND_API_KEY` is unset (local/CI, or before Tural runs
 * the Resend runbook) they skip-and-log instead of attempting a send, so nothing
 * breaks in an unconfigured environment.
 *
 * The transport is the Resend adapter wired in payload.config.ts, also keyed on
 * `RESEND_API_KEY`; `from` comes from that adapter's `defaultFromAddress`
 * (`EMAIL_FROM`), so we never hard-code a from-address here. Recipient addresses
 * come from env with sensible defaults — never invent key values.
 */

// Last-resort recipient when neither the per-form override nor LEAD_NOTIFY_TO is set
// (PRD §8.2 names info@flowlyst.io for contact).
const DEFAULT_INTERNAL_TO = 'info@flowlyst.io'

const emailConfigured = (): boolean => Boolean(envValue('RESEND_API_KEY'))

/**
 * Attempt one send, guarded. Skips (logs) when email isn't configured; on a real
 * failure logs and returns — it does not rethrow, so a caller in an `afterChange`
 * hook can never turn an email problem into a failed create.
 */
async function trySend(
  payload: Payload,
  args: { to: string; replyTo?: string; subject: string; text: string; purpose: string },
): Promise<void> {
  const { to, replyTo, subject, text, purpose } = args
  if (!emailConfigured()) {
    payload.logger.info(`[email] skipped (RESEND_API_KEY unset): ${purpose} → ${to}`)
    return
  }
  try {
    // `from` is omitted deliberately — the Resend adapter supplies
    // defaultFromAddress (EMAIL_FROM).
    await payload.sendEmail({ to, replyTo, subject, text })
    payload.logger.info(`[email] sent: ${purpose} → ${to}`)
  } catch (err) {
    // Only message and cause are logged — never the API key or the email body.
    const message = err instanceof Error ? err.message : String(err)
    const cause =
      err instanceof Error
        ? (err.cause as { code?: unknown; message?: unknown } | undefined)
        : undefined
    const causeInfo = cause ? ` (cause: ${String(cause.code ?? cause.message ?? cause)})` : ''
    payload.logger.error(
      `[email] send FAILED (${purpose} → ${to}) — persistence unaffected: ${message}${causeInfo}`,
    )
  }
}

const UNVERIFIED_LINE =
  'reCAPTCHA could not verify this submission (no token / check unavailable). Review before replying.'

/** Prefixes the subject and adds a body line when the guard accepted the lead unverified. */
function markUnverified(
  outcome: RecaptchaOutcome | undefined,
  subject: string,
  lines: string[],
): { subject: string; text: string } {
  if (outcome !== 'missing' && outcome !== 'error') return { subject, text: lines.join('\n') }
  return { subject: `[Unverified] ${subject}`, text: [UNVERIFIED_LINE, '', ...lines].join('\n') }
}

/** Sales notification when a demo request is created (PRD §8.1). */
export async function notifyDemoRequest(
  payload: Payload,
  doc: DemoRequest,
  outcome?: RecaptchaOutcome,
): Promise<void> {
  const to = envValue('SALES_NOTIFY_TO') || envValue('LEAD_NOTIFY_TO') || DEFAULT_INTERNAL_TO
  const interests = Array.isArray(doc.interests) ? doc.interests.join(', ') : ''
  const lines = [
    `New demo request from ${doc.fullName}${doc.title ? `, ${doc.title}` : ''}.`,
    '',
    `District/org: ${doc.district || '—'}`,
    `Work email:  ${doc.workEmail}`,
    `Phone:       ${doc.phone || '—'}`,
    `Interests:   ${interests || '—'}`,
    `Date pref:   ${doc.datePreference || '—'}`,
    `District size: ${doc.districtSize || '—'}`,
    `Heard via:   ${doc.heardAboutUs || '—'}`,
    '',
    `Message: ${doc.message || '—'}`,
    `Anything else: ${doc.anythingElse || '—'}`,
  ]
  const { subject, text } = markUnverified(outcome, `New demo request — ${doc.fullName}`, lines)
  await trySend(payload, {
    to,
    replyTo: doc.workEmail,
    subject,
    text,
    purpose: 'demo-notification',
  })
}

/** Internal notification when a contact message is created (PRD §8.2). */
export async function notifyContactMessage(
  payload: Payload,
  doc: ContactMessage,
  outcome?: RecaptchaOutcome,
): Promise<void> {
  const to = envValue('CONTACT_NOTIFY_TO') || envValue('LEAD_NOTIFY_TO') || DEFAULT_INTERNAL_TO
  const lines = [
    `New contact message from ${doc.name} (${doc.email}).`,
    `Reason: ${CONTACT_REASONS.find((r) => r.value === doc.reason)?.label ?? doc.reason ?? '—'}`,
    '',
    `Message:`,
    doc.message,
  ]
  const { subject, text } = markUnverified(outcome, `New contact message — ${doc.name}`, lines)
  await trySend(payload, {
    to,
    replyTo: doc.email,
    subject,
    text,
    purpose: 'contact-notification',
  })
}

/** Notification when a speaking request is created (PRD §4.4). */
export async function notifySpeakingRequest(
  payload: Payload,
  doc: SpeakingRequest,
  outcome?: RecaptchaOutcome,
): Promise<void> {
  const to =
    envValue('SPEAKING_NOTIFY_TO') ||
    envValue('SALES_NOTIFY_TO') ||
    envValue('LEAD_NOTIFY_TO') ||
    DEFAULT_INTERNAL_TO
  const lines = [
    `New speaking request for "${doc.eventName}" (${doc.eventDate}).`,
    '',
    `Contact:      ${doc.contactName} (${doc.email})`,
    `Organization: ${doc.organization || '—'}`,
    `Audience size: ${doc.audienceSize || '—'}`,
    `Budget range: ${doc.budgetRange || '—'}`,
    `Topic:        ${doc.topicInterest || '—'}`,
    '',
    `Message: ${doc.message || '—'}`,
  ]
  const { subject, text } = markUnverified(
    outcome,
    `New speaking request — ${doc.eventName}`,
    lines,
  )
  await trySend(payload, {
    to,
    replyTo: doc.email,
    subject,
    text,
    purpose: 'speaking-notification',
  })
}

/** Confirmation to a subscriber (PRD §8.3). Sent on first subscribe and on re-subscribe. */
export async function sendNewsletterConfirmation(payload: Payload, email: string): Promise<void> {
  const text = [
    `You're subscribed to the flowlyst newsletter.`,
    '',
    `We send occasional updates for K-12 district leaders on AI, automation, and school finance.`,
    `Not you, or changed your mind? Reply to this email and we'll remove you.`,
  ].join('\n')
  await trySend(payload, {
    to: email,
    subject: `You're subscribed to flowlyst`,
    text,
    purpose: 'newsletter-confirmation',
  })
}
