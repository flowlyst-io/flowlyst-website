// @vitest-environment node
// Security + robustness teeth for the blog reader (issue #17 / PR #66 fix pass),
// mirroring tests/int/case-studies-cms.int.spec.ts. Runs in Node: the article page is
// an async server component that awaits the Payload Local API, and ArticleBody renders
// authored Lexical body copy — we render the *real* components against a DB we control
// so the defenses (JSON-LD escaping, link-scheme sanitization, list markup) are proven
// where they live, not reimplemented.
//
// Seeds pass `context: { disableRevalidate: true }` so the BlogPosts afterChange/
// afterDelete revalidation hooks don't fire `revalidatePath` outside a request scope
// (that throws in node). The dedicated "never-throw" test deliberately omits it to
// prove the hook's try/catch swallows that throw.
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import config from '@/payload.config'
import BlogPostReaderPage from '@/app/(frontend)/blog/[slug]/page'
import { ArticleBody } from '@/components/blog/ArticleBody'
import type { BlogPost } from '@/payload-types'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const stamp = Date.now()

const textNode = (text: string) => ({
  type: 'text',
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
  text,
  version: 1,
})

// Lexical state: a single paragraph of text.
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
          children: [textNode(text)],
        },
      ],
    },
  }
}

// Lexical state whose paragraph ends with a link node carrying the given href — used
// to prove the ArticleBody link converter sanitizes `href` schemes via the shared
// allowlist.
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
            textNode(prefix),
            {
              type: 'link',
              format: '' as const,
              indent: 0,
              version: 3,
              direction: 'ltr' as const,
              fields: { linkType: 'custom', url, newTab: false },
              children: [textNode(linkText)],
            },
          ],
        },
      ],
    },
  }
}

// Lexical state with a bullet list of the given items — used to prove the list
// converter restores markers + indent that Tailwind preflight strips.
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
            children: [textNode(text)],
          })),
        },
      ],
    },
  }
}

const asBody = (data: unknown): BlogPost['body'] => data as unknown as BlogPost['body']

const renderBody = (data: unknown): string =>
  renderToStaticMarkup(ArticleBody({ body: asBody(data) }))

async function renderDetail(slug: string): Promise<string> {
  const element = await (
    BlogPostReaderPage as unknown as (props: {
      params: Promise<{ slug: string }>
    }) => Promise<ReactElement>
  )({ params: Promise.resolve({ slug }) })
  return renderToStaticMarkup(element)
}

async function clearBlogPosts(): Promise<void> {
  await payload.delete({
    collection: 'blog-posts',
    where: { id: { exists: true } },
    context: { disableRevalidate: true },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await clearBlogPosts()
})

afterEach(async () => {
  await clearBlogPosts()
})

afterAll(async () => {
  await clearBlogPosts()
})

describe('Blog reader — JSON-LD injection safety (review finding 1, mirrored)', () => {
  it('escapes a hostile </script> title so it cannot break out of the ld+json block', async () => {
    const evil = `Pwned </script><script>alert(1)</script> ${stamp}`
    const slug = `evil-blog-title-${stamp}`
    await payload.create({
      collection: 'blog-posts',
      data: {
        title: evil,
        slug,
        body: asBody(lexical(`body ${stamp}`)),
        serviceCategory: 'general',
        _status: 'published',
      },
      context: { disableRevalidate: true },
    })

    const html = await renderDetail(slug)

    // The raw hostile markup must never appear verbatim — if it did it would execute.
    expect(html, 'the raw </script><script> payload must not appear').not.toContain(
      '</script><script>alert(1)</script>',
    )

    // Non-greedy capture stops at the FIRST </script>. With escaping, the title's `<`
    // are `<`, so the first literal </script> is the ld+json block's own closing
    // tag → the JSON is complete and parses; unescaped it would truncate and throw.
    const block = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
    expect(block, 'an ld+json block is present').toBeTruthy()
    expect(block![1], 'the block escapes `<` to its unicode form').toContain('\\u003c')
    const parsed = JSON.parse(block![1])
    expect(parsed['@type'], 'the escaped block is an Article node').toBe('Article')
    expect(parsed.headline, 'headline decodes back to the intact title').toBe(evil)
  })
})

describe('Blog rich text — link scheme sanitization (review finding 3, mirrored)', () => {
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

describe('Blog rich text — list markers (ui-verifier #66 fix)', () => {
  it('restores list-style + indent so bullets render (Tailwind preflight strips them)', () => {
    const html = renderBody(lexicalWithList([`first ${stamp}`, `second ${stamp}`]))
    expect(html, 'a <ul> is emitted').toMatch(/<ul\b/)
    expect(html, 'items are <li>').toMatch(/<li\b/)
    expect(html, 'markers restored via list-style-type').toContain('list-style-type:disc')
    expect(html, 'indent restored').toContain('padding-left:24px')
    expect(html).toContain(`first ${stamp}`)
    expect(html).toContain(`second ${stamp}`)
  })
})

describe('Blog revalidation hooks — never-throw (review finding 2, mirrored)', () => {
  it('a publish with hooks enabled (no disableRevalidate) commits without throwing', async () => {
    const slug = `hooked-blog-publish-${stamp}`
    // No `context.disableRevalidate`: the afterChange hook runs its revalidatePath path
    // outside a Next request scope (this node env), where revalidatePath throws. The
    // hook's try/catch must swallow it so the committed write still resolves.
    const created = await payload.create({
      collection: 'blog-posts',
      data: {
        title: `Hooked ${stamp}`,
        slug,
        body: asBody(lexical(`hook body ${stamp}`)),
        serviceCategory: 'general',
        _status: 'published',
      },
    })
    expect(created?.slug, 'the mutation resolved despite the hook running').toBe(slug)

    const found = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      overrideAccess: true,
    })
    expect(found.totalDocs, 'the row actually committed').toBe(1)
  })
})
