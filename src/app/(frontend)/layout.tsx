import React from 'react'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { nunito } from './fonts'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { CookieConsent } from '@/components/CookieConsent'
import { getServerURL } from '@/utilities/serverURL'
import { OrganizationJsonLd } from '@/components/OrganizationJsonLd'
import './styles.css'

const serverURL = getServerURL()

export const metadata: Metadata = {
  // Absolute origin for every page's canonical + OG/Twitter URLs. Set once here in
  // the root layout so all routes inherit it; per-page `alternates.canonical` and
  // OG URLs can then be authored as relative paths (issue #6 comment; PRD §10.1).
  metadataBase: new URL(serverURL),
  title: 'flowlyst',
  description:
    'Software, training, and consulting for K–12 public school districts, built by a former school CFO.',
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
      </body>
    </html>
  )
}
