// @vitest-environment node
// CMS-driven testimonials on /solutions/ai-training (issue #156).
//
// Renders the real async page against the local test database. Positive controls:
// a draft, a corporate-training row and a budget-software row are real, findable rows
// that must not surface on the school page.
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import type { Testimonial } from '@/payload-types'
import config from '@/payload.config'
import AiTrainingPage from '@/app/(frontend)/solutions/ai-training/page'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let payload: Payload

async function renderPage(): Promise<string> {
  const element = await (AiTrainingPage as unknown as (props: unknown) => Promise<ReactElement>)({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({}),
  })
  return renderToStaticMarkup(element)
}

async function clearTestimonials(): Promise<void> {
  await payload.delete({ collection: 'testimonials', where: { id: { exists: true } } })
}

async function seed(data: {
  quote: string
  clientName?: string
  organization?: string
  roleTitle?: string
  serviceCategory: NonNullable<Testimonial['serviceCategory']>
  status?: 'draft' | 'published'
}): Promise<void> {
  await payload.create({
    collection: 'testimonials',
    data: { clientName: 'E.M.', status: 'published', ...data },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await clearTestimonials()
})

describe('AI training (school) page — testimonials', () => {
  beforeEach(async () => {
    await clearTestimonials()
  })

  it('renders a published ai-training quote credited by initials and state, never the role', async () => {
    await seed({
      quote: 'School quote about payroll prompts.',
      clientName: 'E.M.',
      organization: 'New York',
      roleTitle: 'Payroll Supervisor Secret',
      serviceCategory: 'ai-training',
    })
    const html = await renderPage()
    expect(html).toContain('data-testid="training-testimonials"')
    expect(html).toContain('School quote about payroll prompts.')
    expect(html).toContain('E.M.')
    expect(html).toContain('New York')
    expect(html).not.toContain('Payroll Supervisor Secret')
  })

  it('does not render a draft ai-training quote', async () => {
    const quote = 'Draft school quote that must stay hidden.'
    await seed({ quote, serviceCategory: 'ai-training', status: 'draft' })
    const staff = await payload.find({
      collection: 'testimonials',
      where: { quote: { equals: quote } },
      overrideAccess: true,
    })
    expect(staff.docs, 'positive control: the draft exists').toHaveLength(1)
    expect(await renderPage()).not.toContain(quote)
  })

  it('does not render corporate-training or budget-software quotes', async () => {
    await seed({ quote: 'Corporate quote hidden here.', serviceCategory: 'corporate-training' })
    await seed({ quote: 'Budget quote hidden here.', serviceCategory: 'budget-software' })
    const html = await renderPage()
    expect(html).not.toContain('Corporate quote hidden here.')
    expect(html).not.toContain('Budget quote hidden here.')
  })

  it('omits the testimonials section when there are none', async () => {
    expect(await renderPage()).not.toContain('data-testid="training-testimonials"')
  })
})
