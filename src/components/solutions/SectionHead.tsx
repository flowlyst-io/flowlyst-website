import React from 'react'

/**
 * Shared section heading (design/site/site.jsx `SectionHead`): eyebrow + display
 * `h2` + optional `lead` kicker. Props-driven and reused across the solution
 * pages. Server component — pure content. Inline styles are carried over verbatim
 * from site.jsx (brand tokens / spacing scale — no invented values).
 *
 * Only the props the solution pages actually use are ported (eyebrow, title,
 * kicker, align, maxWidth); the design's on-dark / on-green variants are omitted
 * until a page needs them, to avoid speculative surface.
 */
export type SectionHeadProps = {
  eyebrow?: string
  title: React.ReactNode
  kicker?: string
  align?: 'left' | 'center'
  maxWidth?: string | number
}

export function SectionHead({
  eyebrow,
  title,
  kicker,
  align = 'left',
  maxWidth = '20ch',
}: SectionHeadProps) {
  return (
    <div style={{ textAlign: align, marginBottom: 56 }}>
      {eyebrow && (
        <div className="eyebrow" style={{ marginBottom: 32 }}>
          {eyebrow}
        </div>
      )}
      <h2 className="h2" style={{ maxWidth, margin: align === 'center' ? '0 auto' : 0 }}>
        {title}
      </h2>
      {kicker && (
        <p
          className="lead"
          style={{
            maxWidth: align === 'center' ? '52ch' : '54ch',
            margin: align === 'center' ? '24px auto 0' : '24px 0 0',
          }}
        >
          {kicker}
        </p>
      )}
    </div>
  )
}
