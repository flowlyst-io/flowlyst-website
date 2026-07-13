import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminFieldLevel } from '@/access'

/**
 * Newsletter subscribers (PRD §8.3, §9). Email list with subscribe/unsubscribe
 * status, exportable to CSV (see the import-export plugin in payload.config.ts).
 *
 * Access mirrors the other lead-capture collections: public `create` (the
 * signup form POSTs here), everything else Admin-only (PII / §9).
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
    read: isAdmin,
    update: isAdmin,
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
      // Not `required` — defaulted server-side. Field-level access locks it to
      // Admins so an anonymous signup can't set itself to a chosen status.
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
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
