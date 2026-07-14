// @vitest-environment node
// sitemap.ts unit-of-work (PRD §10.1 / §11; review invariant a).
//
// The served /sitemap.xml is covered for its STATIC surface (200, XML, static routes,
// absolute URLs) by tests/e2e/seo.e2e.spec.ts. The DYNAMIC contract — published posts
// and case studies appear, drafts NEVER do, entries are absolute + carry lastModified
// — is proven HERE by importing and calling the `sitemap()` function directly against
// a DB we seed (in-process, so there is no separate web-server cache to fight; the
// e2e's cross-process seed trap does not apply).
//
// Seeds pass `context: { disableRevalidate: true }` so the content collections'
// revalidation hooks don't fire outside a Next request scope (they'd throw in node).
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import sitemap from '@/app/sitemap'
import { getServerURL } from '@/utilities/serverURL'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const stamp = Date.now()
const base = getServerURL()

const PUB_POST_SLUG = `sitemap-pub-post-${stamp}`
const DRAFT_POST_SLUG = `sitemap-draft-post-${stamp}`
const PUB_CASE_SLUG = `sitemap-pub-case-${stamp}`
const DRAFT_CASE_SLUG = `sitemap-draft-case-${stamp}`

const createdPostIds: (number | string)[] = []
const createdCaseIds: (number | string)[] = []

// Minimal valid Lexical state — blog-posts require a `body`.
function lexicalBody(text: string) {
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

// The set of `url` strings the sitemap emits.
async function sitemapUrls(): Promise<string[]> {
  const entries = await sitemap()
  return entries.map((e) => e.url)
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  const pubPost = await payload.create({
    collection: 'blog-posts',
    data: {
      title: `Sitemap Published Post ${stamp}`,
      slug: PUB_POST_SLUG,
      body: lexicalBody(`Body for the sitemap published post ${stamp}.`),
      serviceCategory: 'general',
      _status: 'published',
      publishedAt: new Date().toISOString(),
    },
    context: { disableRevalidate: true },
  })
  const draftPost = await payload.create({
    collection: 'blog-posts',
    data: {
      title: `Sitemap Draft Post ${stamp}`,
      slug: DRAFT_POST_SLUG,
      body: lexicalBody(`Body for the sitemap draft post ${stamp}.`),
      serviceCategory: 'general',
      _status: 'draft',
    },
    context: { disableRevalidate: true },
  })
  createdPostIds.push(pubPost.id, draftPost.id)

  const pubCase = await payload.create({
    collection: 'case-studies',
    data: {
      title: `Sitemap Published Case ${stamp}`,
      slug: PUB_CASE_SLUG,
      serviceCategory: 'consulting',
      _status: 'published',
      publishedAt: new Date().toISOString(),
    },
    context: { disableRevalidate: true },
  })
  const draftCase = await payload.create({
    collection: 'case-studies',
    data: {
      title: `Sitemap Draft Case ${stamp}`,
      slug: DRAFT_CASE_SLUG,
      serviceCategory: 'consulting',
      _status: 'draft',
    },
    context: { disableRevalidate: true },
  })
  createdCaseIds.push(pubCase.id, draftCase.id)
})

afterAll(async () => {
  for (const id of createdPostIds) {
    await payload
      .delete({ collection: 'blog-posts', id, context: { disableRevalidate: true } })
      .catch(() => {})
  }
  for (const id of createdCaseIds) {
    await payload
      .delete({ collection: 'case-studies', id, context: { disableRevalidate: true } })
      .catch(() => {})
  }
})

describe('sitemap() — static routes', () => {
  it('includes every public static route as an absolute URL', async () => {
    const urls = await sitemapUrls()
    const expectedPaths = [
      '/',
      '/about',
      '/solutions/budget-software',
      '/solutions/ai-training',
      '/solutions/consulting',
      '/solutions/keynotes',
      '/request-demo',
      '/contact',
      '/blog',
      '/testimonials',
      '/case-studies',
    ]
    for (const path of expectedPaths) {
      expect(urls, `sitemap lists ${path}`).toContain(`${base}${path}`)
    }
  })

  it('every entry is an absolute URL and carries a lastModified date', async () => {
    const entries = await sitemap()
    expect(entries.length, 'sitemap is non-empty').toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.url, `${entry.url} is absolute`).toMatch(/^https?:\/\//)
      expect(entry.lastModified, `${entry.url} has lastModified`).toBeTruthy()
    }
  })
})

describe('sitemap() — dynamic content (published in, drafts out)', () => {
  it('includes the published blog post and case study', async () => {
    const urls = await sitemapUrls()
    expect(urls, 'published post is listed').toContain(`${base}/blog/${PUB_POST_SLUG}`)
    expect(urls, 'published case study is listed').toContain(
      `${base}/case-studies/${PUB_CASE_SLUG}`,
    )
  })

  it('excludes the DRAFT blog post and case study', async () => {
    // Positive control (teeth): both drafts are real, findable rows without the access
    // guard — so "absent from the sitemap" is a real guard, not a vacuous pass.
    const leakablePost = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: DRAFT_POST_SLUG } },
      overrideAccess: true,
    })
    const leakableCase = await payload.find({
      collection: 'case-studies',
      where: { slug: { equals: DRAFT_CASE_SLUG } },
      overrideAccess: true,
    })
    expect(leakablePost.totalDocs, 'draft post exists in the DB').toBe(1)
    expect(leakableCase.totalDocs, 'draft case exists in the DB').toBe(1)

    const urls = await sitemapUrls()
    expect(urls, 'draft post must NOT be in the sitemap').not.toContain(
      `${base}/blog/${DRAFT_POST_SLUG}`,
    )
    expect(urls, 'draft case must NOT be in the sitemap').not.toContain(
      `${base}/case-studies/${DRAFT_CASE_SLUG}`,
    )
  })

  it('the published dynamic entry uses the doc updatedAt as lastModified', async () => {
    const entries = await sitemap()
    const entry = entries.find((e) => e.url === `${base}/blog/${PUB_POST_SLUG}`)
    expect(entry, 'published post entry present').toBeTruthy()
    expect(
      Number.isNaN(new Date(entry!.lastModified as string | Date).getTime()),
      'lastModified parses as a date',
    ).toBe(false)
  })
})
