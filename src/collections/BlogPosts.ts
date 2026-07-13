import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { readingTimeMinutes } from '@/utilities/readingTime'
import { buildPreviewUrl } from '@/utilities/previewUrl'

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
  },
}
