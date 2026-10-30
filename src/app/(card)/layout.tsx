import React from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { nunito } from '../(frontend)/fonts'
import '../(frontend)/styles.css'
import './card.css'

/**
 * Root layout for the contact card. Deliberately without the site chrome, cookie
 * banner, Google Analytics and Organization JSON-LD: a card is a private-feeling
 * page reached from a QR code or NFC tag, not part of the marketing site.
 */
export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
