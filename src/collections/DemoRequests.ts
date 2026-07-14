import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminFieldLevel } from '@/access'
import { notifyDemoRequest } from '@/email/leadNotifications'
import type { DemoRequest } from '@/payload-types'

/**
 * Demo requests inbox (PRD §8.1, §9). The highest-intent lead.
 *
 * Access: `create` is public so the demo form can POST anonymously (anti-abuse
 * lands with that form). Everything else is **Admin-only** — lead data is PII
 * and PRD §9 scopes Editors to content only, not the lead inboxes.
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
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // Notify sales when a demo request is created (PRD §8.1). Runs after the
    // write, and the helper never throws / skips when email is unconfigured, so
    // a mail problem can never fail persistence (review invariant d).
    afterChange: [
      ({ doc, operation, req }) => {
        if (operation === 'create') void notifyDemoRequest(req.payload, doc as DemoRequest)
      },
    ],
  },
  fields: [
    // --- Internal triage (sidebar) ---
    {
      name: 'status',
      type: 'select',
      // Not `required`: a public submitter never sends it — the default applies
      // server-side. Staff drive it through the triage workflow thereafter.
      // Field-level access locks it to Admins so an anonymous `create` can't
      // inject a triage status; the default wins instead.
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
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
      // Admin-only field — a public submitter can never write internal notes.
      access: { create: isAdminFieldLevel, update: isAdminFieldLevel },
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
        { label: 'Keynotes', value: 'keynotes' },
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
      // Required-true on submit (PRD §8.1 consent). `defaultValue: false` makes
      // the field present even when a submitter omits it, so `validate` reliably
      // runs and rejects the omitted / unchecked case (Payload does not run a
      // field validate for an absent field). Scoped to `create` so an Admin
      // editing an existing row is never blocked by it.
      defaultValue: false,
      validate: (value: unknown, { operation }: { operation?: string }) =>
        operation !== 'create' || value === true || 'You must agree to be contacted.',
      admin: { description: 'Requester consented to be contacted (required on submit).' },
    },
    // Anti-spam honeypot — hidden from the admin UI; empty in real submissions.
    // Server-validated: a filled value (a bot completing a field no human sees)
    // is rejected. Mirrors the SpeakingRequests template.
    {
      name: 'botField',
      type: 'text',
      admin: { hidden: true },
      validate: (value: unknown) => (value ? 'This submission was flagged as spam.' : true),
    },
  ],
}
