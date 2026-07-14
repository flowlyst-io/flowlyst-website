import type { Payload } from 'payload'

import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'

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

// Default recipient for internal notifications when the per-purpose env var is
// unset (PRD §8.2 names info@flowlyst.io for contact; a sensible shared default).
const DEFAULT_INTERNAL_TO = 'info@flowlyst.io'

const emailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY)

/**
 * Attempt one send, guarded. Skips (logs) when email isn't configured; on a real
 * failure logs and returns — it does not rethrow, so a caller in an `afterChange`
 * hook can never turn an email problem into a failed create.
 */
async function trySend(
  payload: Payload,
  args: { to: string; subject: string; text: string; purpose: string },
): Promise<void> {
  const { to, subject, text, purpose } = args
  if (!emailConfigured()) {
    payload.logger.info(`[email] skipped (RESEND_API_KEY unset): ${purpose} → ${to}`)
    return
  }
  try {
    // `from` is omitted deliberately — the Resend adapter supplies
    // defaultFromAddress (EMAIL_FROM).
    await payload.sendEmail({ to, subject, text })
    payload.logger.info(`[email] sent: ${purpose} → ${to}`)
  } catch (err) {
    payload.logger.error(
      `[email] send FAILED (${purpose} → ${to}) — persistence unaffected: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

/** Sales notification when a demo request is created (PRD §8.1). */
export async function notifyDemoRequest(payload: Payload, doc: DemoRequest): Promise<void> {
  const to = process.env.SALES_NOTIFY_TO || DEFAULT_INTERNAL_TO
  const interests = Array.isArray(doc.interests) ? doc.interests.join(', ') : ''
  const text = [
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
  ].join('\n')
  await trySend(payload, {
    to,
    subject: `New demo request — ${doc.fullName}`,
    text,
    purpose: 'demo-notification',
  })
}

/** Internal notification when a contact message is created (PRD §8.2). */
export async function notifyContactMessage(payload: Payload, doc: ContactMessage): Promise<void> {
  const to = process.env.CONTACT_NOTIFY_TO || DEFAULT_INTERNAL_TO
  const text = [
    `New contact message from ${doc.name} (${doc.email}).`,
    `Reason: ${doc.reason || '—'}`,
    '',
    `Message:`,
    doc.message,
  ].join('\n')
  await trySend(payload, {
    to,
    subject: `New contact message — ${doc.name}`,
    text,
    purpose: 'contact-notification',
  })
}

/** Notification when a speaking request is created (PRD §4.4). */
export async function notifySpeakingRequest(payload: Payload, doc: SpeakingRequest): Promise<void> {
  const to = process.env.SPEAKING_NOTIFY_TO || process.env.SALES_NOTIFY_TO || DEFAULT_INTERNAL_TO
  const text = [
    `New speaking request for "${doc.eventName}" (${doc.eventDate}).`,
    '',
    `Contact:      ${doc.contactName} (${doc.email})`,
    `Organization: ${doc.organization || '—'}`,
    `Audience size: ${doc.audienceSize || '—'}`,
    `Budget range: ${doc.budgetRange || '—'}`,
    `Topic:        ${doc.topicInterest || '—'}`,
    '',
    `Message: ${doc.message || '—'}`,
  ].join('\n')
  await trySend(payload, {
    to,
    subject: `New speaking request — ${doc.eventName}`,
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
