import { describe, it, expect } from 'vitest'

// The Vercel build orchestration, imported from the plain-JS module (allowJs is
// on) so the exact function shipped to Vercel is the one under test. This drives
// the spawn / env-swap / exit-propagation wiring with injected fakes — no real
// migrate or build runs.
import { buildOnVercel } from '../../scripts/run-build.mjs'

const UNPOOLED = 'postgres://user:pass@db.neon.tech/main?sslmode=require'
const POOLED = 'postgres://user:pass@db-pooler.neon.tech/main?sslmode=require'

type SpawnCall = { command: string; args: string[]; databaseUrl: string | undefined }

/** An injected `exit` throws this so control unwinds the way `process.exit` would. */
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`)
  }
}

/**
 * Drive `buildOnVercel` with recording fakes. `statusByStep` maps the pnpm
 * subcommand (`migrate` / `build`) to the exit status its spawn should report;
 * anything unset succeeds (status 0).
 */
function drive(
  env: Record<string, string | undefined>,
  statusByStep: Record<string, number> = {},
): { calls: SpawnCall[]; exitCode: number | undefined; errors: string[] } {
  const calls: SpawnCall[] = []
  const errors: string[] = []
  let exitCode: number | undefined

  const spawn = (
    command: string,
    args: string[],
    options: { env?: Record<string, string | undefined> },
  ) => {
    calls.push({ command, args, databaseUrl: options.env?.DATABASE_URL })
    const step = args[1] ?? args[0]
    return { status: statusByStep[step] ?? 0 }
  }

  const exit = (code?: number) => {
    exitCode = code ?? 0
    throw new ExitSignal(exitCode)
  }

  try {
    buildOnVercel({
      env,
      spawn,
      log: () => {},
      error: (...a: unknown[]) => errors.push(a.map(String).join(' ')),
      exit,
    })
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e
  }

  return { calls, exitCode, errors }
}

describe('buildOnVercel (routing)', () => {
  it('skip path (VERCEL_ENV unset): invokes only the build, with the pooled DATABASE_URL', () => {
    const { calls, exitCode } = drive({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: UNPOOLED })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ command: 'pnpm', args: ['run', 'build'], databaseUrl: POOLED })
    expect(exitCode).toBeUndefined()
  })

  it('skip path (VERCEL_ENV=preview): does not migrate', () => {
    const { calls } = drive({
      VERCEL_ENV: 'preview',
      DATABASE_URL: POOLED,
      DATABASE_URL_UNPOOLED: UNPOOLED,
    })

    expect(calls.map((c) => c.args[1])).toEqual(['build'])
  })

  it('production path: migrates with DATABASE_URL swapped to the unpooled string, then builds with the pooled string', () => {
    const { calls, exitCode } = drive({
      VERCEL_ENV: 'production',
      DATABASE_URL: POOLED,
      DATABASE_URL_UNPOOLED: UNPOOLED,
    })

    expect(calls).toHaveLength(2)
    // Migrate runs first, against the direct/unpooled connection.
    expect(calls[0]).toMatchObject({ args: ['run', 'migrate'], databaseUrl: UNPOOLED })
    // Build runs second, keeping the pooled runtime string.
    expect(calls[1]).toMatchObject({ args: ['run', 'build'], databaseUrl: POOLED })
    expect(exitCode).toBeUndefined()
  })

  it('production path with a failing migrate: exits non-zero and never invokes the build', () => {
    const { calls, exitCode } = drive(
      { VERCEL_ENV: 'production', DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: UNPOOLED },
      { migrate: 1 },
    )

    expect(calls.map((c) => c.args[1])).toEqual(['migrate']) // build never reached
    expect(exitCode).toBe(1)
  })

  it('production path with DATABASE_URL_UNPOOLED missing: fails hard before spawning anything', () => {
    const { calls, exitCode, errors } = drive({ VERCEL_ENV: 'production', DATABASE_URL: POOLED })

    expect(calls).toHaveLength(0)
    expect(exitCode).toBe(1)
    expect(errors.join('\n')).toContain('DATABASE_URL_UNPOOLED')
  })
})
