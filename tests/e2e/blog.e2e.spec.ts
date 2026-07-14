import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'
import type { BlogPost } from '../../src/payload-types.js'
import {
  fetchHtml,
  getTitle,
  getMetaContent,
  getMetaProperty,
  getCanonicals,
  collectJsonLdNodes,
  typeMatches,
} from '../helpers/rawHtml'
import { E2E_BASE_URL } from '../helpers/serverURL'

/**
 * Blog index (`/blog`) + article reader (`/blog/[slug]`) — issue #17, mounting the
 * NewsletterSignup island (#16). Modelled on tests/e2e/contact.e2e.spec.ts.
 *
 * Both pages are server-rendered, so SSR / SEO / JSON-LD / filter assertions read the
 * *raw* server HTML over HTTP (no browser, no JS) via tests/helpers/rawHtml.ts — a
 * string that only appears after hydration fails, which is the PRD §10.1 crawlability
 * requirement (invariant a). The category chips are links, and filtering is a
 * server-side query keyed off `?category=` — both proven from raw HTML.
 *
 * Fixtures are seeded through the Payload local API (in THIS process, not the
 * webServer's) with per-run stamped slugs/titles so parallel spec files don't collide
 * (retro #02 lesson). A published set spans two categories plus a DRAFT that must never
 * surface. The newsletter mount is invariant (d) — lead capture is sacred — so its
 * delivery is PROVEN: a browser submits through the real `/subscribe` endpoint and a
 * separate ADMIN-authed REST context reads the persisted subscriber back.
 */

const stamp = Date.now()

// --- stamped fixtures -------------------------------------------------------

const AUTHOR_NAME = `E2E Blog Author ${stamp}`
const AUTHOR_TITLE = 'Founder & Test Byline'
const AUTHOR_BIO = `Bio line for the E2E author ${stamp} — former school CFO, writes about AI in K-12.`

// Two AI-Training posts (A newest → featured within that category, B older → grid /
// related), one General post (C), and one Consulting post (E, the category added in
// #20). D is a DRAFT and must stay invisible. No Budget-Software post is seeded, so
// `?category=budget-software` exercises the empty state deterministically (no cross-file
// spec seeds budget-software blog posts; the QE fresh-clone gate makes this exact).
const POST_A_TITLE = `E2E AI Featured Post A ${stamp}`
const POST_B_TITLE = `E2E AI Archive Post B ${stamp}`
const POST_C_TITLE = `E2E General Post C ${stamp}`
const POST_D_TITLE = `E2E Draft Post D ${stamp}`
const POST_E_TITLE = `E2E Consulting Post E ${stamp}`

const A_INTRO = `Intro body paragraph for post A ${stamp}.`
const A_H2 = `Primary section heading ${stamp}`
const A_H3 = `Nested subsection heading ${stamp}`
const A_EXCERPT = `Excerpt dek for post A ${stamp}.`

// Minimal Lexical body with an h2 then an h3 (never h1) so the rendered article keeps
// exactly one H1 (the title) and no skipped heading levels.
function buildBody(intro: string, h2: string, h3: string): BlogPost['body'] {
  const textNode = (text: string) => ({
    type: 'text',
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text,
    version: 1,
  })
  const paragraph = (text: string) => ({
    type: 'paragraph',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [textNode(text)],
  })
  const heading = (tag: 'h2' | 'h3', text: string) => ({
    type: 'heading',
    tag,
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [textNode(text)],
  })
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        paragraph(intro),
        heading('h2', h2),
        paragraph(`Body under the primary section ${stamp}. ${'word '.repeat(60)}`),
        heading('h3', h3),
        paragraph(`Body under the nested subsection ${stamp}. ${'word '.repeat(60)}`),
      ],
    },
  } as unknown as BlogPost['body']
}

const BLOG_ADMIN = {
  email: `blog-e2e-admin-${stamp}@flowlyst.test`,
  password: 'blog-e2e-password-123',
  name: 'Blog E2E Admin',
  role: 'admin' as const,
}

// Only slugA (the article under test) and slugD (the draft that must 404) are
// navigated to; B and C are asserted by title in rendered HTML, so their slugs aren't
// captured.
let slugA = ''
let slugD = ''
const createdPostIds: (number | string)[] = []
let authorId: number | string = ''

