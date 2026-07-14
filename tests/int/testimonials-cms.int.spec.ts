// @vitest-environment node
// CMS-driven rendering of the /testimonials index (issue #18, PRD §7 / §9).
//
// Runs in Node (not jsdom): the page is an async server component that awaits the
// Payload Local API. We render the *real* page component against a DB we control, so
// this proves the page's own query + filter path — published-only visibility, the two
// filter dimensions (service and role), their combination, and both empty states — not
// a reimplementation of them.
//
// Positive controls give the filters teeth: a DRAFT row, a wrong-service row, and a
// wrong-role row are each real, findable rows that must NOT surface under the active
// filter. If the page dropped `overrideAccess: false` or any leg of the filter, one of
// these would leak and the corresponding assertion would fail.
//
// The DB is isolated per-worktree (DATABASE_URL points at a throwaway database), and
// each test owns a clean slate (fileParallelism is off, so files run serially).
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import config from '@/payload.config'
import TestimonialsPage from '@/app/(frontend)/testimonials/page'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let payload: Payload
const stamp = Date.now()

/** Render the real page server component to a static HTML string with given filters. */
async function render(searchParams: Record<string, string> = {}): Promise<string> {
  const element = await (TestimonialsPage as unknown as (props: unknown) => Promise<ReactElement>)({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  })
  return renderToStaticMarkup(element)
}

async function clearTestimonials(): Promise<void> {
  await payload.delete({ collection: 'testimonials', where: { id: { exists: true } } })
}

