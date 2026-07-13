/**
 * Pure decision logic for the Vercel build gate.
 *
 * Deciding *whether* to run committed Payload migrations before the app build is
 * the one branch worth testing in isolation, so it lives here as a side-effect-free
 * function that `scripts/vercel-build.mjs` calls and `tests/unit` exercises.
 *
 * The rule:
 *   - Only production Vercel builds (`VERCEL_ENV === "production"`, set exclusively
 *     for main-branch production deploys) apply migrations. Preview builds must not
 *     — they'd push un-merged schema onto the shared staging database. Local builds
 *     never run this script at all.
 *   - Migrations must run against the *direct* (unpooled) Neon connection
 *     (`DATABASE_URL_UNPOOLED`), never the pooled runtime `DATABASE_URL`. If the
 *     production build is missing that variable we fail loudly rather than fall back
 *     to the pooler.
 *
 * @typedef {'skip' | 'migrate' | 'fail'} MigrationAction
 * @typedef {{ action: MigrationAction, reason: string }} MigrationDecision
 */

/**
 * @param {Record<string, string | undefined>} env - typically `process.env`
 * @returns {MigrationDecision}
 */
export function decideMigration(env) {
  const vercelEnv = env.VERCEL_ENV
  const unpooled = env.DATABASE_URL_UNPOOLED

  if (vercelEnv !== 'production') {
    const label = vercelEnv ? `"${vercelEnv}"` : 'unset'
    return {
      action: 'skip',
      reason: `VERCEL_ENV is ${label} (not "production") — skipping migrations. Only production builds apply committed migrations.`,
    }
  }

  if (!unpooled || unpooled.trim() === '') {
    return {
      action: 'fail',
      reason:
        'VERCEL_ENV is "production" but DATABASE_URL_UNPOOLED is not set. Migrations must run against the direct (unpooled) Neon connection, not the pooled DATABASE_URL. The Neon↔Vercel integration normally injects DATABASE_URL_UNPOOLED — verify it exists in the Vercel project\'s Production environment. Refusing to fall back to the pooled connection string.',
    }
  }

  return {
    action: 'migrate',
    reason:
      'VERCEL_ENV is "production" and DATABASE_URL_UNPOOLED is set — applying committed migrations before the build.',
  }
}
