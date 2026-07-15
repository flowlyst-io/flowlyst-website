// @vitest-environment node
// CMS-driven rendering of the Case Studies index + detail pages (issue #19, PRD §7/§9).
//
// Runs in Node (not jsdom): the pages are async server components that await the
// Payload Local API. We render the *real* page components against a DB we control, so
// this proves each page's own query path — published-only visibility, the structured
// story sections, the metrics band, the Article JSON-LD, and the empty state — not a
// reimplementation.
//
// Seeding/teardown pass `context: { disableRevalidate: true }` so the collection's
// afterChange/afterDelete revalidation hooks (which call Next's `revalidatePath`) do
// NOT fire outside a request scope — that would throw in this node env. The render
// path is a read (`find`), which never triggers those hooks.
//
// The DB is isolated per-worktree (DATABASE_URL points at a throwaway database), and
// afterEach/afterAll clear content so following reads start clean.
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import config from '@/payload.config'
import CaseStudiesIndexPage from '@/app/(frontend)/case-studies/page'
import CaseStudyDetailPage, {
  generateMetadata as caseDetailMetadata,
} from '@/app/(frontend)/case-studies/[slug]/page'
import { RichTextBody } from '@/app/(frontend)/case-studies/[slug]/RichTextBody'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const stamp = Date.now()

// Minimal, valid Lexical editor state wrapping a single paragraph of text — the shape
// a richText field stores. Enough to prove the section renders its authored copy.
function lexical(text: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: [
            { type: 'text', format: 0, style: '', mode: 'normal', detail: 0, text, version: 1 },
          ],
        },
      ],
    },
  }
}

// Lexical state whose paragraph ends with a link node carrying the given href — used
// to prove the RichTextBody link converter sanitizes `href` schemes.
function lexicalWithLink(prefix: string, linkText: string, url: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: [
            {
              type: 'text',
              format: 0,
              style: '',
              mode: 'normal',
              detail: 0,
              text: prefix,
              version: 1,
            },
            {
              type: 'link',
              format: '' as const,
              indent: 0,
              version: 3,
              direction: 'ltr' as const,
              fields: { linkType: 'custom', url, newTab: false },
              children: [
                {
                  type: 'text',
                  format: 0,
                  style: '',
                  mode: 'normal',
                  detail: 0,
                  text: linkText,
                  version: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  }
}

// Lexical state with a bullet list of the given items — used to prove the RichTextBody
// list converter restores the markers + indent Tailwind preflight strips.
function lexicalWithList(items: string[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'list',
          tag: 'ul' as const,
          listType: 'bullet' as const,
          start: 1,
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: items.map((text, i) => ({
            type: 'listitem',
            value: i + 1,
            format: '' as const,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              { type: 'text', format: 0, style: '', mode: 'normal', detail: 0, text, version: 1 },
            ],
          })),
        },
      ],
    },
  }
}

async function renderIndex(): Promise<string> {
  const element = await (
    CaseStudiesIndexPage as unknown as (props: unknown) => Promise<ReactElement>
  )({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })
  return renderToStaticMarkup(element)
}

async function renderDetail(slug: string): Promise<string> {
  const element = await (
    CaseStudyDetailPage as unknown as (props: {
      params: Promise<{ slug: string }>
    }) => Promise<ReactElement>
  )({ params: Promise.resolve({ slug }) })
  return renderToStaticMarkup(element)
}

