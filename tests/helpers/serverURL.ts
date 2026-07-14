/**
 * Origin the E2E web server binds to, derived from `PLAYWRIGHT_PORT` (default 3000)
 * — the SAME variable playwright.config.ts uses for `webServer` and `use.baseURL`.
 *
 * Helpers that need an ABSOLUTE URL (the Payload admin login flow drives full-URL
 * navigations + waits) build it from here, so a suite run under a custom port never
 * targets another worktree's server on :3000. Specs that navigate the public site
 * should prefer relative paths (`page.goto('/…')`), which Playwright resolves
 * against `use.baseURL` — no import needed there.
 */
export const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`
