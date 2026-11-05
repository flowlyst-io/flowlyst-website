import { test, expect, request as apiRequest, type Page } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'
import config from '../../src/payload.config.js'
import { E2E_BASE_URL } from '../helpers/serverURL'
import { deriveFixtureEmail } from '../helpers/seedUser'

/**
 * #152: the photo list is closed to the public (REST and GraphQL) while every image
 * the site shows still loads for anonymous visitors.
 */

test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
const ALT = `E2E media privacy ${stamp}`
const ADMIN = {
  email: deriveFixtureEmail({ prefix: 'media-privacy-e2e-admin' }),
  password: 'media-privacy-e2e-password-123',
  name: 'Media Privacy E2E Admin',
  role: 'admin' as const,
}
const POST_SLUG = `e2e-media-privacy-post-${stamp}`

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

let mediaId: number
let filename = ''
let cardSizeFilename = ''
let authorId: number
let postId: number
let cardId: number
let cardSlug = ''
let testimonialId: number

test.beforeAll(async () => {
  test.setTimeout(180_000)
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
  await payload.create({ collection: 'users', data: ADMIN })

  const buf = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: { r: 18, g: 120, b: 92 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt: ALT },
    file: {
      data: buf,
      mimetype: 'image/jpeg',
      name: `media-privacy-${stamp}.jpg`,
      size: buf.length,
    },
  })
  mediaId = media.id
  filename = media.filename as string
  cardSizeFilename = media.sizes?.card?.filename as string

  const author = await payload.create({
    collection: 'authors',
    data: { name: `Media Privacy Author ${stamp}`, slug: `mp-author-${stamp}`, photo: media.id },
  })
  authorId = author.id
  const post = await payload.create({
    collection: 'blog-posts',
    data: {
      title: `E2E media privacy post ${stamp}`,
      slug: POST_SLUG,
      excerpt: `Excerpt for the media privacy post ${stamp}.`,
      body: richText(`Body paragraph for the media privacy post ${stamp}.`),
      serviceCategory: 'ai-training',
      featuredImage: media.id,
      author: author.id,
      _status: 'published',
      publishedAt: new Date().toISOString(),
    },
  })
  postId = post.id
  const card = await payload.create({
    collection: 'cards',
    data: { name: `Media Privacy Card ${stamp}`, headshot: media.id },
  })
  cardId = card.id
  cardSlug = card.slug as string
  const testimonial = await payload.create({
    collection: 'testimonials',
    data: {
      quote: `Media privacy quote ${stamp}`,
      clientName: `Media Privacy Client ${stamp}`,
      photo: media.id,
      status: 'published',
    },
  })
  testimonialId = testimonial.id

  const ctx = await apiRequest.newContext({ baseURL: E2E_BASE_URL })
  try {
    for (const path of [`/blog/${POST_SLUG}`, `/card/${cardSlug}`, '/testimonials', '/']) {
      await ctx.get(path, { timeout: 120_000 })
    }
  } finally {
    await ctx.dispose()
  }
})

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'testimonials', id: testimonialId }).catch(() => {})
  await payload.delete({ collection: 'cards', id: cardId }).catch(() => {})
  await payload.delete({ collection: 'blog-posts', id: postId }).catch(() => {})
  await payload.delete({ collection: 'authors', id: authorId }).catch(() => {})
  await payload.delete({ collection: 'media', id: mediaId }).catch(() => {})
  await payload.delete({ collection: 'users', where: { email: { equals: ADMIN.email } } })
})

const anonymous = () => apiRequest.newContext({ baseURL: E2E_BASE_URL })

