import { test, expect, request as apiRequest } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '../../src/payload.config.js'
import { E2E_BASE_URL } from '../helpers/serverURL'

/**
 * Regression guard for #69 (PR #72 fix pass). The blog featured image, blog index
 * featured card, and case-study hero render through `next/image`. Payload serves
 * filesystem-backed media (any env without BLOB_READ_WRITE_TOKEN — including THIS
 * e2e env) from an ABSOLUTE same-origin URL; without normalization, next/image
 * rejects it against remotePatterns and the optimizer returns 400 ("url parameter
 * is not allowed"), leaving an empty box. `mediaSrc` strips it to a relative
 * `/api/media/file/…` path matched by localPatterns.
 *
 * This spec seeds a blog post AND a case study WITH a real uploaded image, then
 * asserts each page's featured/hero `/_next/image?url=…` request returns 200 and the
 * image actually paints (naturalWidth > 0). It FAILS on the pre-fix build (optimizer
 * 400s the absolute URL) and PASSES once same-origin URLs are normalized to relative.
 */

const stamp = Date.now()

const ADMIN = {
  email: `media-e2e-admin-${stamp}@flowlyst.test`,
  password: 'media-e2e-password-123',
  name: 'Media E2E Admin',
  role: 'admin' as const,
}
const POST_SLUG = `e2e-media-post-${stamp}`
const CASE_SLUG = `e2e-media-case-${stamp}`

const richText = (text: string) =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [
            { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
          ],
        },
      ],
    },
  }) as unknown as never

let mediaId: number | string = ''
let postId: number | string = ''
let caseId: number | string = ''

async function seed(): Promise<void> {
  const payload: Payload = await getPayload({ config })

  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.create({ collection: 'users', data: ADMIN })

  // A real 16:9 JPEG so the media has genuine dimensions and passes upload validation.
  const buf = await sharp({
    create: { width: 800, height: 450, channels: 3, background: { r: 18, g: 120, b: 92 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt: `E2E media next/image ${stamp}` },
    file: { data: buf, mimetype: 'image/jpeg', name: `e2e-media-${stamp}.jpg`, size: buf.length },
  })
  mediaId = media.id

  const post = await payload.create({
    collection: 'blog-posts',
    data: {
      title: `E2E media post ${stamp}`,
      slug: POST_SLUG,
      excerpt: `Excerpt for the media post ${stamp}.`,
      body: richText(`Body paragraph for the media post ${stamp}.`),
      serviceCategory: 'ai-training',
      featuredImage: media.id,
      _status: 'published',
      publishedAt: new Date().toISOString(),
    },
  })
  postId = post.id

  const caseStudy = await payload.create({
    collection: 'case-studies',
    context: { disableRevalidate: true },
    data: {
      title: `E2E media case ${stamp}`,
      slug: CASE_SLUG,
      heroImage: media.id,
      serviceCategory: 'budget-software',
      excerpt: `Excerpt for the media case ${stamp}.`,
      intro: richText(`Intro for the media case ${stamp}.`),
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
  })
  caseId = caseStudy.id
}

async function cleanup(): Promise<void> {
  const payload: Payload = await getPayload({ config })
  if (postId) await payload.delete({ collection: 'blog-posts', id: postId }).catch(() => {})
  if (caseId)
    await payload
      .delete({ collection: 'case-studies', id: caseId, context: { disableRevalidate: true } })
      .catch(() => {})
  if (mediaId) await payload.delete({ collection: 'media', id: mediaId }).catch(() => {})
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  await seed()
  const ctx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  try {
    await ctx.get(`/blog/${POST_SLUG}`, { timeout: 120_000 })
    await ctx.get(`/case-studies/${CASE_SLUG}`, { timeout: 120_000 })
  } finally {
    await ctx.dispose()
  }
})

test.afterAll(async () => {
  await cleanup()
})

// A next/image element on `path` inside `containerSel`: its `/_next/image?url=…`
// request must return 200 with an image content-type, and the image must actually
// paint (naturalWidth > 0). On the pre-fix build the absolute media URL 400s here.
async function assertOptimizedImageLoads(
  page: import('@playwright/test').Page,
  path: string,
  containerSel: string,
) {
  const resp = await page.goto(path, { waitUntil: 'networkidle' })
  expect(resp?.status(), `${path} renders`).toBe(200)

  const img = page.locator(`${containerSel} img[src*="/_next/image"]`).first()
  await img.waitFor({ state: 'attached', timeout: 30_000 })

  const src = await img.getAttribute('src')
  expect(src, 'featured/hero image uses the next/image optimizer').toBeTruthy()

  const optimized = await page.request.get(new URL(src!, E2E_BASE_URL).href)
  expect(optimized.status(), `optimizer must serve ${src} (not 400)`).toBe(200)
  expect(optimized.headers()['content-type'] ?? '', 'optimizer returns an image').toMatch(
    /^image\//,
  )

  const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)
  expect(naturalWidth, 'the optimized image actually painted').toBeGreaterThan(0)
}

test.describe('next/image renders filesystem-backed media (#69 regression)', () => {
  test('blog article featured image is optimized and loads (not a 400)', async ({ page }) => {
    await assertOptimizedImageLoads(page, `/blog/${POST_SLUG}`, '[data-testid="post-header"]')
  })

  test('case-study hero image is optimized and loads (not a 400)', async ({ page }) => {
    await assertOptimizedImageLoads(
      page,
      `/case-studies/${CASE_SLUG}`,
      '[data-testid="case-study-header"]',
    )
  })
})