async function seed(): Promise<void> {
  const payload: Payload = await getPayload({ config })

  await payload.delete({ collection: 'users', where: { email: { equals: BLOG_ADMIN.email } } })
  await payload.create({ collection: 'users', data: BLOG_ADMIN })

  const author = await payload.create({
    collection: 'authors',
    data: {
      name: AUTHOR_NAME,
      slug: `e2e-blog-author-${stamp}`,
      title: AUTHOR_TITLE,
      bio: AUTHOR_BIO,
    },
  })
  authorId = author.id

  const now = Date.now()
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString()

  const a = await payload.create({
    collection: 'blog-posts',
    data: {
      title: POST_A_TITLE,
      slug: `e2e-ai-featured-a-${stamp}`,
      excerpt: A_EXCERPT,
      body: buildBody(A_INTRO, A_H2, A_H3),
      serviceCategory: 'ai-training',
      author: author.id,
      _status: 'published',
      publishedAt: iso(0),
    },
  })
  const b = await payload.create({
    collection: 'blog-posts',
    data: {
      title: POST_B_TITLE,
      slug: `e2e-ai-archive-b-${stamp}`,
      excerpt: `Excerpt for post B ${stamp}.`,
      body: buildBody(`Intro B ${stamp}.`, `Heading B ${stamp}`, `Sub B ${stamp}`),
      serviceCategory: 'ai-training',
      author: author.id,
      _status: 'published',
      publishedAt: iso(2 * 24 * 60 * 60 * 1000),
    },
  })
  const c = await payload.create({
    collection: 'blog-posts',
    data: {
      title: POST_C_TITLE,
      slug: `e2e-general-c-${stamp}`,
      excerpt: `Excerpt for post C ${stamp}.`,
      body: buildBody(`Intro C ${stamp}.`, `Heading C ${stamp}`, `Sub C ${stamp}`),
      serviceCategory: 'general',
      _status: 'published',
      publishedAt: iso(24 * 60 * 60 * 1000),
    },
  })
  const d = await payload.create({
    collection: 'blog-posts',
    data: {
      title: POST_D_TITLE,
      slug: `e2e-draft-d-${stamp}`,
      excerpt: `Excerpt for draft D ${stamp}.`,
      body: buildBody(`Intro D ${stamp}.`, `Heading D ${stamp}`, `Sub D ${stamp}`),
      serviceCategory: 'ai-training',
      _status: 'draft',
    },
  })
  const e = await payload.create({
    collection: 'blog-posts',
    data: {
      title: POST_E_TITLE,
      slug: `e2e-consulting-e-${stamp}`,
      excerpt: `Excerpt for post E ${stamp}.`,
      body: buildBody(`Intro E ${stamp}.`, `Heading E ${stamp}`, `Sub E ${stamp}`),
      serviceCategory: 'consulting',
      _status: 'published',
      // Older than A so A stays the newest post (the site-wide featured post).
      publishedAt: iso(3 * 24 * 60 * 60 * 1000),
    },
  })

  slugA = a.slug
  slugD = d.slug
  createdPostIds.push(a.id, b.id, c.id, d.id, e.id)
}

async function cleanup(): Promise<void> {
  const payload: Payload = await getPayload({ config })
  for (const id of createdPostIds) {
    await payload.delete({ collection: 'blog-posts', id }).catch(() => {})
  }
  if (authorId) await payload.delete({ collection: 'authors', id: authorId }).catch(() => {})
  await payload.delete({ collection: 'users', where: { email: { equals: BLOG_ADMIN.email } } })
  await payload.delete({
    collection: 'newsletter-subscribers',
    where: { email: { contains: `blog-e2e-sub-${stamp}` } },
  })
}

/** REST context authenticated as the dedicated Admin (JWT header — cf. contact spec). */
async function adminContext(): Promise<APIRequestContext> {
  const loginCtx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  const res = await loginCtx.post('/api/users/login', {
    data: { email: BLOG_ADMIN.email, password: BLOG_ADMIN.password },
  })
  expect(res.ok(), 'admin REST login must succeed').toBeTruthy()
  const { token } = (await res.json()) as { token?: string }
  expect(token, 'login must return a JWT').toBeTruthy()
  await loginCtx.dispose()
  return apiRequest.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: { Authorization: `JWT ${token}` },
  })
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  await seed()
  // Warm the routes so a cold dev-server compile doesn't blow a per-test timeout.
  const ctx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  try {
    await ctx.get('/blog', { timeout: 120_000 })
    await ctx.get(`/blog/${slugA}`, { timeout: 120_000 })
  } finally {
    await ctx.dispose()
  }
})

test.afterAll(async () => {
  await cleanup()
})

// ============================ INDEX — SEO ==================================

