import React from 'react'
import type { Metadata } from 'next'
import { nunito } from './fonts'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import './styles.css'

export const metadata: Metadata = {
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
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
