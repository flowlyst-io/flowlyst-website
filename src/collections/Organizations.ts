import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { revalidatePaths } from '@/utilities/revalidate'

const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidatePaths(['/'], req)
  return doc
}

const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidatePaths(['/'], req)
  return doc
}

/**
 * Organizations (issue #43): the names rolling in the homepage trust strip. A name
 * appears there only when it is Published and "Show on homepage" is ticked, in
 * ascending `order`. Plain `status` select, like Testimonials.
 */
export const Organizations: CollectionConfig = {
  slug: 'organizations',
  labels: { singular: 'Organization', plural: 'Organizations' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order', 'showInMarquee', 'status'],
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
    {
      name: 'name',
      type: 'text',
      required: true,
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() : value)],
      },
    },
    {
      name: 'showInMarquee',
      type: 'checkbox',
      label: 'Show on homepage',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Shows in the homepage strip only when also Published.',
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Lower numbers roll first. Blank goes after the numbered ones.',
      },
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
        description: 'Only Published organizations appear on the site.',
      },
    },
  ],
}
