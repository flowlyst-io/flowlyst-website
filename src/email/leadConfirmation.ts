import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'
import { CONTACT_REASONS } from '@/utilities/contactReasonsShared'
import { DEMO_INTERESTS } from '@/utilities/demoInterestsShared'
import { getServerURL } from '@/utilities/serverURL'

/**
 * The "we got your request" email sent to the person who filled in a lead form
 * (issue #116, board "B · Personal note"). Pure: no `payload` runtime import, so the
 * preview script and unit tests can run it without booting Payload.
 *
 * Email clients ignore most modern CSS, so the markup is nested tables with every
 * style inline and no SVG (the mark is a PNG under /public/email). Colors and type
 * come from the board and the Flowlyst Design System only.
 */

export type LeadKind = 'demo' | 'contact' | 'speaking'

type DocFor = {
  demo: Pick<DemoRequest, 'fullName' | 'interests' | 'datePreference' | 'district'>
  contact: Pick<ContactMessage, 'name' | 'reason' | 'message'>
  speaking: Pick<SpeakingRequest, 'contactName' | 'eventName' | 'eventDate' | 'organization'>
}

export type ConfirmationContent = { firstName: string; recap: string[]; subject: string }

const INTRO: Record<LeadKind, string> = {
  demo: 'Thanks for asking for a demo of flowlyst. Your request came through, and a person from our team will get back to you within 1–2 business days to find a time.',
  contact:
    'Thanks for getting in touch with flowlyst. Your message came through, and a person from our team will get back to you within 1–2 business days.',
  speaking:
    'Thanks for your speaking request. Your request came through, and a person from our team will get back to you within 1–2 business days about availability and topic fit.',
}

const SUBJECT: Record<LeadKind, string> = {
  demo: 'Your flowlyst demo request',
  contact: 'We got your message',
  speaking: 'Your speaking request',
}

const URGENT = 'If something is urgent, just reply to this email. It goes straight to our team.'
const FOOTER_REASON = "You're getting this email because you sent a request on flowlyst.io."
const MESSAGE_RECAP_MAX = 280

const firstWord = (name: string | null | undefined): string => (name ?? '').trim().split(/\s+/)[0]

function cutMessage(message: string | null | undefined): string {
  const flat = (message ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > MESSAGE_RECAP_MAX
    ? `${flat.slice(0, MESSAGE_RECAP_MAX - 1).trimEnd()}…`
    : flat
}

export function confirmationContent<K extends LeadKind>(
  kind: K,
  doc: DocFor[K],
): ConfirmationContent {
  let name: string | null | undefined
  let recap: (string | null | undefined)[]

  if (kind === 'demo') {
    const d = doc as DocFor['demo']
    name = d.fullName
    const interests = (d.interests ?? [])
      .map((v) => DEMO_INTERESTS.find((i) => i.value === v)?.label ?? v)
      .join(', ')
    recap = [[interests, d.datePreference].filter(Boolean).join(' · '), d.district]
  } else if (kind === 'contact') {
    const d = doc as DocFor['contact']
    name = d.name
    recap = [CONTACT_REASONS.find((r) => r.value === d.reason)?.label, cutMessage(d.message)]
  } else {
    const d = doc as DocFor['speaking']
    name = d.contactName
    recap = [[d.eventName, d.eventDate].filter(Boolean).join(' · '), d.organization]
  }

  return {
    firstName: firstWord(name),
    recap: recap.filter((line): line is string => Boolean(line?.trim())),
    subject: SUBJECT[kind],
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const FONT = "Nunito, 'Segoe UI', Arial, Helvetica, sans-serif"
const TEXT = '#404041'
const MUTED = '#666667'
const LINK = '#007147'

const block = (inner: string, style = '') =>
  `<tr><td style="padding: 0 0 20px 0;${style}">${inner}</td></tr>`

export function renderLeadConfirmation(input: {
  kind: LeadKind
  firstName: string
  recap: string[]
}): { html: string; text: string } {
  const { kind, firstName, recap } = input
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const intro = INTRO[kind]

  const recapHtml = recap.length
    ? block(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top: 1px solid #D9D9D9; padding: 20px 0 0 0; font-size: 14px; line-height: 1.5; color: ${MUTED};">` +
          `<div style="font-weight: 700; color: ${TEXT}; padding-bottom: 6px;">Your request</div>` +
          recap
            .map(
              (line, i) =>
                `<div style="padding-bottom: ${i === recap.length - 1 ? 0 : 6}px;">${escapeHtml(line)}</div>`,
            )
            .join('') +
          `</td></tr></table>`,
      )
    : ''

  const paragraph = (inner: string) => block(`<p style="margin: 0;">${inner}</p>`)

  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(SUBJECT[kind])}</title>`,
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&amp;display=swap" rel="stylesheet">',
    '</head>',
    `<body style="margin: 0; padding: 0; background: #FFFFFF;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #FFFFFF;"><tr><td align="center">`,
    `<table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width: 680px; max-width: 100%; background: #FFFFFF;"><tr><td style="padding: 40px; font-family: ${FONT}; color: ${TEXT}; font-size: 16px; line-height: 1.65;">`,
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px;">`,
    block(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
        `<td style="padding: 0 8px 0 0; vertical-align: middle;"><img src="${getServerURL()}/email/flowlyst-mark.png" width="28" height="20" alt="" style="display: block; border: 0;"></td>` +
        `<td style="vertical-align: middle; font-family: ${FONT}; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: ${TEXT};">flowlyst</td>` +
        `</tr></table>`,
      ' padding-bottom: 28px;',
    ),
    paragraph(escapeHtml(greeting)),
    paragraph(escapeHtml(intro)),
    paragraph(escapeHtml(URGENT)),
    paragraph('Talk soon,<br>The flowlyst team'),
    recapHtml,
    `<tr><td style="padding: 8px 0 0 0; font-size: 13px; line-height: 1.5; color: ${MUTED};">` +
      `<div style="padding-bottom: 6px;"><a href="https://flowlyst.io" style="color: ${LINK};">flowlyst.io</a> · <a href="mailto:inquiries@flowlyst.io" style="color: ${LINK};">inquiries@flowlyst.io</a></div>` +
      `<div>${escapeHtml(FOOTER_REASON)}</div></td></tr>`,
    '</table>',
    '</td></tr></table>',
    '</td></tr></table>',
    '</body>',
    '</html>',
  ].join('\n')

  const text = [
    greeting,
    '',
    intro,
    '',
    URGENT,
    '',
    'Talk soon,',
    'The flowlyst team',
    ...(recap.length ? ['', 'Your request', ...recap] : []),
    '',
    'flowlyst.io · inquiries@flowlyst.io',
    FOOTER_REASON,
  ].join('\n')

  return { html, text }
}
