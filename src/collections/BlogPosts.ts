import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { readingTimeMinutes } from '@/utilities/readingTime'
import { buildPreviewUrl } from '@/utilities/previewUrl'

/**
 * On-demand revalidation (issue #1 decision log). Payload 3 runs in-process with
 * Next, so a content change calls Next's `revalidatePath()` directly — no webhook,
 * no token endpoint, no cron. The `/blog` index and the affected post path are
 * dropped so new/edited/unpublished posts appear (or disappear) without a redeploy
 * (#18's hard requirement). The hook lives in this collection file, not a shared
 * helper, so the three Phase 4 content lanes stay conflict-free (per the #1 decision).
 *
 * Wrapped in try/catch: these hooks ALSO fire from the Payload Local API OUTSIDE a
 * Next request (integration tests, seed scripts), where `revalidatePath` has no
 * render/request store to write to and throws. Swallowing that keeps a Local-API
 * write from failing — the write itself still commits; there is simply nothing to
 * revalidate. Callers that want to opt out entirely can set `context.disableRevalidate`.
 */
function revalidateBlog(slug?: string | null): void {
  try {
    revalidatePath('/blog')
    if (slug) revalidatePath(`/blog/${slug}`)
  } catch {
    // Outside a Next request context (Local API / tests) there is nothing to
    // revalidate; the underlying content write still succeeds.
  }
}

/**
 * Blog posts (PRD §9). The richest content type:
 * - Lexical rich-text body (hard requirement).
 * - Drafts + scheduled publishing (`versions.drafts.schedulePublish`).
 * - Admin Preview via the `/preview` route (Next.js Draft Mode).
 * - Reading time auto-computed from the body on save.
 * - Distinct featured image and OG image; SEO meta group.
 * - Public read is restricted to published docs; staff see drafts.
 */
export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  labels: { singular: 'Blog Post', plural: 'Blog Posts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'serviceCategory', 'author', '_status', 'publishedAt'],
    group: 'Content',
    preview: (doc) => buildPreviewUrl('blog-posts', (doc as { slug?: string })?.slug),
  },
  access: {
    read: publishedOrStaff('_status'),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  versions: {
    maxPerDoc: 25,
    drafts: {
      autosave: false,
      schedulePublish: true, // enables future-dated publish via the jobs queue
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
      admin: { description: 'Short summary for cards and as an SEO/meta fallback.' },
    },
    {
      name: 'body',
      type: 'richText', // uses the config-level Lexical editor
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'featuredImage',
          type: 'upload',
          relationTo: 'media',
          admin: { width: '50%' },
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'authors',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'serviceCategory',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: [
        { label: 'AI Training', value: 'ai-training' },
        { label: 'Budget Software', value: 'budget-software' },
        { label: 'Consulting', value: 'consulting' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      admin: { description: 'Free-form tags. Press enter after each.' },
    },
    {
      name: 'readingTime',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-calculated from the body (words ÷ 200) on save.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Display date. Defaults to first publish.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    seoFields,
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        const body = (data as { body?: { root?: unknown } })?.body
        if (body?.root) {
          data.readingTime = readingTimeMinutes(body.root)
        }
        if (data?._status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      ({ doc, previousDoc, req }) => {
        if (req?.context?.disableRevalidate) return doc
        const slug = (doc as { slug?: string })?.slug
        revalidateBlog(slug)
        // If the slug changed, drop the old post path too so the stale URL 404s.
        const prevSlug = (previousDoc as { slug?: string })?.slug
        if (prevSlug && prevSlug !== slug) revalidateBlog(prevSlug)
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req }) => {
        if (req?.context?.disableRevalidate) return doc
        revalidateBlog((doc as { slug?: string })?.slug)
        return doc
      },
    ],
  },
}