async function clearCaseStudies(): Promise<void> {
  await payload.delete({
    collection: 'case-studies',
    where: { id: { exists: true } },
    context: { disableRevalidate: true },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await clearCaseStudies()
})

afterEach(async () => {
  await clearCaseStudies()
})

afterAll(async () => {
  await clearCaseStudies()
})

describe('Case studies index — CMS rendering', () => {
  it('shows the empty state when no case studies are published', async () => {
    const html = await renderIndex()
    expect(html, 'empty state present when the CMS has none').toContain(
      'data-testid="case-studies-empty"',
    )
    expect(html, 'no case card when empty').not.toContain('data-testid="case-card"')
    // No broken scaffolding leaking into the markup.
    expect(html).not.toMatch(/>\s*undefined\s*</)
    expect(html).not.toMatch(/>\s*null\s*</)
  })

  it('renders a published case card with its title, summary, headline stat, and size chip', async () => {
    const title = `Monthly report automation ${stamp}`
    const summary = `Cut a three-day close to three hours ${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: {
        title,
        slug: `monthly-report-automation-${stamp}`,
        serviceCategory: 'consulting',
        districtInfo: { name: 'Westfield PS', state: 'NJ', studentCount: 12000 },
        metrics: [{ label: 'Close time', value: '3 days → 3 hours' }],
        meta: { description: summary },
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderIndex()
    expect(html, 'the card is present').toContain('data-testid="case-card"')
    expect(html, 'empty state gone once a case exists').not.toContain(
      'data-testid="case-studies-empty"',
    )
    expect(html, 'title renders').toContain(title)
    expect(html, 'summary (meta.description) renders').toContain(summary)
    expect(html, 'headline stat (metrics[0].value) renders').toContain('3 days → 3 hours')
    expect(html, 'size chip from studentCount renders').toMatch(/~12,000 students/)
    expect(html, 'card links to the detail path').toContain(
      `href="/case-studies/monthly-report-automation-${stamp}"`,
    )
  })

  it('does NOT leak a draft case study to the public index', async () => {
    const draftTitle = `DRAFT-CASE-${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: {
        title: draftTitle,
        slug: `draft-case-${stamp}`,
        serviceCategory: 'ai-training',
        _status: 'draft',
      },
      context: { disableRevalidate: true },
    })

    // Positive control (teeth): the draft is a real, findable row — an access-bypassing
    // query returns it — so "absent from the render" is a real guard, not a vacuous pass.
    const leakable = await payload.find({
      collection: 'case-studies',
      where: { title: { equals: draftTitle } },
      overrideAccess: true,
    })
    expect(leakable.totalDocs, 'draft must be findable without the guard').toBe(1)

    const html = await renderIndex()
    expect(html, 'empty state (only a draft exists)').toContain('data-testid="case-studies-empty"')
    expect(html, 'draft title must NOT leak').not.toContain(draftTitle)
  })
})

