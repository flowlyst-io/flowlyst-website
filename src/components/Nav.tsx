'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mark } from './Mark'

/**
 * Site header navigation (design/site/site.jsx `Nav`, design/site/site.css `.nav`).
 *
 * Client component: it is the one genuinely-interactive island in the shell —
 * the mobile hamburger drawer (open/close state) and the active-route highlight
 * (usePathname). Next.js still server-renders it to HTML, so every link and label
 * is present in the initial response and crawlable; nothing is client-only content.
 *
 * The `.html` hrefs in the source comp are mapped to the real app routes
 * (PRD §7 / §11). Pages that don't exist yet land in later issues.
 */

type NavItem = { label: string; href: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Budget Software', href: '/solutions/budget-software' },
  { label: 'AI Training', href: '/solutions/ai-training' },
  { label: 'Consulting', href: '/solutions/consulting' },
  { label: 'Keynotes', href: '/solutions/keynotes' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
]

const DRAWER_ID = 'site-nav-drawer'

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const burgerRef = useRef<HTMLButtonElement>(null)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Escape closes the open drawer and returns focus to the burger (disclosure pattern).
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        burgerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    // The sticky element is itself the <header> (banner landmark) and a direct
    // child of <body>, so it stays stuck across the whole page. Wrapping the
    // sticky nav in a separately-sized <header> would break position: sticky.
    <header className="nav">
      <Link href="/" className="nav__brand">
        {/* Brand-green mark on the light nav; the wordmark stays ink. */}
        <Mark size={26} color="var(--fl-green)" />
        <span>flowlyst</span>
      </Link>

      <button
        ref={burgerRef}
        type="button"
        className="nav__burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={DRAWER_ID}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{open ? '✕' : '☰'}</span>
      </button>

      <div
        id={DRAWER_ID}
        className={'nav__drawer' + (open ? ' is-open' : '')}
        // Activating any link inside the drawer (mouse or keyboard) closes it.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) setOpen(false)
        }}
      >
        <nav className="nav__links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? 'active' : undefined}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav__cta">
          <Link href="/contact" className="nav__signin">
            Contact
          </Link>
          <Link href="/request-demo" className="btn btn--primary btn--sm">
            Request a demo
          </Link>
        </div>
      </div>
    </header>
  )
}
