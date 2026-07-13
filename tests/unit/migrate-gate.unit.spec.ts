import { describe, it, expect } from 'vitest'

// The Vercel build gate's decision logic. Imported from the plain-JS build script
// (allowJs is on) so the exact function shipped to Vercel is the one under test.
import { decideMigration } from '../../scripts/migrate-gate.mjs'

const UNPOOLED = 'postgres://user:pass@db.neon.tech/main?sslmode=require'
const POOLED = 'postgres://user:pass@db-pooler.neon.tech/main?sslmode=require'

describe('decideMigration', () => {
  it('skips migration when VERCEL_ENV is unset (local / generic build)', () => {
    const decision = decideMigration({ DATABASE_URL_UNPOOLED: UNPOOLED })
    expect(decision.action).toBe('skip')
    expect(decision.reason).toMatch(/unset/)
  })

  it('skips migration on preview deploys', () => {
    const decision = decideMigration({
      VERCEL_ENV: 'preview',
      DATABASE_URL_UNPOOLED: UNPOOLED,
    })
    expect(decision.action).toBe('skip')
    expect(decision.reason).toContain('preview')
  })

  it('skips migration on the development Vercel environment', () => {
    const decision = decideMigration({ VERCEL_ENV: 'development' })
    expect(decision.action).toBe('skip')
  })

  it('migrates on production when DATABASE_URL_UNPOOLED is present', () => {
    const decision = decideMigration({
      VERCEL_ENV: 'production',
      DATABASE_URL_UNPOOLED: UNPOOLED,
      DATABASE_URL: POOLED,
    })
    expect(decision.action).toBe('migrate')
  })

  it('fails hard on production when DATABASE_URL_UNPOOLED is missing (no pooled fallback)', () => {
    const decision = decideMigration({
      VERCEL_ENV: 'production',
      DATABASE_URL: POOLED,
    })
    expect(decision.action).toBe('fail')
    expect(decision.reason).toContain('DATABASE_URL_UNPOOLED')
    // The failure must not suggest using the pooled string.
    expect(decision.reason).toMatch(/Refusing to fall back/i)
  })

  it('fails hard on production when DATABASE_URL_UNPOOLED is blank', () => {
    const decision = decideMigration({
      VERCEL_ENV: 'production',
      DATABASE_URL_UNPOOLED: '   ',
    })
    expect(decision.action).toBe('fail')
  })
})
