import React from 'react'

type Props = {
  label: string
  rows: ReadonlyArray<{ name: string; task: string }>
}

// Hero visual: a sample roster of what each role builds in a workshop (illustrative,
// not a live session). Ported from design/site/solutions.jsx `TrainingHeroArt`.
export function TrainingRosterArt({ label, rows }: Props) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--c-cream-2)',
        borderRadius: 4,
        padding: 32,
        boxShadow: '0 24px 60px -16px rgba(14,20,16,0.10)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--fl-green-700)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}
      >
        {label}
      </div>
      {rows.map((p, i) => (
        <div
          key={p.name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 0',
            borderTop: i === 0 ? '1px solid var(--c-line-2)' : 'none',
            borderBottom: '1px solid var(--c-line-2)',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-ink)' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--c-ink-2)', marginTop: 2 }}>{p.task}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
