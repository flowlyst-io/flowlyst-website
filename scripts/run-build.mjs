/**
 * Orchestration for the Vercel build command.
 *
 * Kept as an exported, dependency-injectable function so its spawn / env-swap /
 * exit-propagation wiring can be unit-tested without shelling out. The thin
 * entrypoint `scripts/vercel-build.mjs` calls it with the real process
 * dependencies; the default arguments here reproduce that exact behaviour, so
 * running the entrypoint is identical to calling `buildOnVercel()` directly.
 *
 * On production Vercel builds it applies committed Payload migrations against the
 * direct (unpooled) Neon connection, then builds the app. On preview — and any
 * non-production environment — it skips straight to the build. If migration fails
 * it exits non-zero, the build fails, and the previous deployment stays live.
 */
import { spawnSync } from 'node:child_process'

import { decideMigration } from './migrate-gate.mjs'

/**
 * @typedef {{ status?: number | null, error?: Error }} SpawnResult
 * @typedef {(
 *   command: string,
 *   args: string[],
 *   options: import('node:child_process').SpawnSyncOptions,
 * ) => SpawnResult} SpawnFn
 */

/**
 * @param {object} [deps]
 * @param {Record<string, string | undefined>} [deps.env] - defaults to `process.env`
 * @param {SpawnFn} [deps.spawn] - defaults to `spawnSync`
 * @param {(...args: unknown[]) => void} [deps.log] - defaults to `console.log`
 * @param {(...args: unknown[]) => void} [deps.error] - defaults to `console.error`
 * @param {(code?: number) => void} [deps.exit] - defaults to `process.exit`; must not return
 */
export function buildOnVercel({
  env = process.env,
  spawn = spawnSync,
  log = console.log,
  error = console.error,
  exit = process.exit,
} = {}) {
  /**
   * Run a command inheriting stdio; exit with its status if it fails. `exit` is
   * expected to terminate the process (real `process.exit`) or throw (tests), so
   * control does not return here on failure.
   * @param {string} command
   * @param {string[]} args
   * @param {Record<string, string | undefined>} [extraEnv]
   */
  const run = (command, args, extraEnv = {}) => {
    const result = spawn(command, args, {
      stdio: 'inherit',
      env: { ...env, ...extraEnv },
    })
    if (result.error) {
      error(`[vercel-build] Failed to launch \`${command} ${args.join(' ')}\`:`, result.error)
      exit(1)
    }
    if (result.status !== 0) {
      exit(result.status ?? 1)
    }
  }

  const decision = decideMigration(env)

  if (decision.action === 'fail') {
    error(`[vercel-build] ERROR: ${decision.reason}`)
    exit(1)
    return
  }

  log(`[vercel-build] ${decision.reason}`)

  if (decision.action === 'migrate') {
    // Migrate against the direct/unpooled connection only. `pnpm run migrate`
    // carries the required `cross-env NODE_OPTIONS=--no-deprecation`; overriding
    // DATABASE_URL for this child alone leaves the pooled runtime string intact
    // for the build that follows.
    run('pnpm', ['run', 'migrate'], { DATABASE_URL: env.DATABASE_URL_UNPOOLED })
  }

  log('[vercel-build] Building the app…')
  run('pnpm', ['run', 'build'])
}
