// @vitest-environment node
// CMS-driven homepage rendering (issue #6 acceptance criterion 4).
//
// Runs in Node (not jsdom): the homepage server component awaits the Payload
// Local API, a backend concern (see tests/int/cms.int.spec.ts for the same
// rationale). We render the *real* page component against a DB we control, so we
// prove the page's own query path — not a reimplementation of it:
//   - a published testimonial renders; a DRAFT testimonial does NOT leak
//   - the blog teaser shows published posts only (drafts hidden)
//   - the empty-CMS state renders cleanly: the testimonials/blog sections are
//     omitted entirely (per coder-hp's contract), with no broken scaffolding
//
// Expected behaviors come from the brief's criteria + design/site/home.jsx, not
// from what the implementation happens to emit. Section presence keys off the
// data-testids agreed with coder-hp (home-testimonials / home-blog).
//
// NOTE (pending render spike): this proves criterion 4 by rendering the server
// component with renderToStaticMarkup after awaiting it. That works only if the
// page resolves ALL its CMS data at the top level (no nested async server
// components, which the synchronous server renderer cannot await). If the spike
// shows nested async data-fetching, this pivots to testing coder-hp's importable
// CMS-fetch seam directly. Fixtures are image-less to avoid next/image outside
// the Next runtime.
import { getPayload, type Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

import config from '@/payload.config'
import HomePage from '@/app/(frontend)/page'
import type { BlogPost } from '@/payload-types'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

let payload: Payload
const stamp = Date.now()

// Minimal Lexical body (~200 words) so blog reading-time computes >= 1.
const lexicalBody: BlogPost['body'] = {
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
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'word '.repeat(220),
            version: 1,
          },
        ],
      },
    ],
  },
}

/**
 * Render the real homepage server component to a static HTML string. We await
 * the (async) component to resolve its top-level data, then render the resolved
 * element. Defensive props: Next passes params/searchParams as promises; supply
 * empty ones so a destructure can't throw even if the page ignores them.
 */
async function renderHome(): Promise<string> {
  const element = await (HomePage as unknown as (props: unknown) => Promise<ReactElement>)({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({}),
  })
  return renderToStaticMarkup(element)
}

async function clearContent(): Promise<void> {
  await payload.delete({ collection: 'testimonials', where: { id: { exists: true } } })
  await payload.delete({ collection: 'blog-posts', where: { id: { exists: true } } })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

describe('Homepage CMS rendering', () => {
  // Each test owns a clean content slate so ordering across files can't leak
  // data in. (fileParallelism is off, so files run serially — see vitest.config.)
  beforeEach(async () => {
    await clearContent()
  })

  it('omits the testimonials and blog sections when the CMS is empty', async () => {
    const html = await renderHome()
    expect(html, 'testimonials section must be omitted when empty').not.toContain(
      'data-testid="home-testimonials"',
    )
    expect(html, 'blog section must be omitted when empty').not.toContain('data-testid="home-blog"')
    // No broken scaffolding: no stray undefined/null bleeding into the markup.
    expect(html).not.toMatch(/>\s*undefined\s*</)
    expect(html).not.toMatch(/>\s*null\s*</)
  })

  it('renders a published testimonial and does NOT leak a draft', async () => {
    const published = `PUBLISHED-TESTIMONIAL-${stamp}`
    const draft = `DRAFT-TESTIMONIAL-${stamp}`
    await payload.create({
      collection: 'testimonials',
      data: {
        quote: published,
        clientName: 'Published Client',
        status: 'published',
        featured: true,
      },
    })
    await payload.create({
      collection: 'testimonials',
      data: { quote: draft, clientName: 'Draft Client', status: 'draft', featured: true },
    })

    const html = await renderHome()
    expect(html, 'testimonials section present when a published one exists').toContain(
      'data-testid="home-testimonials"',
    )
    expect(html, 'published testimonial quote must render').toContain(published)
    expect(html, 'draft testimonial quote must NOT leak to the public homepage').not.toContain(
      draft,
    )
  })

  it('shows only published posts in the blog teaser (drafts hidden)', async () => {
    const publishedTitle = `PUBLISHED-POST-${stamp}`
    const draftTitle = `DRAFT-POST-${stamp}`
    await payload.create({
      collection: 'blog-posts',
      data: {
        title: publishedTitle,
        slug: `pub-post-${stamp}`,
        body: lexicalBody,
        serviceCategory: 'general',
        _status: 'published',
      },
    })
    await payload.create({
      collection: 'blog-posts',
      data: {
        title: draftTitle,
        slug: `draft-post-${stamp}`,
        body: lexicalBody,
        serviceCategory: 'general',
        _status: 'draft',
      },
    })

    const html = await renderHome()
    expect(html, 'blog section present when a published post exists').toContain(
      'data-testid="home-blog"',
    )
    expect(html, 'published post title must render in the teaser').toContain(publishedTitle)
    expect(html, 'draft post title must NOT leak to the public homepage').not.toContain(draftTitle)
  })
})
