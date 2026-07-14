import { defineConfig, devices } from '@playwright/test'

/**
 * Load environment variables from .env (DATABASE_URL, PAYLOAD_SECRET).
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

const isCI = !!process.env.CI

/**
 * Port the E2E web server binds to (and the base URL the tests hit). Defaults to
 * 3000 — unset `PLAYWRIGHT_PORT` behaves exactly as before. Set it per checkout so
 * parallel worktrees never share a server: with `reuseExistingServer` on (local),
 * a hard-coded :3000 lets one worktree's suite silently run against ANOTHER
 * worktree's dev server. `next dev`/`next start` both honor the `PORT` env var, so
 * passing it through `webServer.env` (Playwright merges it into the child's
 * process.env, alongside DATABASE_URL/PAYLOAD_SECRET) binds the server to `PORT`.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  /*
   * Locally: run the dev server (Payload push auto-creates the schema — zero setup).
   * In CI: serve the production build. CI applies the committed migrations before
   * this runs (see .github/workflows/ci.yml), and push is disabled in CI, so the
   * schema is deterministic. Never reuse a stale server in CI.
   *
   * `reuseExistingServer: !isCI` is intentionally unchanged — the reliable fix for
   * cross-worktree contamination is a distinct `PLAYWRIGHT_PORT` per checkout (each
   * worktree then owns its own server), not disabling reuse.
   */
  webServer: {
    command: isCI ? 'pnpm start' : 'pnpm dev',
    url: baseURL,
    env: { PORT: String(PORT) },
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
