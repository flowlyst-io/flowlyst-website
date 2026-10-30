import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { isAdminOrEditor } from '@/access'
import { isRedirectableHttpsUrl } from '@/fields/validators'
import { randomCode } from '@/utilities/randomCode'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Short links served at /go/<code> or /go/<slug>. Codes and slugs share one
 * namespace (the route cannot tell them apart), kept disjoint by validation.
 * The scan counter is written by a SQL UPDATE in the /go route, never by users.
 */
export const Links: CollectionConfig = {
  slug: 'links',
  labels: { singular: 'Link', plural: 'Links' },
  admin: {
    group: 'Links & Cards',
    useAsTitle: 'name',
    defaultColumns: ['name', 'destination', 'active', 'scanCount', 'lastScannedAt'],
  },
  access: {
    read: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data) return data
        if (typeof data.destination === 'string') data.destination = data.destination.trim()
        if (operation !== 'create') return data
        // Always server-made: a client-supplied code (REST, Duplicate) is ignored.
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = randomCode(6)
          const { totalDocs } = await req.payload.count({
            collection: 'links',
            where: { or: [{ code: { equals: candidate } }, { slug: { equals: candidate } }] },
            req,
          })
          if (totalDocs === 0) {
            data.code = candidate
            return data
          }
        }
        throw new Error('Could not generate a free link code. Try again.')
      },
    ],
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'update' && originalDoc) data.code = originalDoc.code
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'destination',
      type: 'text',
      required: true,
      validate: ((value) => {
        const text = typeof value === 'string' ? value.trim() : ''
        if (!text) return 'Destination is required'
        return isRedirectableHttpsUrl(text) ? true : 'Enter a URL starting with https://'
      }) satisfies TextFieldSingleValidation,
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Off: the link shows the not-found page.' },
    },
    {
      name: 'code',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Random code. Printed QR codes use /go/<code>, so it never changes.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Optional readable alternative: /go/<slug>.' },
      hooks: {
        beforeDuplicate: [() => null],
        beforeValidate: [
          ({ value }) => {
            if (typeof value !== 'string') return null
            return value.trim().toLowerCase() || null
          },
        ],
      },
      validate: (async (value, { req, id }) => {
        if (typeof value !== 'string' || !value) return true
        if (!SLUG_RE.test(value)) return 'Use lowercase letters, numbers and single hyphens only'
        const { totalDocs } = await req.payload.count({
          collection: 'links',
          where: {
            and: [
              { or: [{ code: { equals: value } }, { slug: { equals: value } }] },
              ...(id ? [{ id: { not_equals: id } }] : []),
            ],
          },
          req,
        })
        return totalDocs === 0 ? true : 'Already used by another link'
      }) satisfies TextFieldSingleValidation,
    },
    {
      name: 'scanCount',
      type: 'number',
      defaultValue: 0,
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'lastScannedAt',
      type: 'date',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'qr',
      type: 'ui',
      admin: {
        components: {
          Field: { path: '/components/admin/QrPanel#QrPanel', clientProps: { kind: 'link' } },
        },
      },
    },
  ],
}
