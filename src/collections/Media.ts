import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '@/access'

/**
 * Media library. PRD §9 hard requirements: drag-and-drop upload, automatic
 * resizing, and **alt text captured as a hard rule** (validation, not
 * convention).
 *
 * Storage: local filesystem in dev; Vercel Blob in staging/prod when
 * `BLOB_READ_WRITE_TOKEN` is present. The switch is wired in `payload.config.ts`
 * via `@payloadcms/storage-vercel-blob` with `alwaysInsertFields: true`, so the
 * DB schema is identical whether or not Blob is enabled (one committed migration
 * is valid in every environment).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { group: 'Content' },
  access: {
    // Public read: images must be served to anonymous site visitors.
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    // Automatic resizing (PRD §9). Names are referenced by the frontend in
    // Phase 2 for responsive images and OG cards.
    imageSizes: [
      { name: 'thumbnail', width: 400, height: undefined, position: 'centre' },
      { name: 'card', width: 768, height: undefined, position: 'centre' },
      { name: 'feature', width: 1200, height: undefined, position: 'centre' },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true, // hard validation — an image cannot be saved without alt text
      admin: {
        description: 'Describe the image for screen readers and SEO. Required (WCAG 2.1 AA).',
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: { description: 'Optional visible caption.' },
    },
  ],
}
