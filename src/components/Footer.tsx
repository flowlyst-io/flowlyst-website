import React from 'react'
import Link from 'next/link'
import { Mark } from './Mark'

/**
 * Site footer (design/site/site.jsx `Footer`, design/site/site.css `.footer`).
 *
 * Server component — pure content, no interactivity. Reproduces the settled
 * chrome faithfully: five columns (brand / Solutions / Proof /
 * Company / Legal), and the bottom bar. Legal is Privacy / Terms / Cookies only
 * (site.jsx is authoritative; there is no /accessibility page in the PRD).
 *
 * The `.html` hrefs in the comp are mapped to the real app routes (PRD §7 / §11).
 * Inline styles are carried over verbatim from site.jsx (they reference brand
 * tokens / cream-at-opacity — no invented values). The forest surface makes the
 * currentColor brand mark render white.
 *
 * `linkedInUrl` (Site Settings) adds a LinkedIn icon under the email; the design has
 * no social slot, so the placement and the inline glyph are defaults. Empty renders
 * nothing.
 */
function LinkedInIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export function Footer({ linkedInUrl }: { linkedInUrl?: string }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__cols">
          <div>
            <Link href="/" className="footer__brand">
              <Mark size={24} />
              <span>flowlyst</span>
            </Link>
            <p
              style={{
                fontSize: 14,
                margin: 0,
                lineHeight: 1.6,
                maxWidth: '32ch',
                color: 'rgba(244, 241, 232, 0.6)',
              }}
            >
              Built and delivered by someone who used to do your job.
            </p>
            <ul style={{ marginTop: 18 }}>
              <li>
                <a href="mailto:info@flowlyst.io">info@flowlyst.io</a>
              </li>
            </ul>
            {linkedInUrl && (
              <ul style={{ marginTop: 18 }}>
                <li>
                  <a
                    href={linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="flowlyst on LinkedIn"
                    style={{ display: 'inline-flex' }}
                  >
                    <LinkedInIcon />
                  </a>
                </li>
              </ul>
            )}
          </div>
          <div>
            <h4>Solutions</h4>
            <ul>
              <li>
                <Link href="/solutions/budget-software">Budget Software</Link>
              </li>
              <li>
                <Link href="/solutions/ai-training">AI Training</Link>
              </li>
              <li>
                <Link href="/solutions/consulting">Consulting</Link>
              </li>
              <li>
                <Link href="/solutions/keynotes">Keynotes</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Proof</h4>
            <ul>
              <li>
                <Link href="/testimonials">Testimonials</Link>
              </li>
              <li>
                <Link href="/case-studies">Case studies</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/about">Meet Aziz</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/request-demo">Request a demo</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
              <li>
                <Link href="/cookies">Cookies</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© 2026 flowlyst LLC</span>
          <span>flowlyst.io · K-12 first</span>
        </div>
      </div>
    </footer>
  )
}
