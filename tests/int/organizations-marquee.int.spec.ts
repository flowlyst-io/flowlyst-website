// @vitest-environment node
// Homepage trust strip fed by the Organizations collection (issue #43). Renders the
// real HomePage like home-cms.int.spec.ts does.
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import config from '@/payload.config'
import HomePage from '@/app/(frontend)/page'
import { seedMarqueeOrganizations } from '@/migrations/20261017_000039_organizations'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let payload: Payload
const stamp = Date.now()

async function renderHome(): Promise<string> {
  const element = await (HomePage as unknown as (props: unknown) => Promise<ReactElement>)({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({}),
  })
  return renderToStaticMarkup(element)
}

function firstHalf(html: string): string {
  const start = html.indexOf('marquee__half')
  const end = html.indexOf('marquee__half--duplicate')
  expect(start, 'strip must render').toBeGreaterThan(-1)
  expect(end, 'strip must render its duplicate half').toBeGreaterThan(start)
  return html.slice(start, end)
}

type OrgData = {
  name: string
  status: 'draft' | 'published'
  showInMarquee: boolean
  order?: number
}

async function createOrg(data: OrgData) {
  return payload.create({ collection: 'organizations', data })
}

async function clearOrganizations(): Promise<void> {
  await payload.delete({ collection: 'organizations', where: { id: { exists: true } } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

beforeEach(clearOrganizations)

afterEach(() => {
  vi.restoreAllMocks()
})

// CI builds and runs e2e against this same database next, so leave the seed behind.
afterAll(async () => {
  await clearOrganizations()
  await seedMarqueeOrganizations(payload.db.drizzle)
})

describe('Homepage organizations strip', () => {
  it('renders a published organization marked to show', async () => {
    const name = `ORG-A-${stamp}`
    await createOrg({ name, status: 'published', showInMarquee: true, order: 1 })

    const html = await renderHome()
    expect(html).toContain('data-testid="home-marquee"')
    expect(html).toContain(name)
  })

  it('does NOT leak a draft organization, even when marked to show', async () => {
    const name = `ORG-DRAFT-${stamp}`
    await createOrg({ name, status: 'draft', showInMarquee: true, order: 1 })

    const leakable = await payload.find({
      collection: 'organizations',
      where: { name: { equals: name } },
      overrideAccess: true,
    })
    expect(leakable.totalDocs, 'draft must be findable without the guard').toBe(1)

    const html = await renderHome()
    expect(html).not.toContain(name)
  })

  it('does not render a published organization that is not marked to show', async () => {
    const name = `ORG-UNSHOWN-${stamp}`
    await createOrg({ name, status: 'published', showInMarquee: false, order: 1 })

    const html = await renderHome()
    expect(html).not.toContain(name)
  })

  it('renders in the admin-set order, not creation order', async () => {
    const second = `ORG-SECOND-${stamp}`
    const first = `ORG-FIRST-${stamp}`
    const third = `ORG-THIRD-${stamp}`
    await createOrg({ name: second, status: 'published', showInMarquee: true, order: 2 })
    await createOrg({ name: first, status: 'published', showInMarquee: true, order: 1 })
    await createOrg({ name: third, status: 'published', showInMarquee: true, order: 3 })

    const half = firstHalf(await renderHome())
    expect(half.indexOf(first)).toBeGreaterThan(-1)
    expect(half.indexOf(first)).toBeLessThan(half.indexOf(second))
    expect(half.indexOf(second)).toBeLessThan(half.indexOf(third))
  })

  it('puts an organization with no order after the numbered ones', async () => {
    const blank = `ORG-BLANK-${stamp}`
    const numbered = `ORG-NUMBERED-${stamp}`
    await createOrg({ name: blank, status: 'published', showInMarquee: true })
    await createOrg({ name: numbered, status: 'published', showInMarquee: true, order: 1 })

    const half = firstHalf(await renderHome())
    expect(half.indexOf(numbered)).toBeGreaterThan(-1)
    expect(half.indexOf(numbered)).toBeLessThan(half.indexOf(blank))
  })

  it('hides the whole strip when nothing is both published and marked to show', async () => {
    await createOrg({ name: `ORG-D-${stamp}`, status: 'draft', showInMarquee: true, order: 1 })
    await createOrg({ name: `ORG-U-${stamp}`, status: 'published', showInMarquee: false, order: 2 })

    const html = await renderHome()
    expect(html).not.toContain('data-testid="home-marquee"')
    expect(html).not.toContain('class="marquee"')
  })

  it('still renders the homepage, without the strip, when the organizations query fails', async () => {
    await createOrg({ name: `ORG-FAIL-${stamp}`, status: 'published', showInMarquee: true })

    const realFind = payload.find.bind(payload)
    vi.spyOn(payload, 'find').mockImplementation(((args: { collection: string }) =>
      args.collection === 'organizations'
        ? Promise.reject(new Error('relation "organizations" does not exist'))
        : realFind(args as never)) as never)
    const logged = vi.spyOn(payload.logger, 'error').mockImplementation(() => undefined)

    const html = await renderHome()
    expect(html, 'homepage still renders').toContain('<h1')
    expect(html).not.toContain('data-testid="home-marquee"')
    expect(html).not.toContain(`ORG-FAIL-${stamp}`)
    expect(logged, 'failure is logged, not swallowed silently').toHaveBeenCalled()
  })
})

describe('Organizations collection', () => {
  it('shows an anonymous reader only published organizations', async () => {
    await createOrg({ name: `ORG-PUB-${stamp}`, status: 'published', showInMarquee: true })
    await createOrg({ name: `ORG-DRF-${stamp}`, status: 'draft', showInMarquee: true })

    const result = await payload.find({ collection: 'organizations', overrideAccess: false })
    expect(result.totalDocs).toBe(1)
    expect(result.docs.every((doc) => doc.status === 'published')).toBe(true)
  })

  it('seeds the five current names in order, idempotently, without AASA', async () => {
    await seedMarqueeOrganizations(payload.db.drizzle)
    await seedMarqueeOrganizations(payload.db.drizzle)

    const result = await payload.find({
      collection: 'organizations',
      sort: 'order',
      overrideAccess: true,
      limit: 0,
    })
    expect(result.docs.map((doc) => doc.name)).toEqual([
      'ASBO International',
      'NJASBO',
      'CPS',
      'WSPS',
      'BSD',
    ])
    expect(result.docs.every((doc) => doc.status === 'published' && doc.showInMarquee)).toBe(true)
    expect(result.docs.map((doc) => doc.name)).not.toContain('AASA')
  })

  it('runs its revalidation hooks on create, update and delete outside a request', async () => {
    const created = await createOrg({
      name: `ORG-HOOK-${stamp}`,
      status: 'published',
      showInMarquee: true,
    })
    await expect(
      payload.update({ collection: 'organizations', id: created.id, data: { order: 5 } }),
    ).resolves.toBeDefined()
    await expect(
      payload.delete({ collection: 'organizations', id: created.id }),
    ).resolves.toBeDefined()
  })
})
