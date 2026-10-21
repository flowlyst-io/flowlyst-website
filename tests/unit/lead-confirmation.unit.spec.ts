import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { confirmationContent, renderLeadConfirmation } from '@/email/leadConfirmation'
import {
  contactMessageLines,
  demoRequestLines,
  sendLeadConfirmation,
  speakingRequestLines,
} from '@/email/leadNotifications'
import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'

const DEMO_FIRST_LINE =
  'Thanks for asking for a demo of flowlyst. Your request came through, and a person from our team will get back to you within 1–2 business days to find a time.'
const CONTACT_FIRST_LINE =
  'Thanks for getting in touch with flowlyst. Your message came through, and a person from our team will get back to you within 1–2 business days.'
const SPEAKING_FIRST_LINE =
  'Thanks for your speaking request. Your request came through, and a person from our team will get back to you within 1–2 business days about availability and topic fit.'
const URGENT = 'If something is urgent, just reply to this email. It goes straight to our team.'
const FOOTER = /You(?:'|&#39;)re getting this email because you sent a request on flowlyst\.io\./

const demo = {
  fullName: 'Jordan Rivera',
  district: 'Sample Unified School District',
  interests: ['budget-software', 'ai-training'] as DemoRequest['interests'],
  datePreference: 'Weekday afternoons',
}

function renderDemo(over: Partial<typeof demo> = {}) {
  return renderLeadConfirmation({
    kind: 'demo',
    ...confirmationContent('demo', { ...demo, ...over }),
  })
}

describe('demo confirmation', () => {
  it('carries the board B copy, recap and footer in the html', () => {
    const { html } = renderDemo()
    for (const part of [
      'Hi Jordan,',
      DEMO_FIRST_LINE,
      URGENT,
      'Talk soon,',
      'The flowlyst team',
      '>Your request</div>',
      'Budget Software, AI Training · Weekday afternoons',
      'Sample Unified School District',
      'https://flowlyst.io',
      'mailto:inquiries@flowlyst.io',
    ]) {
      expect(html).toContain(part)
    }
    expect(html).toMatch(FOOTER)
  })

  it('is email-safe: tables, no svg, no flex', () => {
    const { html } = renderDemo()
    expect(html).toContain('<table')
    expect(html).not.toContain('<svg')
    expect(html).not.toMatch(/display:\s*flex/)
  })

  it('shrinks the 600px content table on a narrow screen', () => {
    const { html } = renderDemo()
    expect(html).toContain('width="600"')
    expect(html).toContain('style="width: 100%; max-width: 600px;"')
  })

  it('has a plain-text part with the greeting and recap and no markup', () => {
    const { text } = renderDemo()
    expect(text).toContain('Hi Jordan,')
    expect(text).toContain('Budget Software, AI Training · Weekday afternoons')
    expect(text).toContain('Sample Unified School District')
    expect(text).not.toContain('<')
  })

  it('uses the first word of a name, including a one-word name', () => {
    expect(renderDemo({ fullName: 'Cher' }).html).toContain('Hi Cher,')
    expect(confirmationContent('demo', { ...demo, fullName: 'Mary Ann Lee' }).firstName).toBe(
      'Mary',
    )
  })

  it('omits the recap block when there is nothing to recap', () => {
    const { html, text } = renderDemo({
      district: undefined,
      interests: [],
      datePreference: undefined,
    })
    expect(html).not.toContain('>Your request</div>')
    expect(text).not.toContain('\nYour request\n')
  })
})

describe('contact and speaking confirmations', () => {
  it('contact has its own first line, reason and message recap', () => {
    const { html } = renderLeadConfirmation({
      kind: 'contact',
      ...confirmationContent('contact', {
        name: 'Jordan Rivera',
        reason: 'training',
        message: 'Tell me about training.',
      }),
    })
    expect(html).toContain(CONTACT_FIRST_LINE)
    expect(html).not.toContain(DEMO_FIRST_LINE)
    expect(html).toContain('Training question')
    expect(html).toContain('Tell me about training.')
  })

  it('cuts a long contact message in the recap to 280 characters ending in an ellipsis', () => {
    const { recap } = confirmationContent('contact', {
      name: 'Jordan Rivera',
      reason: 'other',
      message: 'x'.repeat(500),
    })
    expect(recap[1]).toHaveLength(280)
    expect(recap[1].endsWith('…')).toBe(true)
  })

  it('speaking has its own first line, event and organization recap', () => {
    const content = confirmationContent('speaking', {
      contactName: 'Jordan Rivera',
      eventName: 'Spring Conference',
      eventDate: '2027-03-14',
      organization: 'Sample Association',
    })
    expect(content.recap).toEqual(['Spring Conference · 2027-03-14', 'Sample Association'])
    const { html } = renderLeadConfirmation({ kind: 'speaking', ...content })
    expect(html).toContain(SPEAKING_FIRST_LINE)
    expect(html).not.toContain(DEMO_FIRST_LINE)
  })

  it('has the planned subjects', () => {
    expect(confirmationContent('demo', demo).subject).toBe('Your flowlyst demo request')
    expect(confirmationContent('contact', { name: 'A' } as never).subject).toBe(
      'We got your message',
    )
    expect(confirmationContent('speaking', { contactName: 'A' } as never).subject).toBe(
      'Your speaking request',
    )
  })
})

describe('escaping', () => {
  it('escapes user values in the html and leaves no live script tag', () => {
    const { html } = renderLeadConfirmation({
      kind: 'contact',
      ...confirmationContent('contact', {
        name: 'Jordan Rivera',
        reason: 'other',
        message: '<script>alert(1)</script> & "quotes" it\'s',
      }),
    })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&amp; &quot;quotes&quot; it&#39;s')
  })
})

describe('team email line builders', () => {
  it('keep the team email layout', () => {
    const demoLines = demoRequestLines({
      fullName: 'Jordan Rivera',
      title: 'CFO',
      workEmail: 'j@x.test',
      interests: ['consulting'],
    } as DemoRequest)
    expect(demoLines[0]).toBe('New demo request from Jordan Rivera, CFO.')
    expect(demoLines).toContain('Interests:   consulting')
    expect(demoLines).toContain('Phone:       —')

    expect(
      contactMessageLines({
        name: 'A',
        email: 'a@x.test',
        reason: 'press',
        message: 'hi',
      } as ContactMessage),
    ).toEqual(['New contact message from A (a@x.test).', 'Reason: Press', '', 'Message:', 'hi'])

    expect(
      speakingRequestLines({
        eventName: 'E',
        eventDate: '2027-01-01',
        contactName: 'A',
        email: 'a@x.test',
      } as SpeakingRequest)[0],
    ).toBe('New speaking request for "E" (2027-01-01).')
  })
})

describe('sendLeadConfirmation', () => {
  const sendEmail = vi.fn()
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
  const payload = { sendEmail, logger } as never
  const doc = {
    fullName: 'Jordan Rivera',
    workEmail: 'jordan.rivera@district.test',
    district: 'Sample Unified School District',
    interests: ['budget-software'],
  } as DemoRequest

  beforeEach(() => {
    sendEmail.mockReset().mockResolvedValue(undefined)
    logger.info.mockReset()
    logger.error.mockReset()
    vi.stubEnv('SALES_NOTIFY_TO', 'sama@x.test')
    vi.stubEnv('LEAD_NOTIFY_BCC', 'boss@x.test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends once to the submitter, replies to the team inbox, no BCC, html and text', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    await sendLeadConfirmation(payload, 'demo', doc)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const args = sendEmail.mock.calls[0][0]
    expect(args.to).toBe('jordan.rivera@district.test')
    expect(args.replyTo).toBe('sama@x.test')
    expect(args.bcc).toBeUndefined()
    expect(args.subject).toBe('Your flowlyst demo request')
    expect(args.html).toContain('<table')
    expect(args.text).toContain('Hi Jordan,')
  })

  it('replies to the contact and speaking team inboxes for those forms', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('CONTACT_NOTIFY_TO', 'contact@x.test')
    vi.stubEnv('SPEAKING_NOTIFY_TO', '')
    await sendLeadConfirmation(payload, 'contact', {
      name: 'A B',
      email: 'ab@x.test',
      message: 'm',
    } as ContactMessage)
    await sendLeadConfirmation(payload, 'speaking', {
      contactName: 'A B',
      email: 'ab@x.test',
      eventName: 'E',
      eventDate: '2027-01-01',
    } as SpeakingRequest)
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'ab@x.test', replyTo: 'contact@x.test' })
    expect(sendEmail.mock.calls[1][0]).toMatchObject({ to: 'ab@x.test', replyTo: 'sama@x.test' })
  })

  it('never logs the submitter address, sent or skipped', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    await sendLeadConfirmation(payload, 'demo', doc)
    vi.stubEnv('RESEND_API_KEY', '')
    await sendLeadConfirmation(payload, 'demo', doc)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const logged = [...logger.info.mock.calls, ...logger.error.mock.calls].map((c) => String(c[0]))
    expect(logged.some((l) => l.includes('sent'))).toBe(true)
    expect(logged.some((l) => l.includes('skipped'))).toBe(true)
    expect(logged.filter((l) => l.includes('jordan.rivera@district.test'))).toEqual([])
  })

  it('does not throw when sending fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    sendEmail.mockRejectedValue(new Error('boom'))
    await expect(sendLeadConfirmation(payload, 'demo', doc)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })
})
