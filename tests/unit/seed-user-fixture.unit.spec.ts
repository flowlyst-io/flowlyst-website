import { describe, it, expect } from 'vitest'

// The admin-fixture email derivation (issue #46). Imported directly as a pure function
// so the uniqueness/idempotence property is provable without a DB or subprocesses.
import { deriveFixtureEmail } from '../helpers/seedUser'

describe('deriveFixtureEmail', () => {
  it('produces a valid, recognizable fixture address', () => {
    const email = deriveFixtureEmail({ cwd: '/work/wt-a', port: 3000 })
    expect(email).toMatch(/^dev-e2e-[0-9a-f]{12}@payloadcms\.com$/)
  })

  it('is stable for the same (cwd, port) — re-runs reuse their own row', () => {
    const key = { cwd: '/work/wt-a', port: 3100 }
    expect(deriveFixtureEmail(key)).toBe(deriveFixtureEmail(key))
  })

  it('differs across checkouts (distinct cwd) — the two-worktree race in #46', () => {
    const a = deriveFixtureEmail({ cwd: '/work/wt-a', port: 3000 })
    const b = deriveFixtureEmail({ cwd: '/work/wt-b', port: 3000 })
    expect(a).not.toBe(b)
  })

  it('differs across ports from one checkout (distinct port, same cwd)', () => {
    const a = deriveFixtureEmail({ cwd: '/work/wt-a', port: 3000 })
    const b = deriveFixtureEmail({ cwd: '/work/wt-a', port: 3100 })
    expect(a).not.toBe(b)
  })

  it('two concurrent seeds with different keys never collide on one address', () => {
    // Model the shared-Postgres scenario: N checkouts each derive their own email.
    const keys = [
      { cwd: '/work/wt-a', port: 3000 },
      { cwd: '/work/wt-b', port: 3100 },
      { cwd: '/work/wt-c', port: 3200 },
      { cwd: '/work/wt-a', port: 3200 }, // same cwd as first, different port
      { cwd: '/work/wt-c', port: 3000 }, // same cwd as third, different port
    ]
    const emails = keys.map(deriveFixtureEmail)
    expect(new Set(emails).size).toBe(keys.length)
  })

  it('defaults cwd/port from the environment when called with no args', () => {
    // The zero-arg call used by testUser must still yield a valid fixture address.
    expect(deriveFixtureEmail()).toMatch(/^dev-e2e-[0-9a-f]{12}@payloadcms\.com$/)
  })
})