test.describe('Blog index — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, blog-branded <title> unique vs the homepage', async ({ request }) => {
    const [blogHtml, homeHtml] = [await fetchHtml(request, '/blog'), await fetchHtml(request, '/')]
    const title = getTitle(blogHtml)
    expect(title, '<title> present').toBeTruthy()
    expect(title!, 'title names the subject').toMatch(/blog/i)
    expect(title!, 'title is flowlyst-branded').toMatch(/flowlyst/i)
    expect(title, 'unique vs homepage').not.toBe(getTitle(homeHtml))
  })

  test('has a non-empty <meta description> unique vs the homepage', async ({ request }) => {
    const [blogHtml, homeHtml] = [await fetchHtml(request, '/blog'), await fetchHtml(request, '/')]
    const desc = getMetaContent(blogHtml, 'description')
    expect(desc, 'description present').toBeTruthy()
    expect(desc!.length, 'usable length').toBeGreaterThanOrEqual(50)
    expect(desc, 'differs from title').not.toBe(getTitle(blogHtml))
    expect(desc, 'unique vs homepage').not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('has exactly one absolute canonical pointing at /blog', async ({ request }) => {
    const html = await fetchHtml(request, '/blog')
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one canonical').toBe(1)
    expect(canonicals[0], 'canonical is absolute').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(canonicals[0]).pathname, 'canonical path is /blog').toBe('/blog')
  })

  test('OpenGraph title/description/url present and correct', async ({ request }) => {
    const html = await fetchHtml(request, '/blog')
    expect(getMetaProperty(html, 'og:title'), 'og:title present').toBeTruthy()
    expect(getMetaProperty(html, 'og:description'), 'og:description present').toBeTruthy()
    expect(getMetaProperty(html, 'og:type'), 'og:type website').toBe('website')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(new URL(ogUrl!).pathname, 'og:url path is /blog').toBe('/blog')
  })
})

// ====================== INDEX — server-rendered content ====================

test.describe('Blog index — server-rendered content (raw HTML, no JS)', () => {
  test('the hero (eyebrow, headline, lead) is in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, '/blog')
    expect(html).toMatch(/flowlyst writing/i)
    expect(html).toMatch(/Notes from the office/i)
    expect(html).toMatch(/runs the district/i)
    expect(html).toMatch(/Practical posts on AI/i)
  })

  test('the category chips are rendered as links with the right hrefs (incl. Consulting)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, '/blog')
    // Chips are server-rendered <a> links (invariant a), one per real category + All.
    expect(html).toContain('href="/blog?category=ai-training"')
    expect(html).toContain('href="/blog?category=budget-software"')
    // Consulting was added to the BlogPosts enum in #20, so its chip is a live filter.
    expect(html).toContain('href="/blog?category=consulting"')
    expect(html).toContain('href="/blog?category=general"')
    // They carry the chip class, and the active chip (All, on the unfiltered view) is
    // the green variant marked aria-current. (Attribute order is React's, not ours.)
    expect(html).toMatch(/class="chip( chip--green)?"/i)
    expect(html).toContain('aria-current="page"')
  })

  test('published posts render and the DRAFT never appears', async ({ request }) => {
    const html = await fetchHtml(request, '/blog')
    expect(html, 'published post A is present').toContain(POST_A_TITLE)
    expect(html, 'published post B is present').toContain(POST_B_TITLE)
    expect(html, 'published post C is present').toContain(POST_C_TITLE)
    expect(html, 'the draft must not leak to the public index').not.toContain(POST_D_TITLE)
  })

  test('the newsletter island SSRs its form (crawlable mount, not client-only)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, '/blog')
    // The mount's copy + the island's form both server-render.
    expect(html).toMatch(/Get our writing/i)
    expect(html).toMatch(/One email a month/i)
    expect(html).toContain('data-testid="newsletter-form"')
    expect(html).toMatch(/Subscribe/i)
  })
})

// ======================== INDEX — server-side filter =======================

