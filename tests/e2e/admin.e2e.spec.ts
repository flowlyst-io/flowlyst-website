import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    // Cold dev server: seedTestUser can trigger a Drizzle schema push and the heavy
    // Payload /admin bundle compiles on first hit, which together can exceed the 30s
    // default while other workers compete for CPU. Give setup room so a cold start
    // isn't a flake. (No effect on a warm server — it just finishes sooner.)
    test.setTimeout(120_000)

    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    // Relative URLs resolve against use.baseURL (PLAYWRIGHT_PORT-derived), so this
    // never targets a hard-coded :3000 owned by another worktree's server.
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('/admin/collections/users')
    // The production build appends default list-view query params
    // (e.g. ?depth=1&limit=10), so match the path with an optional query string.
    await expect(page).toHaveURL(/\/admin\/collections\/users(\?.*)?$/)
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
