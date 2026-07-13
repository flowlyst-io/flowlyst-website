import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { validateURL } from '@/fields/validators'

/**
 * Testimonials (PRD §9). CMS-driven (PRD §13: dynamic, not hardcoded) so the
 * marketing team can add one without a redeploy.
 *
 * A plain `status` select (draft/published) rather than the full versions
 * machinery — testimonials are short and don't need drafts history or
 * scheduling. Public read is limited to `published` via `publishedOrStaff`.
 */
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Testimonial', plural: 'Testimonials' },
  admin: {
    useAsTitle: 'clientName',
    defaultColumns: ['clientName', 'organization', 'serviceCategory', 'featured', 'status'],
    group: 'Content',
  },
  access: {
    read: publishedOrStaff('status'),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'clientName', type: 'text', required: true },
    {
      name: 'roleTitle',
      type: 'text',
      admin: { description: 'Role / title of the person quoted.' },
    },
    {
      name: 'organization',
      type: 'text',
      admin: { description: 'District or organization.' },
    },
    { name: 'industry', type: 'text' },
    {
      name: 'serviceCategory',
      type: 'select',
      options: [
        { label: 'AI Training', value: 'ai-training' },
        { label: 'Budget Software', value: 'budget-software' },
        { label: 'Consulting', value: 'consulting' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      name: 'videoUrl',
      type: 'text',
      label: 'Video URL',
      validate: validateURL,
      admin: { description: 'Optional link to a video testimonial.' },
    },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Surface on the homepage / featured slots.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Only Published testimonials appear on the site.',
      },
    },
  ],
}