test.describe('Blog index — category filter (server-side via searchParams)', () => {
  test('?category=ai-training shows AI posts and excludes the General post', async ({
    request,
  }) => {
    const html = await fetchHtml(request, '/blog?category=ai-training')
    expect(html, 'A (ai-training) present').toContain(POST_A_TITLE)
    expect(html, 'B (ai-training) present').toContain(POST_B_TITLE)
    expect(html, 'C (general) filtered out').not.toContain(POST_C_TITLE)
    // The active chip is the green variant with aria-current.
    expect(html).toMatch(/aria-current="page"/i)
  })

  test('?category=general shows the General post and excludes the AI posts', async ({
    request,
  }) => {
    const html = await fetchHtml(request, '/blog?category=general')
    expect(html, 'C (general) present').toContain(POST_C_TITLE)
    expect(html, 'A (ai-training) filtered out').not.toContain(POST_A_TITLE)
    expect(html, 'B (ai-training) filtered out').not.toContain(POST_B_TITLE)
    expect(html, 'E (consulting) filtered out').not.toContain(POST_E_TITLE)
  })

  test('?category=consulting shows the Consulting post and excludes the others', async ({
    request,
  }) => {
    const html = await fetchHtml(request, '/blog?category=consulting')
    expect(html, 'E (consulting) present').toContain(POST_E_TITLE)
    expect(html, 'A (ai-training) filtered out').not.toContain(POST_A_TITLE)
    expect(html, 'B (ai-training) filtered out').not.toContain(POST_B_TITLE)
    expect(html, 'C (general) filtered out').not.toContain(POST_C_TITLE)
  })

  test('?category=budget-software renders the empty state (no such posts seeded)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, '/blog?category=budget-software')
    expect(html, 'empty-state block present').toContain('data-testid="blog-empty"')
    expect(html).toMatch(/No posts in this category yet/i)
    // Cross-check: none of the seeded titles appear under this filter.
    for (const t of [POST_A_TITLE, POST_B_TITLE, POST_C_TITLE, POST_E_TITLE]) {
      expect(html).not.toContain(t)
    }
  })
})

// =========================== ARTICLE — content ============================

test.describe('Blog article — server-rendered content (raw HTML, no JS)', () => {
  test('the header, byline, reading time, and body render in the server HTML', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `/blog/${slugA}`)
    expect(html, 'title').toContain(POST_A_TITLE)
    expect(html, 'author byline').toContain(AUTHOR_NAME)
    expect(html, 'author role in byline').toContain(AUTHOR_TITLE)
    expect(html, 'reading time label').toMatch(/min read/i)
    expect(html, 'back-to-blog breadcrumb').toContain('href="/blog"')
    // Body: excerpt dek + the Lexical paragraphs and headings all server-render.
    expect(html, 'excerpt dek').toContain(A_EXCERPT)
    expect(html, 'intro paragraph').toContain(A_INTRO)
    expect(html, 'h2 subhead').toContain(A_H2)
    expect(html, 'h3 subhead').toContain(A_H3)
  })

  test('the author bio block renders the author bio', async ({ request }) => {
    const html = await fetchHtml(request, `/blog/${slugA}`)
    expect(html).toContain('data-testid="post-author-bio"')
    expect(html).toContain(AUTHOR_BIO)
  })

  test('"keep reading" surfaces the sibling in-category post (B), not the General one', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `/blog/${slugA}`)
    expect(html).toContain('data-testid="post-related"')
    expect(html, 'related shows sibling ai-training post B').toContain(POST_B_TITLE)
    expect(html, 'related excludes the general post C').not.toContain(POST_C_TITLE)
  })

  test('a DRAFT slug 404s (never publicly readable)', async ({ request }) => {
    const res = await request.get(`/blog/${slugD}`)
    expect(res.status(), 'draft article must 404 for the public').toBe(404)
  })

  test('an unknown slug 404s', async ({ request }) => {
    const res = await request.get(`/blog/does-not-exist-${stamp}`)
    expect(res.status()).toBe(404)
  })
})

// ========================== ARTICLE — SEO + JSON-LD =======================

test.describe('Blog article — SEO metadata + Article JSON-LD', () => {
  test('unique title + description + absolute canonical for the post', async ({ request }) => {
    const [postHtml, indexHtml] = [
      await fetchHtml(request, `/blog/${slugA}`),
      await fetchHtml(request, '/blog'),
    ]
    const title = getTitle(postHtml)
    expect(title, 'title present').toBeTruthy()
    expect(title!, 'title carries the post title').toContain(POST_A_TITLE)
    expect(title, 'title differs from the index').not.toBe(getTitle(indexHtml))
    const desc = getMetaContent(postHtml, 'description')
    expect(desc, 'description present').toBeTruthy()
    const canonicals = getCanonicals(postHtml)
    expect(canonicals.length, 'exactly one canonical').toBe(1)
    expect(canonicals[0], 'canonical absolute').toMatch(/^https?:\/\/[^/]+/i)
    expect(new URL(canonicals[0]).pathname, 'canonical path').toBe(`/blog/${slugA}`)
  })

  test('og:type is "article" for a post', async ({ request }) => {
    const html = await fetchHtml(request, `/blog/${slugA}`)
    expect(getMetaProperty(html, 'og:type'), 'og:type must be article').toBe('article')
  })

  test('embeds a valid Article node alongside the site-wide Organization', async ({ request }) => {
    const html = await fetchHtml(request, `/blog/${slugA}`)
    const nodes = collectJsonLdNodes(html) // throws on malformed JSON → parse validity asserted
    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    const article = nodes.find(({ node }) => typeMatches(node, 'Article'))
    expect(org, 'site-wide Organization present').toBeTruthy()
    expect(article, 'Article node present').toBeTruthy()

    const node = article!.node
    expect(node.headline, 'headline is the post title').toBe(POST_A_TITLE)
    // datePublished present and ISO-parseable.
    expect(typeof node.datePublished, 'datePublished is a string').toBe('string')
    expect(Number.isNaN(Date.parse(node.datePublished as string)), 'datePublished parses').toBe(
      false,
    )
    // author is a Person with the seeded name.
    const author = node.author as Record<string, unknown> | undefined
    expect(author, 'author present').toBeTruthy()
    expect(typeMatches(author as never, 'Person'), 'author is a Person').toBe(true)
    expect(author!.name, 'author name').toBe(AUTHOR_NAME)
    expect(String(node.mainEntityOfPage), 'mainEntityOfPage points at the post').toContain(
      `/blog/${slugA}`,
    )
  })
})

