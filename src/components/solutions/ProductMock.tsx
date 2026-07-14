import React from 'react'

/**
 * Light-UI product screenshot mock (design/site/home.jsx) — the budget dashboard
 * visual used in the Budget Software hero. Extracted verbatim from the homepage's
 * local `ProductMock` (issue #6, src/app/(frontend)/page.tsx) so the two pages
 * render the identical mock; the homepage still carries its own local copy, which
 * a later refactor can point at this shared component once the homepage file is in
 * scope. Server component, pure/decorative; inline styles reference brand tokens
 * only (no invented values).
 */
export function ProductMock() {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '4/3',
        background: 'var(--c-paper)',
        border: '1px solid var(--c-line)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 32px 80px -16px rgba(14,20,16,0.18)',
      }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--c-line-2)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            background: 'var(--c-cream)',
          }}
        >
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}
          />
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}
          />
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}
          />
          <span
            style={{
              marginLeft: 12,
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--c-ink-3)',
            }}
          >
            flowlyst · FY26 budget
          </span>
        </div>
        <div style={{ padding: 24, flex: 1, color: 'var(--c-ink)' }}>
          <div
            style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 4 }}
          >
            $84.2M
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--c-ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 28,
              fontWeight: 800,
            }}
          >
            Total district budget · FY 2025–26
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {(
              [
                ['Encumbered', '$61.7M', '73% of plan'],
                ['Variance', '−$240K', 'Under budget'],
              ] as const
            ).map(([label, num, detail]) => (
              <div
                key={label}
                style={{
                  padding: '14px 16px',
                  border: '1px solid var(--c-line)',
                  borderRadius: 4,
                  background: 'var(--c-sage)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--c-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    margin: '6px 0 2px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {num}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fl-green-700)', fontWeight: 800 }}>
                  {detail}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
            {[40, 65, 50, 78, 55, 92, 72, 68, 85, 60, 75, 88].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: h + '%',
                  background: i === 5 ? 'var(--fl-green)' : 'rgba(0,165,104,0.22)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
