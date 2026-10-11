import React from 'react'
import { nunito } from './(frontend)/fonts'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import NotFound from './(frontend)/not-found'
import './(frontend)/styles.css'

export { metadata } from './(frontend)/not-found'

export default function GlobalNotFound() {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <Nav />
        <main id="main-content">
          <NotFound />
        </main>
        <Footer />
      </body>
    </html>
  )
}
