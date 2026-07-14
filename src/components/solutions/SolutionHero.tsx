import React from 'react'
import Link from 'next/link'
import { Mark } from '@/components/Mark'

/**
 * Shared hero for the four solution pages (design/site/solutions.jsx
 * `SolutionHero`). Props-driven so Budget / AI Training / Consulting / Keynotes
 * each pass their own copy, badges, and side visual.
 *
 * Server component — pure content, no interactivity. Inline styles are carried
 * over verbatim from solutions.jsx (brand tokens / design-source rgba — no
 * invented values). The oversized faded mark replaces the design's `MarkBig`
 * (a PNG with a white filter) with the repo's inline-SVG `Mark`, matching the
 * homepage hero's decorative-mark pattern (issue #6).
 */
export type SolutionHeroProps = {
  eyebrow: string
  title: React.ReactNode
  lead: string
  primaryCta: string
  primaryHref: string
  secondaryCta?: string
  secondaryHref?: string
  badges?: string[]
  visual: React.ReactNode
}

/**
 * Internal app paths ("/…") route through next/link; hash targets and off-site
 * URLs stay plain anchors (same-page anchors and external links don't want a
 * client navigation). Budget's CTAs are both internal; siblings use "#agenda",
 * "#request", etc., which is why this lives in the shared hero.
 */
function HeroLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: React.ReactNode
}) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

export function SolutionHero({
  eyebrow,
  title,
  lead,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  badges = [],
  visual,
}: SolutionHeroProps) {
  return (
    <section
      data-testid="solution-hero"
      style={{
        position: 'relative',
        padding: '64px 56px 96px',
        background: 'var(--c-cream)',
        color: 'var(--c-ink)',
        overflow: 'hidden',
        borderBottom: '1px solid var(--c-cream-2)',
      }}
    >
      {/* Soft warm wash on the top-right — decorative. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 85% -10%, rgba(0,165,104,0.10) 0%, transparent 55%)',
        }}
      />
      {/* Oversized faded brand mark — decorative flourish (design MarkBig). */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 620,
          height: 620,
          opacity: 0.025,
          right: -120,
          top: 60,
          pointerEvents: 'none',
        }}
      >
        <Mark size={620} color="#ffffff" />
      </div>

      <div className="container" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 64,
            alignItems: 'center',
            paddingTop: 48,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              {eyebrow}
            </div>
            <h1 className="h1" style={{ marginBottom: 32, fontSize: 'clamp(48px, 5.5vw, 88px)' }}>
              {title}
            </h1>
            <p className="lead" style={{ fontSize: 21, marginBottom: 36 }}>
              {lead}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <HeroLink href={primaryHref} className="btn btn--primary btn--lg">
                {primaryCta}{' '}
                <span className="arr" aria-hidden="true" style={{ display: 'inline-block' }}>
                  →
                </span>
              </HeroLink>
              {secondaryCta && secondaryHref && (
                <HeroLink href={secondaryHref} className="btn btn--ghost btn--lg">
                  {secondaryCta}
                </HeroLink>
              )}
            </div>
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {badges.map((badge) => (
                  <span key={badge} className="chip">
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>{visual}</div>
        </div>
      </div>
    </section>
  )
}
