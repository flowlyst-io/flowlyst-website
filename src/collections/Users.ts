import type { CollectionConfig } from 'payload'

import { adminOrSelf, isAdmin, isAdminFieldLevel } from '@/access'

/**
 * CMS users. PRD §9: two enforced roles — Admin (everything) and Editor
 * (content only). Enforcement lives here and in `@/access`:
 *
 * - Only Admins create/delete users; the collection is hidden from Editors.
 * - Users may edit their own profile, but the `role` field is locked to Admins,
 *   so an Editor can never self-escalate.
 * - The very first user (created via the bootstrap screen, before any Admin
 *   exists) is forced to Admin — otherwise nobody could administer anything.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Admin',
    // Editors never see the Users collection in the admin nav.
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    // Both roles may reach the admin panel; what they can *do* is scoped below.
    admin: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'editor',
    create: isAdmin,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      // Locked to Admins at the field level: even a self-update cannot change it.
      access: {
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
      admin: {
        description: 'Admin: full access, incl. users and settings. Editor: content only.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ req, operation, data }) => {
        // Bootstrap: the first-ever user must be an Admin regardless of what the
        // (unauthenticated) create-first-user form submitted.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users' })
          if (totalDocs === 0) {
            return { ...data, role: 'admin' }
          }
        }
        return data
      },
    ],
  },
}
