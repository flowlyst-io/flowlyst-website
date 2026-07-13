import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '@/access'
import { slugField } from '@/fields/slug'

/**
 * Training programs / modules (PRD §9). Hierarchical: a program contains an
 * ordered list of modules. Powers the training landing-page detail.
 *
 * Plain `status` select (draft/published) — same rationale as testimonials.
 */
export const TrainingPrograms: CollectionConfig = {
  slug: 'training-programs',
  labels: { singular: 'Training Program', plural: 'Training Programs' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'level', 'format', 'status'],
    group: 'Content',
  },
  access: {
    read: publishedOrStaff('status'),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'description', type: 'textarea' },
    {
      type: 'row',
      fields: [
        {
          name: 'level',
          type: 'select',
          admin: { width: '33%' },
          options: [
            { label: 'Introductory', value: 'introductory' },
            { label: 'Intermediate', value: 'intermediate' },
            { label: 'Advanced', value: 'advanced' },
          ],
        },
        {
          name: 'format',
          type: 'select',
          admin: { width: '33%' },
          options: [
            { label: 'In-person', value: 'in-person' },
            { label: 'Virtual', value: 'virtual' },
            { label: 'Hybrid', value: 'hybrid' },
            { label: 'Self-paced', value: 'self-paced' },
          ],
        },
        {
          name: 'duration',
          type: 'text',
          admin: { width: '33%', description: 'e.g. "2 days" or "6 weeks".' },
        },
      ],
    },
    {
      name: 'modules',
      type: 'array',
      labels: { singular: 'Module', plural: 'Modules' },
      admin: { description: 'Ordered modules within this program.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'duration', type: 'text', admin: { description: 'e.g. "45 min".' } },
      ],
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
      admin: { position: 'sidebar', description: 'Only Published programs appear on the site.' },
    },
  ],
}