// Minimal published testimonial factory (only the fields under test).
async function seed(data: {
  quote: string
  roleTitle?: string
  organization?: string
  serviceCategory?: 'ai-training' | 'budget-software' | 'consulting' | 'keynotes' | 'general'
  status?: 'draft' | 'published'
  videoUrl?: string
}): Promise<void> {
  await payload.create({
    collection: 'testimonials',
    data: {
      clientName: 'Client',
      status: 'published',
      ...data,
    },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await clearTestimonials()
})

describe('Testimonials index — CMS rendering', () => {
  beforeEach(async () => {
    await clearTestimonials()
  })

  it('shows the no-content empty state when the CMS has no testimonials', async () => {
    const html = await render()
    expect(html, 'empty state renders when there is nothing to show').toContain(
      'data-testid="testimonials-empty"',
    )
    expect(html, 'no grid when empty').not.toContain('data-testid="testimonials-grid"')
    // No role filter row when no testimonial carries a role.
    expect(html, 'no role filter when no roles exist').not.toContain('data-testid="filter-role"')
    // No broken scaffolding.
    expect(html).not.toMatch(/>\s*undefined\s*</)
    expect(html).not.toMatch(/>\s*null\s*</)
  })

  it('renders a published testimonial (quote, role, organization)', async () => {
    const quote = `PUBLISHED-${stamp}`
    await seed({
      quote,
      roleTitle: 'CFO',
      organization: 'Riverside USD',
      serviceCategory: 'consulting',
    })

    const html = await render()
    expect(html, 'grid present when a testimonial exists').toContain(
      'data-testid="testimonials-grid"',
    )
    expect(html, 'the published quote renders').toContain(quote)
    expect(html, 'role renders as the primary name').toContain('CFO')
    expect(html, 'organization renders').toContain('Riverside USD')
    // Service tag uses the schema's own label.
    expect(html, 'service tag label').toContain('Consulting')
  })

  it('does NOT leak a draft testimonial to the public page', async () => {
    const draft = `DRAFT-${stamp}`
    await seed({ quote: draft, status: 'draft', serviceCategory: 'consulting' })

    // Positive control (teeth): the draft is a real, findable row without the guard.
    const leakable = await payload.find({
      collection: 'testimonials',
      where: { quote: { equals: draft } },
      overrideAccess: true,
    })
    expect(leakable.totalDocs, 'draft must be findable without the guard').toBe(1)

    const html = await render()
    expect(html, 'draft quote must NOT leak').not.toContain(draft)
    // Only a draft exists → the public list is empty.
    expect(html, 'empty state when only a draft exists').toContain(
      'data-testid="testimonials-empty"',
    )
  })

  it('filters by service — only matching-category testimonials render', async () => {
    const budget = `BUDGET-${stamp}`
    const consulting = `CONSULTING-${stamp}`
    await seed({ quote: budget, roleTitle: 'CFO', serviceCategory: 'budget-software' })
    await seed({ quote: consulting, roleTitle: 'Superintendent', serviceCategory: 'consulting' })

    const html = await render({ service: 'budget-software' })
    expect(html, 'the budget-software quote renders under its filter').toContain(budget)
    expect(html, 'the consulting quote is filtered out').not.toContain(consulting)
  })

  it('filters by the keynotes category (added as a first-class service)', async () => {
    const keynote = `KEYNOTE-${stamp}`
    const consulting = `CONSULTING2-${stamp}`
    await seed({ quote: keynote, roleTitle: 'Board Chair', serviceCategory: 'keynotes' })
    await seed({ quote: consulting, roleTitle: 'HR Director', serviceCategory: 'consulting' })

    const html = await render({ service: 'keynotes' })
    expect(html, 'the keynotes quote renders under its filter').toContain(keynote)
    expect(html, 'its tag uses the Keynotes label').toContain('Keynotes')
    expect(html, 'a non-keynotes quote is filtered out').not.toContain(consulting)
  })

  it('filters by role — only the matching role renders', async () => {
    const cfo = `CFO-QUOTE-${stamp}`
    const supt = `SUPT-QUOTE-${stamp}`
    await seed({ quote: cfo, roleTitle: 'CFO', serviceCategory: 'budget-software' })
    await seed({ quote: supt, roleTitle: 'Superintendent', serviceCategory: 'consulting' })

    // Role chips are derived from the distinct published roles.
    const unfiltered = await render()
    expect(unfiltered, 'role filter row appears once a role exists').toContain(
      'data-testid="filter-role"',
    )

    const html = await render({ role: 'CFO' })
    expect(html, 'the CFO quote renders under the role filter').toContain(cfo)
    expect(html, 'the Superintendent quote is filtered out').not.toContain(supt)
  })

  it('combines service AND role filters (intersection only)', async () => {
    const target = `BUDGET-CFO-${stamp}`
    const wrongRole = `BUDGET-SUPT-${stamp}`
    const wrongService = `CONSULTING-CFO-${stamp}`
    await seed({ quote: target, roleTitle: 'CFO', serviceCategory: 'budget-software' })
    await seed({
      quote: wrongRole,
      roleTitle: 'Superintendent',
      serviceCategory: 'budget-software',
    })
    await seed({ quote: wrongService, roleTitle: 'CFO', serviceCategory: 'consulting' })

    const html = await render({ service: 'budget-software', role: 'CFO' })
    expect(html, 'only the budget-software + CFO testimonial renders').toContain(target)
    expect(html, 'wrong role (right service) is excluded').not.toContain(wrongRole)
    expect(html, 'wrong service (right role) is excluded').not.toContain(wrongService)
  })

  it('role chip hrefs MERGE the active service filter (do not replace it)', async () => {
    // With a service filter active, a role chip must produce ?service=…&role=… so
    // toggling one dimension never drops the other. `&` serializes as `&amp;` in the
    // attribute, so the assertion tolerates both.
    await seed({ quote: `MERGE-${stamp}`, roleTitle: 'CFO', serviceCategory: 'budget-software' })

    const html = await render({ service: 'budget-software' })
    expect(html, 'the CFO role chip carries both the service and role params').toMatch(
      /href="[^"]*service=budget-software(?:&amp;|&)role=CFO/,
    )
  })

  it('shows the filtered-empty state (with a reset link) when nothing matches', async () => {
    await seed({ quote: `BUDGET-${stamp}`, roleTitle: 'CFO', serviceCategory: 'budget-software' })

    // A category with no published testimonials.
    const html = await render({ service: 'ai-training' })
    expect(html, 'filtered-empty state renders').toContain('data-testid="testimonials-empty"')
    expect(html, 'offers a reset back to all testimonials').toContain('Show all testimonials')
    expect(html, 'no grid when the filter matches nothing').not.toContain(
      'data-testid="testimonials-grid"',
    )
  })

  it('ignores an unknown/junk filter value (renders the full list, no false empty)', async () => {
    const quote = `PUBLISHED-${stamp}`
    await seed({ quote, roleTitle: 'CFO', serviceCategory: 'budget-software' })

    // A bogus service value is not in the enum → treated as no filter.
    const html = await render({ service: 'not-a-real-category' })
    expect(html, 'junk filter falls back to the full list').toContain(quote)
    expect(html, 'no false empty state from a junk param').not.toContain(
      'data-testid="testimonials-empty"',
    )
  })

  it('renders a video testimonial as a real link to its videoUrl', async () => {
    const quote = `VIDEO-${stamp}`
    await seed({
      quote,
      roleTitle: 'CFO',
      serviceCategory: 'consulting',
      videoUrl: 'https://example.com/watch',
    })

    const html = await render()
    expect(html, 'video card is present').toContain('data-testid="testimonial-video"')
    expect(html, 'video card links to the real videoUrl').toContain('https://example.com/watch')
  })
})
