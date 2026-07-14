import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'
import { revalidatePath } from 'next/cache'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { validateURL } from '@/fields/validators'

/**
 * On-demand revalidation for the testimonials index (issue #1 "content revalidation
 * mechanism" decision). Payload 3 runs in-process with Next, so creating, editing,
 * unpublishing, or deleting a testimonial calls `revalidatePath('/testimonials')`
 * directly — no token endpoint, no HTTP round-trip — and the change appears without a
 * redeploy.
 *
 * Guarded: `revalidatePath` throws when there is no Next request scope (Local API
 * seeds, migrations, and the integration tests that `payload.create` testimonials), so
 * the call is wrapped and a failure is logged, never rethrown. Revalidation can never
 * fail the write (same principle as the never-throwing lead-notification hooks).
 */
function revalidateTestimonialsIndex(payload: { logger: { warn: (msg: string) => void } }): void {
  try {
    revalidatePath('/testimonials')
  } catch (err) {
    payload.logger.warn(
      `Testimonials revalidatePath('/testimonials') skipped (no request scope): ${String(err)}`,
    )
  }
}

const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidateTestimonialsIndex(req.payload)
  return doc
}

const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateTestimonialsIndex(req.payload)
  return doc
}

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
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
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
        { label: 'Keynotes', value: 'keynotes' },
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