// =================== NEWSLETTER MOUNT — delivery (invariant d) =============

test.describe('Newsletter mount on /blog — delivery path (invariant d)', () => {
  test('a browser submit through /subscribe shows outcome-neutral success and persists', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const email = `blog-e2e-sub-${stamp}@district.k12.us`

    await page.goto('/blog')
    const form = page.getByTestId('newsletter-form')
    await expect(form, 'the newsletter island hydrates on /blog').toBeVisible()

    // A real submission leaves the honeypot empty.
    await expect(page.locator('input[name="botField"]'), 'honeypot stays empty').toHaveValue('')

    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: /subscribe/i }).click()

    // Success renders only after the POST to /subscribe resolved ok — the copy is
    // deliberately outcome-neutral (never reveals new vs. already-subscribed).
    const success = page.getByTestId('newsletter-success')
    await expect(success).toBeVisible()
    await expect(success, 'outcome-neutral success copy').toContainText(/on the list/i)

    // Prove the mount actually delivered: an Admin reads the persisted subscriber back,
    // tagged with the blog source the mount supplied.
    const ctx = await adminContext()
    try {
      const read = await ctx.get(
        `/api/newsletter-subscribers?where[email][equals]=${encodeURIComponent(email)}&depth=0`,
      )
      expect(read.status(), 'admin read returns 200').toBe(200)
      const body = (await read.json()) as {
        totalDocs: number
        docs: Array<Record<string, unknown>>
      }
      expect(body.totalDocs, 'exactly one persisted subscriber').toBe(1)
      expect(body.docs[0].email, 'email persisted (lowercased by the endpoint)').toBe(email)
      expect(body.docs[0].source, 'source tagged from the mount').toBe('blog')
      expect(body.docs[0].status, 'defaulted to subscribed').toBe('subscribed')
    } finally {
      await ctx.dispose()
    }
  })
})

// ============================ ACCESSIBILITY SMOKE =========================

test.describe('Blog — accessibility smoke', () => {
  test('the index has exactly one H1 and no skipped heading levels', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.locator('main h1')).toHaveCount(1)
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'))
        .map((h) => Number(h.tagName[1]))
        .filter((n) => !Number.isNaN(n)),
    )
    expect(levels[0], 'first heading is the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], 'no skipped heading level').toBeLessThanOrEqual(1)
    }
  })

  test('an article has exactly one H1 and no skipped heading levels', async ({ page }) => {
    await page.goto(`/blog/${slugA}`)
    await expect(page.locator('main h1')).toHaveCount(1)
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6'))
        .map((h) => Number(h.tagName[1]))
        .filter((n) => !Number.isNaN(n)),
    )
    expect(levels[0], 'first heading is the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], 'no skipped heading level').toBeLessThanOrEqual(1)
    }
  })

  test('every <img> on an article carries an alt attribute', async ({ page }) => {
    await page.goto(`/blog/${slugA}`)
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      expect(await imgs.nth(i).getAttribute('alt'), `img[${i}] has alt`).not.toBeNull()
    }
  })

  test('no horizontal overflow at 390px on the index or an article', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/blog')
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'index must not scroll horizontally at 390px').toBeLessThanOrEqual(390)
    await page.goto(`/blog/${slugA}`)
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'article must not scroll horizontally at 390px').toBeLessThanOrEqual(390)
  })
})
