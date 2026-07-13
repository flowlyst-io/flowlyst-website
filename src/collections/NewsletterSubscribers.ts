import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '@/access'

/**
 * Newsletter subscribers (PRD §8.3, §9). Email list with subscribe/unsubscribe
 * status, exportable to an external mail tool.
 *
 * Access mirrors the other lead-capture collections: public `create` (the
 * Phase-2 signup form POSTs here), staff-only read, Admin-only delete.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: { singular: 'Subscriber', plural: 'Newsletter Subscribers' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'createdAt'],
    listSearchableFields: ['email'],
    group: 'Leads',
  },
  access: {
    create: anyone,
    read: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      // Not `required` — defaulted server-side (public signup doesn't send it).
      defaultValue: 'subscribed',
      options: [
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'text',
      admin: { description: 'Where the signup came from (e.g. /blog).' },
    },
  ],
}
