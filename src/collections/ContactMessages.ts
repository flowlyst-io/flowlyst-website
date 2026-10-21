import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminFieldLevel } from '@/access'
import { afterLeadCreate } from '@/leads/afterLeadCreate'
import { crmFields } from '@/fields/crmFields'
import { CONTACT_REASONS } from '@/utilities/contactReasonsShared'
import { recaptchaGuard } from '@/utilities/recaptcha'

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
    defaultColumns: ['name', 'email', 'reason', 'status', 'crmStatus', 'createdAt'],
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
    beforeChange: [recaptchaGuard('contact')],
    // Team email (PRD §8.2), the submitter's confirmation and the Bigin push; the
    // row is committed before any of them and none can fail it.
    afterChange: [afterLeadCreate('contact')],
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
      // The retired `general` value is intentionally gone — the catch-all is `other`.
      options: CONTACT_REASONS.map((r) => ({ ...r })),
    },
    { name: 'message', type: 'textarea', required: true },
    // Anti-spam honeypot (SpeakingRequests template) — hidden, server-validated.
    {
      name: 'botField',
      type: 'text',
      admin: { hidden: true },
      validate: (value: unknown) => (value ? 'This submission was flagged as spam.' : true),
    },
    ...crmFields,
  ],
}
