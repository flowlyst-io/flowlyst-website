import type { CollectionConfig, PayloadRequest } from 'payload'
import { addDataAndFileToRequest } from 'payload'

import { isAdmin, isAdminFieldLevel } from '@/access'
import { sendNewsletterConfirmation } from '@/email/leadNotifications'

/**
 * Newsletter subscribers (PRD §8.3, §9). Email list with subscribe/unsubscribe
 * status, exportable to CSV (see the import-export plugin in payload.config.ts,
 * which lists `newsletter-subscribers`).
 *
 * Access mirrors the other lead-capture collections: public `create`, everything
 * else Admin-only (PII / §9). Anti-spam honeypot (`botField`) matches the
 * SpeakingRequests template.
 *
 * UPSERT: the public signup form must POST to the custom `/subscribe` endpoint
 * (below), NOT the raw `create` — re-subscribing an existing email there is
 * idempotent (updates the row, no duplicate, no error). The raw collection
 * `create` is **Admin-only**: `/subscribe` runs with `overrideAccess`, so it's
 * unaffected, and closing anonymous raw create removes the only public path that
 * could 400 on a duplicate (or bypass the endpoint). See the endpoint.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // Confirmation to the subscriber on first subscribe (PRD §8.3). Gated to
    // `create` so it fires exactly once — the `/subscribe` re-subscribe branch
    // (an update) sends its own confirmation. After-write, non-throwing, and
    // skips when email is unconfigured — never fails persistence (invariant d).
    afterChange: [
      ({ doc, operation, req }) => {
        if (operation === 'create')
          void sendNewsletterConfirmation(req.payload, doc.email as string)
      },
    ],
  },
  endpoints: [
    {
      // POST /api/newsletter-subscribers/subscribe — the idempotent signup path.
      // Find-or-create by email: a new email is created (afterChange sends the
      // confirmation); an existing email is re-subscribed (status → subscribed)
      // with no duplicate row and no error, and the confirmation is sent here.
      //
      // Response is a UNIFORM `200 { ok: true }` for every outcome — success,
      // re-subscribe, honeypot, and invalid input all look identical from the
      // outside. That closes membership enumeration: a caller can't tell whether
      // an email was already subscribed (or exists) from the response.
      path: '/subscribe',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        const ok = () => Response.json({ ok: true }, { status: 200 })

        await addDataAndFileToRequest(req)
        const data = (req.data ?? {}) as { email?: string; source?: string; botField?: string }

        // Honeypot (bot) or malformed email: succeed uniformly without
        // persisting. `/subscribe` is the only public write path, so nothing is
        // stored for these; a real form validates the address client-side first.
        const email = (data.email ?? '').trim().toLowerCase()
        if (data.botField || !EMAIL_RE.test(email)) return ok()

        const source = typeof data.source === 'string' ? data.source : undefined

        // Standalone ops (no `req` threaded) so each commits in its own
        // transaction; overrideAccess because this is an anonymous public path.
        const existing = await req.payload.find({
          collection: 'newsletter-subscribers',
          where: { email: { equals: email } },
          limit: 1,
          overrideAccess: true,
        })

        if (existing.docs.length > 0) {
          const current = existing.docs[0]
          await req.payload.update({
            collection: 'newsletter-subscribers',
            id: current.id,
            data: { status: 'subscribed', ...(source ? { source } : {}) },
            overrideAccess: true,
          })
          // Re-subscribe is an update; afterChange only mails on create, so send
          // the confirmation here.
          await sendNewsletterConfirmation(req.payload, email)
          return ok()
        }

        await req.payload.create({
          collection: 'newsletter-subscribers',
          data: { email, status: 'subscribed', ...(source ? { source } : {}) },
          overrideAccess: true,
        })
        // afterChange(create) sends the confirmation — not re-sent here.
        return ok()
      },
    },
  ],
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
    // Anti-spam honeypot (SpeakingRequests template) — hidden, server-validated.
    // Defends the raw `create` path; the `/subscribe` endpoint checks it too.
    {
      name: 'botField',
      type: 'text',
      admin: { hidden: true },
      validate: (value: unknown) => (value ? 'This submission was flagged as spam.' : true),
    },
  ],
}
