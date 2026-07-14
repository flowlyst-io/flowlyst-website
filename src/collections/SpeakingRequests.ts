import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminFieldLevel } from '@/access'
import { notifySpeakingRequest } from '@/email/leadNotifications'
import type { SpeakingRequest } from '@/payload-types'

/**
 * Speaking requests inbox (PRD §4.4, §8, §9). Event organizers ask Aziz to keynote
 * or run a conference session — a distinct lead type from a demo request (different
 * audience, format, and booking path, per PRD §4.4).
 *
 * Access mirrors {@link DemoRequests}: `create` is public so the keynotes page's
 * speaking-request form can POST anonymously to the auto-generated REST endpoint
 * (`POST /api/speaking-requests`); everything else is Admin-only because the rows
 * are lead PII and PRD §9 scopes Editors to content, not the lead inboxes.
 *
 * Anti-spam: a hidden `botField` honeypot enforced server-side via `validate`.
 * A real browser leaves it empty (it's visually hidden in the form); a bot that
 * fills every input trips the validator and the create is rejected 400. This is
 * the site's FIRST lead form, so this establishes the honeypot pattern the other
 * forms (#14: demo / contact / newsletter) will follow — flagged for the
 * orchestrator to bless before it's copied. reCAPTCHA (PRD §10.4) is deferred.
 *
 * Email notification on submit is explicitly out of scope tonight — persistence
 * to this collection is the delivery path; #14 wires the notifier (an `afterChange`
 * hook is the natural home) once the mail transport is settled.
 */
export const SpeakingRequests: CollectionConfig = {
  slug: 'speaking-requests',
  labels: { singular: 'Speaking Request', plural: 'Speaking Requests' },
  admin: {
    useAsTitle: 'eventName',
    defaultColumns: ['eventName', 'contactName', 'organization', 'status', 'createdAt'],
    listSearchableFields: ['eventName', 'contactName', 'organization', 'email'],
    group: 'Leads',
  },
  access: {
    create: anyone,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // Notify on a new speaking request (Phase 3 foundation wired this collection
    // into the shared notifier — the "#14 wires the notifier" note above). After-
    // write, non-throwing, skips when email is unconfigured — never fails
    // persistence (invariant d).
    afterChange: [
      ({ doc, operation, req }) => {
        if (operation === 'create') void notifySpeakingRequest(req.payload, doc as SpeakingRequest)
      },
    ],
  },
  fields: [
    // --- Internal triage (sidebar) ---
    {
      name: 'status',
      type: 'select',
      // Not `required`: a public submitter never sends it — the default applies
      // server-side. Field-level access locks it to Admins so an anonymous
      // `create` can't inject a triage status; the default wins instead. Status
      // vocabulary mirrors DemoRequests for a consistent lead-inbox workflow.
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
    // Contact fields (name / email / organization) are NOT in the design comp's
    // form, but the brief's collection spec lists them and a speaking request is
    // un-actionable without a way to reply (invariant d). Added with the design's
    // own field/form-row classes; the design divergence is noted in the task report.
    { name: 'contactName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'organization',
      type: 'text',
      admin: { description: 'Association, district, or event host.' },
    },
    { name: 'eventName', type: 'text', required: true },
    {
      name: 'eventDate',
      type: 'text',
      required: true,
      admin: { description: 'Date or timeframe (free text, e.g. “Fall 2026”).' },
    },
    { name: 'audienceSize', type: 'text' },
    { name: 'budgetRange', type: 'text' },
    {
      name: 'topicInterest',
      type: 'select',
      options: [
        { label: 'AI for school business officials', value: 'ai-sbo' },
        { label: 'Automating district finance & ops', value: 'automation' },
        { label: 'AI adoption for school leaders', value: 'ai-adoption' },
        { label: 'Custom topic', value: 'custom' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Anything else we should know?',
    },
    // --- Anti-spam honeypot (hidden from the admin UI; empty in real submissions) ---
    {
      name: 'botField',
      type: 'text',
      admin: { hidden: true },
      // Runs server-side on every create, whatever the entry path. A filled value
      // means a bot completed a field no human can see → reject.
      validate: (value: unknown) => (value ? 'This submission was flagged as spam.' : true),
    },
  ],
}
