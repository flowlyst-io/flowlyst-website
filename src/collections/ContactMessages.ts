import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminFieldLevel } from '@/access'
import { notifyContactMessage } from '@/email/leadNotifications'
import type { ContactMessage } from '@/payload-types'

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
  hooks: {
    // Notify info@ when a contact message is created (PRD §8.2). After-write,
    // non-throwing, skips when email is unconfigured — never fails persistence.
    afterChange: [
      ({ doc, operation, req }) => {
        if (operation === 'create') void notifyContactMessage(req.payload, doc as ContactMessage)
      },
    ],
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
    { name: 'email', type: 'email', label: 'Work email', required: true },
    {
      name: 'reason',
      type: 'select',
      // Options aligned to the settled ContactPage design (design/site/pages.jsx):
      // Press / Partnership / Training question / Support / Other. NOTE: the prior
      // `general` value is intentionally dropped — the catch-all is now `other`.
      options: [
        { label: 'Press', value: 'press' },
        { label: 'Partnership', value: 'partnership' },
        { label: 'Training question', value: 'training' },
        { label: 'Support', value: 'support' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'message', type: 'textarea', required: true },
    // Anti-spam honeypot (SpeakingRequests template) — hidden, server-validated.
    {
      name: 'botField',
      type: 'text',
      admin: { hidden: true },
      validate: (value: unknown) => (value ? 'This submission was flagged as spam.' : true),
    },
  ],
}
