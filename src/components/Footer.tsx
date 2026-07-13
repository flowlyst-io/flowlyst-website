import React from 'react'
import Link from 'next/link'
import { Mark } from './Mark'

/**
 * Site footer (design/site/site.jsx `Footer`, design/site/site.css `.footer`).
 *
 * Server component — pure content, no interactivity. Reproduces the settled
 * chrome faithfully: the CTA band, five columns (brand / Solutions / Proof /
 * Company / Legal), and the bottom bar. Legal is Privacy / Terms / Cookies only
 * (site.jsx is authoritative; there is no /accessibility page in the PRD).
 *
 * The `.html` hrefs in the comp are mapped to the real app routes (PRD §7 / §11).
 * Inline styles are carried over verbatim from site.jsx (they reference brand
 * tokens / cream-at-opacity — no invented values). The forest surface makes the
 * currentColor brand mark render white.
 */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__cta">
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--fl-green)',
              }}
            >
              Ready when you are
            </div>
            <h3>
              See flowlyst running on <span className="accent">your district’s</span> budget.
            </h3>
            <p>A 30-minute walkthrough with someone who’s done your job. No slide deck required.</p>
          </div>
          <div className="footer__cta-actions">
            <Link href="/request-demo" className="btn btn--primary btn--lg">
              Request a demo
            </Link>
            <Link href="/about" className="btn btn--ghost-light btn--lg">
              Talk to Aziz
            </Link>
          </div>
        </div>

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
              Built and delivered by the people who used to do your job.
            </p>
            <div style={{ marginTop: 18, fontSize: 13, color: 'rgba(244, 241, 232, 0.5)' }}>
              info@flowlyst.io
            </div>
          </div>
          <div>
            <h5>Solutions</h5>
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
            <h5>Proof</h5>
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
            <h5>Company</h5>
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
            <h5>Legal</h5>
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
          <span>© 2026 flowlyst, Inc.</span>
          <span>flowlyst.io · K-12 first</span>
        </div>
      </div>
    </footer>
  )
}
