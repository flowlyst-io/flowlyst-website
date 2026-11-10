// @vitest-environment node
// CMS-driven testimonials on /solutions/corporate-ai-training (issue #156).
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import type { Testimonial } from '@/payload-types'
import config from '@/payload.config'
import CorporateAiTrainingPage from '@/app/(frontend)/solutions/corporate-ai-training/page'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let payload: Payload

async function renderPage(): Promise<string> {
  const element = await (
    CorporateAiTrainingPage as unknown as (props: unknown) => Promise<ReactElement>
  )({
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
    data: { clientName: 'E.G.', status: 'published', ...data },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await clearTestimonials()
})

describe('Corporate AI training page — testimonials', () => {
  beforeEach(async () => {
    await clearTestimonials()
  })

  it('renders a published corporate-training quote credited by initials and descriptor', async () => {
    await seed({
      quote: 'Corporate quote about automation.',
      clientName: 'E.G.',
      organization: 'international energy trading company',
      roleTitle: 'Secret Role Title',
      serviceCategory: 'corporate-training',
    })
    const html = await renderPage()
    expect(html).toContain('data-testid="corporate-testimonials"')
    expect(html).toContain('Corporate quote about automation.')
    expect(html).toContain('E.G.')
    expect(html).toContain('international energy trading company')
    expect(html).not.toContain('Secret Role Title')
  })

  it('does not render ai-training quotes or drafts', async () => {
    await seed({ quote: 'School quote hidden here.', serviceCategory: 'ai-training' })
    const draft = 'Corporate draft hidden here.'
    await seed({ quote: draft, serviceCategory: 'corporate-training', status: 'draft' })
    const staff = await payload.find({
      collection: 'testimonials',
      where: { quote: { equals: draft } },
      overrideAccess: true,
    })
    expect(staff.docs, 'positive control: the draft exists').toHaveLength(1)
    const html = await renderPage()
    expect(html).not.toContain('School quote hidden here.')
    expect(html).not.toContain(draft)
  })

  it('omits the testimonials section when there are none', async () => {
    expect(await renderPage()).not.toContain('data-testid="corporate-testimonials"')
  })
})
