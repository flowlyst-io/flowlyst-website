import { ImageResponse } from 'next/og'

export const alt = 'flowlyst — Many tools. One platform. Built by operators.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Hex values mirror --fl-green, --c-forest and --c-cream in styles.css; ImageResponse
// cannot resolve CSS variables.
const GREEN = '#00a568'
const FOREST = '#0e1410'
const CREAM = '#f4f1e8'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: FOREST,
        color: CREAM,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: GREEN }} />
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.02em' }}>flowlyst</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 88, fontWeight: 800 }}>
        <div>Many tools.</div>
        <div style={{ color: GREEN }}>One platform.</div>
        <div>Built by operators.</div>
      </div>
    </div>,
    size,
  )
}
