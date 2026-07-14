// @vitest-environment node
// CMS-driven rendering of the Budget Software solution page (issue #8, PRD §9).
//
// Runs in Node (not jsdom): the page is an async server component that awaits the
// Payload Local API, a backend concern. We render the *real* page component against
// a DB we control, so this proves the page's own query path — the three-part filter
// (featured + published + serviceCategory=budget-software) and the omit-when-empty
// contract — not a reimplementation of it.
//
// Positive controls give the filter teeth: a DRAFT, a featured=false row, and a
// wrong-serviceCategory row are each real, findable rows that must NOT surface. If
// the page dropped `overrideAccess: false` or any leg of the filter, one of these
// would leak and the corresponding assertion would fail.
//
// The DB is isolated per-worktree (DATABASE_URL points at a throwaway database),
// and afterAll clears content so a following e2e omission read starts clean.
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import config from '@/payload.config'
import BudgetSoftwarePage from '@/app/(frontend)/solutions/budget-software/page'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let payload: Payload
const stamp = Date.now()

/**
 * Render the real budget page server component to a static HTML string. We await
 * the (async) component to resolve its top-level Payload query, then render the
 * resolved element. Defensive props: Next passes params/searchParams as promises;
 * supply empty ones so a destructure can't throw even if the page ignores them.
 */
async function renderBudget(): Promise<string> {
  const element = await (
    BudgetSoftwarePage as unknown as (props: unknown) => Promise<ReactElement>
  )({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({}),
  })
  return renderToStaticMarkup(element)
}

async function clearTestimonials(): Promise<void> {
  await payload.delete({ collection: 'testimonials', where: { id: { exists: true } } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await clearTestimonials()
})

describe('Budget page CMS rendering — featured testimonial', () => {
  // Each test owns a clean slate (fileParallelism is off, so files run serially).
  beforeEach(async () => {
    await clearTestimonials()
  })

  it('omits the testimonial section when the CMS has none', async () => {
    const html = await renderBudget()
    expect(html, 'testimonial section omitted when empty').not.toContain(
      'data-testid="budget-testimonial"',
    )
    // No broken scaffolding: no stray undefined/null bleeding into the markup.
    expect(html).not.toMatch(/>\s*undefined\s*</)
    expect(html).not.toMatch(/>\s*null\s*</)
  })

  it('renders a published, featured, budget-software testimonial', async () => {
    const quote = `PUBLISHED-BUDGET-${stamp}`
    await payload.create({
      collection: 'testimonials',
      data: {
        quote,
        clientName: 'Published Client',
        organization: 'Riverside USD',
        roleTitle: 'CFO',
        status: 'published',
        featured: true,
        serviceCategory: 'budget-software',
      },
    })

    const html = await renderBudget()
    expect(html, 'testimonial section present when a matching one exists').toContain(
      'data-testid="budget-testimonial"',
    )
    expect(html, 'the published quote renders').toContain(quote)
    // Attribution renders as role · organization (the design's form).
    expect(html, 'attribution renders').toMatch(/CFO\s*·\s*Riverside USD/)
  })

  it('does NOT leak a draft testimonial to the public page', async () => {
    const draft = `DRAFT-BUDGET-${stamp}`
    await payload.create({
      collection: 'testimonials',
      data: {
        quote: draft,
        clientName: 'Draft Client',
        status: 'draft',
        featured: true,
        serviceCategory: 'budget-software',
      },
    })

    // Positive control (teeth): the draft is a real, findable row — an
    // access-bypassing query returns it — so "absent from the render" is a real
    // guard check, not a vacuous pass. If the page dropped `overrideAccess: false`
    // + the published filter, this exact row would leak.
    const leakable = await payload.find({
      collection: 'testimonials',
      where: { quote: { equals: draft } },
      overrideAccess: true,
    })
    expect(leakable.totalDocs, 'draft must be findable without the guard').toBe(1)

    const html = await renderBudget()
    expect(html, 'no testimonial section when only a draft exists').not.toContain(
      'data-testid="budget-testimonial"',
    )
    expect(html, 'draft quote must NOT leak').not.toContain(draft)
  })

  it('does NOT surface a published, budget-software testimonial that is not featured', async () => {
    const notFeatured = `NOT-FEATURED-BUDGET-${stamp}`
    await payload.create({
      collection: 'testimonials',
      data: {
        quote: notFeatured,
        clientName: 'Unfeatured Client',
        status: 'published',
        featured: false,
        serviceCategory: 'budget-software',
      },
    })

    const html = await renderBudget()
    // Proves the `featured: true` leg of the filter — a published, on-category but
    // unfeatured row must stay off the page.
    expect(html, 'no section for a non-featured testimonial').not.toContain(
      'data-testid="budget-testimonial"',
    )
    expect(html, 'unfeatured quote must not render').not.toContain(notFeatured)
  })

  it('does NOT surface a featured, published testimonial from another service category', async () => {
    const otherCategory = `CONSULTING-${stamp}`
    await payload.create({
      collection: 'testimonials',
      data: {
        quote: otherCategory,
        clientName: 'Consulting Client',
        status: 'published',
        featured: true,
        serviceCategory: 'consulting',
      },
    })

    const html = await renderBudget()
    // Proves the `serviceCategory: 'budget-software'` leg — a featured, published
    // testimonial tagged to a different service must not appear on the budget page.
    expect(html, 'no section for an off-category testimonial').not.toContain(
      'data-testid="budget-testimonial"',
    )
    expect(html, 'off-category quote must not render').not.toContain(otherCategory)
  })
})
