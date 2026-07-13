import { defineConfig, devices } from '@playwright/test'

/**
 * Load environment variables from .env (DATABASE_URL, PAYLOAD_SECRET).
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

const isCI = !!process.env.CI

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
    baseURL: 'http://localhost:3000',
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
   */
  webServer: {
    command: isCI ? 'pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
