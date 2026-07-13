import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminFieldLevel } from '@/access'

/**
 * Contact messages (PRD §8.2). Non-demo inquiries — press, partnerships,
 * training questions, support. Same access shape as the other lead-capture
 * collections: public `create`, everything else Admin-only (PII / §9).
 */
export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Contact Message', plural: 'Contact Messages' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'reason', 'status', 'createdAt'],
    listSearchableFields: ['name', 'email'],
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
      name: 'status',
      type: 'select',
      // Not `required` — defaulted server-side. Field-level access locks it to
      // Admins so an anonymous `create` can't inject a triage status.
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Handled', value: 'handled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
      admin: { position: 'sidebar', description: 'Internal only.' },
    },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'reason',
      type: 'select',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Press', value: 'press' },
        { label: 'Partnerships', value: 'partnerships' },
        { label: 'Training', value: 'training' },
        { label: 'Support', value: 'support' },
      ],
    },
    { name: 'message', type: 'textarea', required: true },
  ],
}
