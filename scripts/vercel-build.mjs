/**
 * Vercel build command (see `vercel.json` → `buildCommand`).
 *
 * On production deploys it applies committed Payload migrations against the direct
 * (unpooled) Neon connection, then builds the app. On preview deploys — and any
 * non-production Vercel environment — it skips straight to the build. Local
 * `pnpm build` never runs this script, so local behaviour is unchanged.
 *
 * If migration fails the process exits non-zero, the build fails, and the previous
 * deployment stays live.
 */
import { spawnSync } from 'node:child_process'

import { decideMigration } from './migrate-gate.mjs'

/**
 * Run a command inheriting stdio; exit this process with its status if it fails.
 * @param {string} command
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [extraEnv]
 */
function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  })
  if (result.error) {
    console.error(`[vercel-build] Failed to launch \`${command} ${args.join(' ')}\`:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function main() {
  const decision = decideMigration(process.env)

  if (decision.action === 'fail') {
    console.error(`[vercel-build] ERROR: ${decision.reason}`)
    process.exit(1)
  }

  console.log(`[vercel-build] ${decision.reason}`)

  if (decision.action === 'migrate') {
    // Migrate against the direct/unpooled connection only. `pnpm run migrate`
    // carries the required `cross-env NODE_OPTIONS=--no-deprecation`; overriding
    // DATABASE_URL for this child alone leaves the pooled runtime string intact
    // for the build that follows.
    run('pnpm', ['run', 'migrate'], { DATABASE_URL: process.env.DATABASE_URL_UNPOOLED })
  }

  console.log('[vercel-build] Building the app…')
  run('pnpm', ['run', 'build'])
}

main()
