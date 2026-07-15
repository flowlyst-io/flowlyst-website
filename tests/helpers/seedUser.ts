import { createHash } from 'node:crypto'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * Derive the admin-fixture email — unique per checkout+port, but stable within a run.
 *
 * The fixture used to hardcode `dev@payloadcms.com`. When two worktrees ran
 * `admin.e2e.spec.ts` against the SAME Postgres, both seeded and deleted that one
 * `users` row, so one file's `afterAll` cleanup could remove the user mid-login for
 * the other → intermittent `AuthenticationError` (issue #46).
 *
 * The suffix is a short hash of the working directory + `PLAYWRIGHT_PORT`, both stable
 * within a single run:
 *   - two checkouts differ (distinct cwd, and — per #8 — a distinct `PLAYWRIGHT_PORT`),
 *     so their fixture rows never collide; the port term also isolates two instances
 *     launched from one checkout (same cwd, different port);
 *   - re-runs in the same checkout reuse their own row (`seedTestUser` deletes then
 *     recreates it), rather than stranding a fresh row every run the way a `Date.now()`
 *     stamp would.
 *
 * Pure and parameterized so the uniqueness/idempotence property is unit-testable
 * without spawning subprocesses.
 */
export function deriveFixtureEmail({
  cwd = process.cwd(),
  port = process.env.PLAYWRIGHT_PORT ?? '',
}: { cwd?: string; port?: string | number } = {}): string {
  const suffix = createHash('sha256').update(`${cwd}::${port}`).digest('hex').slice(0, 12)
  return `dev-e2e-${suffix}@payloadcms.com`
}

export const testUser = {
  email: deriveFixtureEmail(),
  password: 'test',
  name: 'Dev User',
  role: 'admin' as const,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: testUser,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
