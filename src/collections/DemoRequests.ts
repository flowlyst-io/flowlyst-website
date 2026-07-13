import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '@/access'

/**
 * Demo requests inbox (PRD §8.1, §9). The highest-intent lead.
 *
 * Access (DECISION — orchestrator to ratify): `create` is public so the Phase-2
 * demo form can POST anonymously; anti-abuse (reCAPTCHA, rate-limiting) lands
 * with that form. Read/triage is staff-only; only Admins may delete.
 *
 * Triage: a status workflow (pending → scheduled → completed/canceled) plus an
 * internal-notes field, with list columns/filters chosen so the inbox is usable
 * at a glance.
 *
 * CSV export (PRD §9) is intentionally NOT hand-built. Add
 * `@payloadcms/plugin-import-export` if the team wants one-click export — a
 * decision for the orchestrator, not scope for this issue.
 */
export const DemoRequests: CollectionConfig = {
  slug: 'demo-requests',
  labels: { singular: 'Demo Request', plural: 'Demo Requests' },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'workEmail', 'district', 'status', 'createdAt'],
    listSearchableFields: ['fullName', 'workEmail', 'district'],
    group: 'Leads',
  },
  access: {
    create: anyone,
    read: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    // --- Internal triage (sidebar) ---
    {
      name: 'status',
      type: 'select',
      // Not `required`: a public submitter never sends it — the default applies
      // server-side. Staff drive it through the triage workflow thereafter.
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Canceled', value: 'canceled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: {
        position: 'sidebar',
        description: 'Internal only — never shown to the requester.',
      },
    },
    // --- Submitted by the requester ---
    { name: 'fullName', type: 'text', required: true },
    { name: 'title', type: 'text' },
    { name: 'district', type: 'text' },
    { name: 'workEmail', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    {
      name: 'interests',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'AI Training', value: 'ai-training' },
        { label: 'Budget Software', value: 'budget-software' },
        { label: 'Consulting', value: 'consulting' },
      ],
    },
    {
      name: 'datePreference',
      type: 'text',
      admin: { description: 'Requester’s preferred date/time (free text).' },
    },
    { name: 'message', type: 'textarea' },
    {
      name: 'districtSize',
      type: 'text',
      admin: { description: 'Optional — student count or number of schools.' },
    },
    {
      name: 'heardAboutUs',
      type: 'select',
      label: 'How did you hear about us?',
      options: [
        { label: 'Google search', value: 'google' },
        { label: 'AI assistant (ChatGPT, Claude, …)', value: 'ai-assistant' },
        { label: 'Referral', value: 'referral' },
        { label: 'Event or conference', value: 'event' },
        { label: 'LinkedIn or social', value: 'social' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'anythingElse',
      type: 'textarea',
      label: 'Anything else we should know?',
    },
    {
      name: 'consent',
      type: 'checkbox',
      admin: { description: 'Requester consented to be contacted.' },
    },
  ],
}
