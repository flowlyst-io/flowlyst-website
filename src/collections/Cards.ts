import type { CollectionConfig, UploadFieldSingleValidation } from 'payload'
import { validations } from 'payload/shared'

import { isAdminOrEditor } from '@/access'
import { validateHttpsURL } from '@/fields/validators'
import { formatSlug } from '@/utilities/formatSlug'
import { normalizeCrop } from '@/utilities/headshotCropShared'
import { randomCode } from '@/utilities/randomCode'

const photoStillExists: UploadFieldSingleValidation = async (value, options) => {
  const base = await validations.upload(value, options)
  if (base !== true) return base
  const { req } = options
  if (value === null || value === undefined || value === '') return true
  const id = typeof value === 'object' ? (value as { id?: number | string }).id : value
  if (typeof id !== 'number' && typeof id !== 'string') return true
  if (id === '') return true
  const found = await req.payload.findByID({
    collection: 'media',
    id,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    req,
  })
  return found ? true : 'This photo was deleted. Remove it and choose another.'
}

/** Digital contact cards served at /card/<slug>. The random suffix keeps the URL unguessable. */
export const Cards: CollectionConfig = {
  slug: 'cards',
  labels: { singular: 'Contact card', plural: 'Contact cards' },
  admin: { group: 'Links & Cards', useAsTitle: 'name' },
  access: {
    read: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        // Always server-made: a client-supplied slug (REST, Duplicate) is ignored.
        if (operation === 'create' && data) {
          data.slug = `${formatSlug(String(data.name ?? '')) || 'card'}-${randomCode(6)}`
        }
        if (data) {
          const emptyCrop = { zoom: null, x: null, y: null, aspect: null }
          if ('headshot' in data && !data.headshot) {
            data.headshotCrop = emptyCrop
          } else if (data.headshotCrop !== undefined) {
            // Clamp rather than validate, so a bad value can never break the page or the vCard.
            data.headshotCrop = normalizeCrop(data.headshotCrop) ?? emptyCrop
          }
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'update' && originalDoc) data.slug = originalDoc.slug
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'title', type: 'text' },
    {
      name: 'headshot',
      type: 'upload',
      relationTo: 'media',
      // A photo deleted after it was picked (another tab, or the pencil drawer) would otherwise fail
      // on the foreign key at Save with a bare 500.
      validate: photoStillExists,
    },
    {
      name: 'headshotCrop',
      type: 'group',
      admin: {
        disableBulkEdit: true,
        disableListColumn: true,
        disableListFilter: true,
        components: { Field: { path: '/components/admin/HeadshotCropField#HeadshotCropField' } },
      },
      fields: [
        { name: 'zoom', type: 'number' },
        { name: 'x', type: 'number' },
        { name: 'y', type: 'number' },
        { name: 'aspect', type: 'number' },
      ],
    },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'linkedIn', type: 'text', label: 'LinkedIn URL', validate: validateHttpsURL },
    {
      name: 'website',
      type: 'text',
      defaultValue: 'https://flowlyst.io',
      validate: validateHttpsURL,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Set on creation and never changes, so a printed code keeps working.',
      },
    },
    {
      name: 'qr',
      type: 'ui',
      admin: {
        components: {
          Field: { path: '/components/admin/QrPanel#QrPanel', clientProps: { kind: 'card' } },
        },
      },
    },
  ],
}
