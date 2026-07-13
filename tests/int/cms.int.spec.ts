// @vitest-environment node
// These exercise the Payload Local API (a backend concern) — run them in Node,
// not jsdom. Under jsdom the file-type library's `instanceof Uint8Array` checks
// fail across realms, breaking upload validation.
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import type { BlogPost } from '@/payload-types'

import { beforeAll, describe, expect, it } from 'vitest'

/**
 * CMS content-model integration tests.
 *
 * These exercise access control the *real* way: `overrideAccess: false` plus an
 * explicit `user`. (The Local API defaults to `overrideAccess: true`, which
 * skips access control entirely — a test that omits it proves nothing.)
 */

let payload: Payload
let admin: { id: number; role?: string | null }
let editor: { id: number; role?: string | null }

const stamp = Date.now()
const pw = 'test-password-123'

// Minimal Lexical value (~200 words) so reading time computes to >= 1.
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

// 1x1 transparent PNG.
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  // Deterministic slate for the role tests. (test:int only touches users via
  // this file and the tolerant api.int.spec, so clearing is safe.)
  await payload.delete({ collection: 'users', where: { id: { exists: true } } })

  // First user ever → forced to Admin by the bootstrap hook, even though we
  // deliberately submit role: 'editor' here (proves the hook overrides input).
  admin = await payload.create({
    collection: 'users',
    data: { email: `admin-${stamp}@flowlyst.test`, password: pw, name: 'Test Admin', role: 'editor' },
  })

  // Second user → not force-admin; explicitly an Editor.
  editor = await payload.create({
    collection: 'users',
    data: { email: `editor-${stamp}@flowlyst.test`, password: pw, name: 'Test Editor', role: 'editor' },
  })
})

describe('Roles', () => {
  it('bootstraps the first user to Admin', () => {
    expect(admin.role).toBe('admin')
  })

  it('does not force later users to Admin', () => {
    expect(editor.role).toBe('editor')
  })

  it('lets an Editor create content', async () => {
    const t = await payload.create({
      collection: 'testimonials',
      data: { quote: 'Great', clientName: 'Jane', status: 'draft' },
      overrideAccess: false,
      user: editor,
    })
    expect(t.id).toBeDefined()
  })

  it('forbids an Editor from creating a user', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: `x-${stamp}@flowlyst.test`, password: pw, name: 'X', role: 'editor' },
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toThrow()
  })

  it('forbids an Editor from editing Site Settings', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'site-settings',
        data: { footerText: 'hacked' },
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toThrow()
    // Admin can.
    const updated = await payload.updateGlobal({
      slug: 'site-settings',
      data: { footerText: 'ok' },
      overrideAccess: false,
      user: admin,
    })
    expect(updated.footerText).toBe('ok')
  })

  it('prevents an Editor from self-escalating via the role field', async () => {
    await payload.update({
      collection: 'users',
      id: editor.id,
      data: { role: 'admin', name: 'Still Editor' },
      overrideAccess: false,
      user: editor,
    })
    const fresh = await payload.findByID({ collection: 'users', id: editor.id })
    expect(fresh.role).toBe('editor') // role change ignored; other fields still saved
    expect(fresh.name).toBe('Still Editor')
  })
})

describe('Media', () => {
  it('rejects an upload without alt text (validation, not convention)', async () => {
    await expect(
      // @ts-expect-error intentionally omitting the required `alt` to prove
      // runtime validation rejects it (not just a TS-level constraint).
      payload.create({
        collection: 'media',
        data: {},
        file: { data: pngBuffer, mimetype: 'image/png', name: `noalt-${stamp}.png`, size: pngBuffer.length },
      }),
      // The file itself is valid, so the rejection is specifically about `alt`.
    ).rejects.toThrow(/alt/i)
  })

  it('accepts an upload with alt text', async () => {
    const created = await payload.create({
      collection: 'media',
      data: { alt: 'A test pixel' },
      file: { data: pngBuffer, mimetype: 'image/png', name: `alt-${stamp}.png`, size: pngBuffer.length },
    })
    expect(created.alt).toBe('A test pixel')
  })
})

describe('Blog post drafts & visibility', () => {
  const slug = `draft-post-${stamp}`
  let id: string | number

  it('hides a draft from the public but shows it to staff', async () => {
    const created = await payload.create({
      collection: 'blog-posts',
      data: {
        title: 'Draft Post',
        slug,
        body: lexicalBody,
        serviceCategory: 'general',
        _status: 'draft',
      },
    })
    id = created.id

    // Reading time auto-computed from the body.
    expect(typeof created.readingTime).toBe('number')
    expect(created.readingTime as number).toBeGreaterThanOrEqual(1)

    // Public (anonymous), no draft flag → nothing.
    const anon = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      overrideAccess: false,
    })
    expect(anon.totalDocs).toBe(0)

    // Public asking for draft → still filtered out by access (_status must be published).
    const anonDraft = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      draft: true,
      overrideAccess: false,
    })
    expect(anonDraft.totalDocs).toBe(0)

    // Staff with draft view → visible.
    const staff = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      draft: true,
      overrideAccess: false,
      user: editor,
    })
    expect(staff.totalDocs).toBe(1)
    expect(staff.docs[0]._status).toBe('draft')
  })

  it('shows the post publicly once published', async () => {
    await payload.update({ collection: 'blog-posts', id, data: { _status: 'published' } })

    const anon = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      overrideAccess: false,
    })
    expect(anon.totalDocs).toBe(1)
    expect(anon.docs[0].publishedAt).toBeTruthy() // set on first publish
  })
})

describe('Scheduled publishing', () => {
  it('publishes a scheduled draft when its due job runs', async () => {
    const slug = `scheduled-${stamp}`
    const post = await payload.create({
      collection: 'blog-posts',
      data: { title: 'Scheduled', slug, body: lexicalBody, serviceCategory: 'general', _status: 'draft' },
    })

    // Not public yet.
    const before = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      overrideAccess: false,
    })
    expect(before.totalDocs).toBe(0)

    // Enqueue a past-due publish job — exactly what the admin "Schedule Publish"
    // action does — then run the queue (what the production Vercel Cron triggers).
    await payload.jobs.queue({
      task: 'schedulePublish',
      input: { type: 'publish', doc: { relationTo: 'blog-posts', value: post.id }, user: admin.id },
      waitUntil: new Date(Date.now() - 60_000),
    })
    await payload.jobs.run()

    const after = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      overrideAccess: false,
    })
    expect(after.totalDocs).toBe(1) // now visible to the public
    expect(after.docs[0]._status).toBe('published')
  })
})

describe('Lead capture (demo requests inbox)', () => {
  it('accepts a public submission defaulting to status "pending"', async () => {
    const created = await payload.create({
      collection: 'demo-requests',
      data: { fullName: 'Sam Lead', workEmail: `sam-${stamp}@district.k12.us` },
      overrideAccess: false, // anonymous
    })
    expect(created.status).toBe('pending')
  })

  it('does not expose the inbox to the public', async () => {
    await expect(
      payload.find({ collection: 'demo-requests', overrideAccess: false }),
    ).rejects.toThrow()
  })
})
