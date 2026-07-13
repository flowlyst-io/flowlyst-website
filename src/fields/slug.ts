import type { Field } from 'payload'

import { formatSlug } from '@/utilities/formatSlug'

/**
 * A reusable, author-friendly slug field.
 *
 * - Lives in the sidebar, indexed and unique (stable public URLs).
 * - Auto-derives from a source field (default: `title`) when left blank, and
 *   normalises whatever the author types via {@link formatSlug}. Runs in
 *   `beforeValidate` so the derived value satisfies `required`.
 */
export const slugField = (sourceField = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'URL path segment. Auto-generated from the title if left blank.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data, originalDoc }) => {
        if (typeof value === 'string' && value.trim().length > 0) {
          return formatSlug(value)
        }
        const source = data?.[sourceField] ?? originalDoc?.[sourceField]
        if (typeof source === 'string' && source.trim().length > 0) {
          return formatSlug(source)
        }
        return value
      },
    ],
  },
})
