import React from 'react'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { nunito } from './fonts'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { CookieConsent } from '@/components/CookieConsent'
import { getServerURL } from '@/utilities/serverURL'
import { OrganizationJsonLd } from '@/components/OrganizationJsonLd'
import './styles.css'

/**
 * Corpowid accessibility widget (PRD §10.3–§10.4; issue #22). The exact embed —
 * account id and src — is preserved from the legacy site's root layout. It loads
 * BEFORE cookie consent, as an accessibility-essential service under our legitimate
 * interest: gating an accessibility accommodation behind consent would withhold it
 * from the users who most need it. That basis is stated in the cookie policy, which
 * also flags for Tural to confirm the account is active and that the widget sets no
 * non-essential/tracking cookies (if it does, it moves behind the consent banner).
 */
const CORPOWID_ACCOUNT = '0dad393b-e1f0-4586-aa19-31eedcf20a06'

const serverURL = getServerURL()

export const metadata: Metadata = {
  // Absolute origin for every page's canonical + OG/Twitter URLs. Set once here in
  // the root layout so all routes inherit it; per-page `alternates.canonical` and
  // OG URLs can then be authored as relative paths (issue #6 comment; PRD §10.1).
  metadataBase: new URL(serverURL),
  title: 'flowlyst',
  description:
    'Software, training, and consulting for K–12 public school districts, built by former school CFOs and district leaders.',
}

/**
 * Root layout for the public marketing site.
 *
 * Server component. Provides the shared chrome (header/nav + footer), the page
 * landmarks (header, nav, main, footer), a skip-to-content link, and `lang="en"`.
 * The Nunito next/font variable is set on <html> so `--font-nunito` — referenced
 * by `--font-sans` / `--font-display` in styles.css — is in scope everywhere.
 *
 * Pages own their single H1; the layout owns the <main> landmark.
 */
export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <OrganizationJsonLd />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <CookieConsent />
        <Analytics />
        <Script
          src="https://cdn.corpowid.com/corpowid.js"
          data-account={CORPOWID_ACCOUNT}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
