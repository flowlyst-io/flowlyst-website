import React from 'react'
import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'flowlyst',
  description:
    'Software, training, and consulting for K–12 public school districts, built by former school CFOs and district leaders.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