test.describe('the photo list is closed to the public', () => {
  test('REST list, search and fetch-by-id are 403 and leak nothing', async () => {
    const ctx = await anonymous()
    try {
      const list = await ctx.get('/api/media')
      expect(list.status()).toBe(403)
      const body = await list.text()
      expect(body).not.toContain(filename)
      expect(body).not.toContain(ALT)

      expect((await ctx.get('/api/media?where[alt][like]=privacy')).status()).toBe(403)
      expect((await ctx.get(`/api/media/${mediaId}`)).status()).toBe(403)
      expect((await ctx.get('/api/media/count')).status()).toBe(403)
    } finally {
      await ctx.dispose()
    }
  })

  test('GraphQL list and fetch-by-id are refused and leak nothing', async () => {
    const ctx = await anonymous()
    try {
      const queries: [string, string][] = [
        ['allMedia', '{ allMedia { docs { id filename alt } } }'],
        ['Media', `{ Media(id: ${mediaId}) { filename } }`],
      ]
      for (const [field, query] of queries) {
        const res = await ctx.post('/api/graphql', { data: { query } })
        const text = await res.text()
        const json = JSON.parse(text)
        expect(json.data?.[field] ?? null, `${field} returns no data`).toBeNull()
        expect(json.errors[0].message).toMatch(/not allowed/i)
        expect(text).not.toContain(filename)
      }
    } finally {
      await ctx.dispose()
    }
  })

  test('a logged-in admin can still list media', async () => {
    const login = await anonymous()
    const res = await login.post('/api/users/login', {
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(res.ok(), 'admin REST login must succeed').toBeTruthy()
    const { token } = (await res.json()) as { token?: string }
    await login.dispose()
    // The JWT header is more reliable than the cookie jar over plain http on a production build.
    const ctx = await apiRequest.newContext({
      baseURL: E2E_BASE_URL,
      extraHTTPHeaders: { Authorization: `JWT ${token}` },
    })
    try {
      const list = await ctx.get(`/api/media?where[id][equals]=${mediaId}`)
      expect(list.status()).toBe(200)
      expect((await list.json()).docs[0].filename).toBe(filename)
    } finally {
      await ctx.dispose()
    }
  })
})

test.describe('images the site shows still load for visitors', () => {
  test('the original and a generated size are served as JPEG', async () => {
    const ctx = await anonymous()
    try {
      for (const name of [filename, cardSizeFilename]) {
        expect(name).toBeTruthy()
        const res = await ctx.get(`/api/media/file/${name}`)
        expect(res.status()).toBe(200)
        expect(res.headers()['content-type']).toContain('image/jpeg')
      }
    } finally {
      await ctx.dispose()
    }
  })

  test('blog post: featured image, author avatar and og:image', async ({ page, request }) => {
    const path = `/blog/${POST_SLUG}`
    const resp = await page.goto(path, { waitUntil: 'networkidle' })
    expect(resp?.status()).toBe(200)

    const featured = page.locator('[data-testid="post-header"] img[src*="/_next/image"]').first()
    await featured.waitFor({ state: 'attached', timeout: 30_000 })
    const src = await featured.getAttribute('src')
    const optimized = await page.request.get(new URL(src!, E2E_BASE_URL).href)
    expect(optimized.status()).toBe(200)
    expect(optimized.headers()['content-type'] ?? '').toMatch(/^image\//)
    expect(await featured.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(
      0,
    )

    const avatar = page.locator(`img[alt="${ALT}"][width="48"]`).first()
    await avatar.scrollIntoViewIfNeeded()
    await expect
      .poll(() => avatar.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)

    const og = await page.locator('meta[property="og:image"]').first().getAttribute('content')
    expect(og).toBeTruthy()
    const ogRes = await request.get(new URL(og!).pathname)
    expect(ogRes.status()).toBe(200)
    expect(ogRes.headers()['content-type'] ?? '').toMatch(/^image\//)
  })

  test('card page: the headshot paints', async ({ page }: { page: Page }) => {
    const resp = await page.goto(`/card/${cardSlug}`, { waitUntil: 'networkidle' })
    expect(resp?.status()).toBe(200)
    const img = page.locator('.card__headshot-crop-img, .card__headshot').first()
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  })

  test('testimonials page: the client photo paints', async ({ page }) => {
    const resp = await page.goto('/testimonials', { waitUntil: 'networkidle' })
    expect(resp?.status()).toBe(200)
    const img = page.locator(`img[alt="${ALT}"]`).first()
    await img.scrollIntoViewIfNeeded()
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  })
})

test('the stack is not advertised in x-powered-by', async () => {
  const ctx = await anonymous()
  try {
    for (const path of ['/', `/api/media/file/${filename}`]) {
      const res = await ctx.get(path)
      expect(res.status()).toBe(200)
      expect(res.headers()['x-powered-by'], path).toBeUndefined()
    }
  } finally {
    await ctx.dispose()
  }
})
