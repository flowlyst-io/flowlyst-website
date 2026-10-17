import React from 'react'
import { nunito } from './(frontend)/fonts'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { OrganizationJsonLd } from '@/components/OrganizationJsonLd'
import { getSiteSettings } from '@/utilities/siteSettings'
import { companySameAs } from '@/utilities/socialLinks'
import NotFound from './(frontend)/not-found'
import './(frontend)/styles.css'

export { metadata } from './(frontend)/not-found'

export default async function GlobalNotFound() {
  const settings = await getSiteSettings()
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <OrganizationJsonLd sameAs={companySameAs(settings)} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main-content" tabIndex={-1}>
          <NotFound />
        </main>
        <Footer />
      </body>
    </html>
  )
}
