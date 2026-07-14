import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'

import { ContactForm } from '@/components/ContactForm'

/**
 * Contact page (`/contact`, PRD §8.2 / §11), built against the settled design
 * `design/site/pages.jsx` `ContactPage`.
 *
 * Server-rendered: the heading, lead, and alternative-contact info are all in the
 * initial HTML (review invariant a). The interactive `<form>` is the page's only
 * client island (`ContactForm`) — it also SSRs to markup, so nothing crawlable is
 * client-only; only the submit behaviour is client-side. Nav / Footer come from
 * the frontend layout; this page owns its single H1.
 *
 * No page-level JSON-LD: invariant (a) scopes structured data to Organization
 * (site-wide, already emitted by the layout), Person (About), Service (solutions),
 * and Article (blog) — /contact is not among them.
 */

const CANONICAL_PATH = '/contact'

const PAGE_TITLE = 'Contact flowlyst — Press, Partnerships, Training & Support'
const PAGE_DESCRIPTION =
  'Get in touch with flowlyst for press, partnerships, training questions, or support — anything that doesn’t fit a demo request. For a product demo, use the demo request form.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_PATH,
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

// Alternative contact routes (design `ContactPage` info list). The design's
// `.html` values map to the real app paths (PRD §11): /request-demo is the
// site-wide demo CTA target; keynotes is /solutions/keynotes; the email is the
// PRD/Organization-schema address. Only design/PRD-backed facts — nothing invented.
type ContactLink = { label: string; text: string; href: string; internal: boolean }

const CONTACT_LINKS: ContactLink[] = [
  { label: 'Email', text: 'info@flowlyst.io', href: 'mailto:info@flowlyst.io', internal: false },
  { label: 'Demo requests', text: 'Request a demo', href: '/request-demo', internal: true },
  { label: 'Speaking inquiries', text: 'Keynotes', href: '/solutions/keynotes', internal: true },
]

// Design's inline-link affordance (pages.jsx "Email Aziz" link): value typography
// with a green underline so the alternative-contact rows read as links.
const linkStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--c-ink)',
  textDecoration: 'none',
  borderBottom: '1.5px solid var(--fl-green)',
  paddingBottom: 3,
}

export default function ContactPage() {
  return (
    <section style={{ padding: '64px 56px 120px' }} data-testid="contact-page">
      <div className="container">
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}
        >
          {/* Intro + alternative contact info — server-rendered. */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              Get in touch
            </div>
            <h1 className="h1" style={{ marginBottom: 24, fontSize: 'clamp(44px, 5vw, 72px)' }}>
              Not ready for a demo? <em>Drop us a line.</em>
            </h1>
            <p className="lead" style={{ marginBottom: 48 }}>
              For press, partnerships, training questions, support, or anything else that doesn’t
              fit a demo form.
            </p>
            <div style={{ display: 'grid', gap: 24 }}>
              {CONTACT_LINKS.map((c) => (
                <div key={c.label}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--c-ink-3)',
                      marginBottom: 8,
                    }}
                  >
                    {c.label}
                  </div>
                  {c.internal ? (
                    <Link href={c.href} style={linkStyle}>
                      {c.text}
                    </Link>
                  ) : (
                    <a href={c.href} style={linkStyle}>
                      {c.text}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive form — the page's only client island. */}
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