describe('Case studies index — excerpt summary + implementation chip (#20)', () => {
  it('uses the excerpt as the card summary when set (not the meta description)', async () => {
    const excerpt = `Excerpt summary under test ${stamp}`
    const metaDesc = `META-FALLBACK-${stamp} must be overridden by the excerpt`
    await payload.create({
      collection: 'case-studies',
      data: {
        title: `Excerpt Card ${stamp}`,
        slug: `excerpt-card-${stamp}`,
        serviceCategory: 'consulting',
        excerpt,
        meta: { description: metaDesc },
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderIndex()
    expect(html, 'the excerpt is the card summary').toContain(excerpt)
    expect(html, 'the meta description is NOT used when an excerpt exists').not.toContain(metaDesc)
  })

  it('falls back to the meta description as the summary when the excerpt is empty', async () => {
    const metaDesc = `META-SUMMARY-${stamp} used because no excerpt was authored`
    await payload.create({
      collection: 'case-studies',
      data: {
        title: `Fallback Card ${stamp}`,
        slug: `fallback-card-${stamp}`,
        serviceCategory: 'budget-software',
        meta: { description: metaDesc },
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderIndex()
    expect(html, 'meta description is the summary when the excerpt is absent').toContain(metaDesc)
  })

  it('renders the implementation chip when implementationDuration is set', async () => {
    await payload.create({
      collection: 'case-studies',
      data: {
        title: `Impl Chip Card ${stamp}`,
        slug: `impl-chip-card-${stamp}`,
        serviceCategory: 'consulting',
        implementationDuration: '6 weeks',
        districtInfo: { studentCount: 12000 },
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderIndex()
    expect(html, 'the implementation chip renders its labelled duration').toContain(
      'Implementation: 6 weeks',
    )
    // Order (design comp): implementation chip precedes the size chip.
    expect(
      html.indexOf('Implementation: 6 weeks'),
      'implementation chip renders before the size chip',
    ).toBeLessThan(html.indexOf('~12,000 students'))
  })

  it('omits the implementation chip when implementationDuration is unset', async () => {
    await payload.create({
      collection: 'case-studies',
      data: {
        title: `No Impl Card ${stamp}`,
        slug: `no-impl-card-${stamp}`,
        serviceCategory: 'general',
        districtInfo: { studentCount: 9000 },
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderIndex()
    expect(html, 'the card (with a size chip) still renders').toMatch(/~9,000 students/)
    expect(html, 'no implementation chip without the field').not.toContain('Implementation:')
  })
})

describe('Case study detail — CMS rendering', () => {
  const baseData = () => ({
    serviceCategory: 'consulting' as const,
    districtInfo: { name: 'Westfield PS', state: 'NJ', studentCount: 12000 },
    intro: lexical(`INTRO-${stamp}`),
    challenge: lexical(`CHALLENGE-${stamp}`),
    solution: lexical(`SOLUTION-${stamp}`),
    results: lexical(`RESULTS-${stamp}`),
    metrics: [
      { label: 'Close time', value: '3 days → 3 hours' },
      { label: 'Hours saved', value: '1,200/yr' },
    ],
    meta: { description: `A K-12 close automation story ${stamp}` },
    _status: 'published' as const,
  })

  it('renders every structured section, the metrics band, and district info', async () => {
    const title = `Full Story ${stamp}`
    const slug = `full-story-${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: { title, slug, ...baseData() },
      context: { disableRevalidate: true },
    })

    const html = await renderDetail(slug)

    // Header
    expect(html, 'title (single H1) renders').toContain(title)
    expect(html, 'back link to the index').toContain('href="/case-studies"')

    // Structured story sections (order + presence)
    for (const testid of [
      'case-study-intro',
      'case-study-challenge',
      'case-study-solution',
      'case-study-results',
      'case-study-metrics',
      'case-study-district',
    ]) {
      expect(html, `section ${testid} present`).toContain(`data-testid="${testid}"`)
    }
    // Section labels are real headings
    expect(html).toContain('The challenge')
    expect(html).toContain('The solution')
    expect(html).toContain('The results')
    // Rich-text body copy renders
    expect(html).toContain(`INTRO-${stamp}`)
    expect(html).toContain(`CHALLENGE-${stamp}`)
    expect(html).toContain(`SOLUTION-${stamp}`)
    expect(html).toContain(`RESULTS-${stamp}`)

    // Metrics band values + labels
    expect(html).toContain('3 days → 3 hours')
    expect(html).toContain('1,200/yr')
    expect(html).toContain('Hours saved')

    // District info
    expect(html).toContain('Westfield PS')
    expect(html).toMatch(/~12,000 students/)
  })

  it('omits the intro / metrics / district sections when their data is absent', async () => {
    const slug = `sparse-story-${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: {
        title: `Sparse ${stamp}`,
        slug,
        serviceCategory: 'general',
        challenge: lexical(`ONLY-CHALLENGE-${stamp}`),
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderDetail(slug)
    expect(html, 'challenge present').toContain('data-testid="case-study-challenge"')
    expect(html, 'no intro section').not.toContain('data-testid="case-study-intro"')
    expect(html, 'no metrics band without metrics').not.toContain(
      'data-testid="case-study-metrics"',
    )
    expect(html, 'no district block without district info').not.toContain(
      'data-testid="case-study-district"',
    )
    expect(html).not.toMatch(/>\s*undefined\s*</)
  })

  it('emits Article JSON-LD with headline, datePublished, and an Organization publisher', async () => {
    const title = `JSON-LD Story ${stamp}`
    const slug = `jsonld-story-${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: { title, slug, ...baseData() },
      context: { disableRevalidate: true },
    })

    const html = await renderDetail(slug)
    const blocks = [
      ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    ].map((m) => JSON.parse(m[1]))
    const article = blocks.find((b) => b['@type'] === 'Article')

    expect(article, 'an Article JSON-LD node is emitted').toBeTruthy()
    expect(article.headline, 'headline is the case title').toBe(title)
    expect(article.datePublished, 'datePublished is set').toBeTruthy()
    expect(article.mainEntityOfPage, 'mainEntityOfPage is an absolute URL').toMatch(
      new RegExp(`/case-studies/${slug}$`),
    )
    expect(article.publisher?.['@type'], 'publisher is an Organization').toBe('Organization')
    expect(article.publisher?.name, 'publisher is flowlyst').toBe('flowlyst')
    expect(article.author?.['@type'], 'author is an Organization').toBe('Organization')
  })

  it('404s (notFound) for a draft slug — drafts never render on the public detail page', async () => {
    const slug = `draft-detail-${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: { title: `Draft Detail ${stamp}`, slug, serviceCategory: 'general', _status: 'draft' },
      context: { disableRevalidate: true },
    })

    // Positive control: the draft is a real, findable row without the access guard.
    const leakable = await payload.find({
      collection: 'case-studies',
      where: { slug: { equals: slug } },
      overrideAccess: true,
    })
    expect(leakable.totalDocs, 'draft must be findable without the guard').toBe(1)

    // notFound() throws Next's not-found control-flow error, so the render rejects.
    await expect(renderDetail(slug), 'a draft slug must not render — it 404s').rejects.toThrow()
  })
})

describe('Case study detail — per-case SEO metadata', () => {
  // generateMetadata is a separate Next mechanism from the rendered component (it
  // populates <head>, not JSX), so it must be asserted directly. Requirement #3 /
  // review invariant (a): a unique title, description, canonical, and og:type per case.
  it('produces a unique title, /case-studies/[slug] canonical, and og:type article', async () => {
    const title = `Metadata Story ${stamp}`
    const slug = `metadata-story-${stamp}`
    const description = `A metadata-under-test description ${stamp} — long enough to be usable.`
    await payload.create({
      collection: 'case-studies',
      data: {
        title,
        slug,
        serviceCategory: 'consulting',
        meta: { description },
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const meta = await caseDetailMetadata({ params: Promise.resolve({ slug }) })

    expect(String(meta.title), 'title carries the case title').toContain(title)
    expect(meta.description, 'description is the authored meta.description').toBe(description)
    expect(String(meta.alternates?.canonical), 'canonical points at this case').toBe(
      `/case-studies/${slug}`,
    )
    const og = meta.openGraph as { type?: string; url?: string } | undefined
    expect(og?.type, "og:type is 'article' for a case study").toBe('article')
    expect(String(og?.url), 'og:url points at this case').toBe(`/case-studies/${slug}`)
  })

  it('marks an unknown/draft slug noindex (it 404s, so it must never be indexed)', async () => {
    const meta = await caseDetailMetadata({
      params: Promise.resolve({ slug: `no-such-case-${stamp}` }),
    })
    const robots = meta.robots as { index?: boolean } | undefined
    expect(robots?.index, 'a missing case must be noindex').toBe(false)
  })
})

describe('Case study detail — JSON-LD injection safety (review finding 1)', () => {
  it('escapes a hostile </script> title so it cannot break out of the ld+json block', async () => {
    const evil = `Pwned </script><script>alert(1)</script> ${stamp}`
    const slug = `evil-title-${stamp}`
    await payload.create({
      collection: 'case-studies',
      data: { title: evil, slug, serviceCategory: 'general', _status: 'published' },
      context: { disableRevalidate: true },
    })

    const html = await renderDetail(slug)

    // The raw hostile markup must never appear verbatim — if it did it would execute.
    expect(html, 'the raw </script><script> payload must not appear').not.toContain(
      '</script><script>alert(1)</script>',
    )

    // Non-greedy capture stops at the FIRST </script>. With escaping, the title's
    // `<` are `<`, so the first literal </script> is the block's own closing tag
    // → the JSON is complete and parses; without escaping it would truncate and throw.
    const block = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
    expect(block, 'an ld+json block is present').toBeTruthy()
    expect(block![1], 'the block escapes `<` to its unicode form').toContain('\\u003c')
    const parsed = JSON.parse(block![1])
    expect(parsed.headline, 'headline decodes back to the intact title').toBe(evil)
  })
})

describe('Case study rich text — link scheme sanitization (review finding 3)', () => {
  // Renders RichTextBody directly (no DB round-trip) — the render is the defense, and
  // this isolates it. renderToStaticMarkup accepts the element the component returns.
  const renderBody = (data: ReturnType<typeof lexicalWithLink>): string =>
    renderToStaticMarkup(RichTextBody({ data }))

  it('neutralizes a javascript: link — keeps the text, drops the anchor', () => {
    const html = renderBody(
      lexicalWithLink('See ', 'this link', 'javascript:alert(document.cookie)'),
    )
    expect(html, 'anchor text is preserved').toContain('this link')
    expect(html, 'no javascript: href is emitted').not.toContain('javascript:')
    expect(html, 'no anchor element at all for an unsafe scheme').not.toMatch(/<a\b/)
  })

  it('neutralizes a data: link too', () => {
    const html = renderBody(lexicalWithLink('x ', 'y', 'data:text/html,<script>alert(1)</script>'))
    expect(html, 'no anchor for a data: URL').not.toMatch(/<a\b/)
    expect(html).toContain('y')
  })

  it('renders an https link as a normal anchor', () => {
    const html = renderBody(lexicalWithLink('See ', 'the report', 'https://example.com/report'))
    expect(html, 'a safe scheme is anchored').toContain('href="https://example.com/report"')
    expect(html).toContain('the report')
  })

  it('renders a relative link as an anchor (no scheme is safe)', () => {
    const html = renderBody(lexicalWithLink('See ', 'about', '/about'))
    expect(html).toContain('href="/about"')
  })
})

describe('Case study rich text — list markers (#67, ports the blog #66 fix)', () => {
  // Renders RichTextBody directly. Tailwind preflight resets `list-style: none` and
  // drops list padding, so the converter must re-declare the markers + indent — the
  // same gap the blog reader closed in #66, deliberately left for case-studies until
  // this sweep.
  const renderList = (data: ReturnType<typeof lexicalWithList>): string =>
    renderToStaticMarkup(RichTextBody({ data }))

  it('restores list-style + indent so bullets render (Tailwind preflight strips them)', () => {
    const html = renderList(lexicalWithList([`first ${stamp}`, `second ${stamp}`]))
    expect(html, 'a <ul> is emitted').toMatch(/<ul\b/)
    expect(html, 'items are <li>').toMatch(/<li\b/)
    expect(html, 'markers restored via list-style-type').toContain('list-style-type:disc')
    expect(html, 'indent restored').toContain('padding-left:24px')
    expect(html).toContain(`first ${stamp}`)
    expect(html).toContain(`second ${stamp}`)
  })
})

describe('Case study revalidation hooks — never-throw (review finding 2)', () => {
  it('a publish with hooks enabled (no disableRevalidate) commits without throwing', async () => {
    const slug = `hooked-publish-${stamp}`
    // No `context.disableRevalidate`: the afterChange hook runs its revalidatePath
    // path outside a Next request scope (this node env), where revalidatePath throws.
    // The hook's try/catch must swallow it so the already-committed write still
    // resolves — a throw here would 500 an otherwise-successful mutation.
    const created = await payload.create({
      collection: 'case-studies',
      data: { title: `Hooked ${stamp}`, slug, serviceCategory: 'general', _status: 'published' },
    })
    expect(created?.slug, 'the mutation resolved despite the hook running').toBe(slug)

    const found = await payload.find({
      collection: 'case-studies',
      where: { slug: { equals: slug } },
      overrideAccess: true,
    })
    expect(found.totalDocs, 'the row actually committed').toBe(1)
  })
})
