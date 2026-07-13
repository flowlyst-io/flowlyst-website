import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { buildPreviewUrl } from '@/utilities/previewUrl'

/**
 * Case studies (PRD §9): long-form, *structured* content — distinct from blog
 * posts. Intro / challenge / solution / results are each their own Lexical
 * rich-text section, plus district info and headline metrics.
 *
 * Same publishing machinery as blog posts: drafts, scheduled publishing, admin
 * Preview, and published-only public read.
 */
export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  labels: { singular: 'Case Study', plural: 'Case Studies' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'serviceCategory', '_status', 'publishedAt'],
    group: 'Content',
    preview: (doc) => buildPreviewUrl('case-studies', (doc as { slug?: string })?.slug),
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
      schedulePublish: true,
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    {
      name: 'serviceCategory',
      type: 'select',
      required: true,
      defaultValue: 'budget-software',
      options: [
        { label: 'AI Training', value: 'ai-training' },
        { label: 'Budget Software', value: 'budget-software' },
        { label: 'Consulting', value: 'consulting' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      name: 'districtInfo',
      type: 'group',
      label: 'District',
      fields: [
        { name: 'name', type: 'text', admin: { description: 'District / organization name.' } },
        {
          type: 'row',
          fields: [
            { name: 'state', type: 'text', admin: { width: '50%' } },
            {
              name: 'studentCount',
              type: 'number',
              admin: { width: '50%', description: 'Enrollment / size.' },
            },
          ],
        },
      ],
    },
    { name: 'intro', type: 'richText', label: 'Introduction' },
    { name: 'challenge', type: 'richText' },
    { name: 'solution', type: 'richText' },
    { name: 'results', type: 'richText' },
    {
      name: 'metrics',
      type: 'array',
      labels: { singular: 'Metric', plural: 'Metrics' },
      admin: { description: 'Headline outcome numbers, e.g. "Hours saved" → "1,200/yr".' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { width: '50%' } },
            { name: 'value', type: 'text', required: true, admin: { width: '50%' } },
          ],
        },
      ],
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
        if (data?._status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
