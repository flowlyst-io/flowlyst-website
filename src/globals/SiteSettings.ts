import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { validateURL } from '@/fields/validators'

/**
 * Site-wide settings (PRD §9): footer copy, social links, contact email, and
 * hero copy. Editable by Admins only — Editors manage content, not settings —
 * and hidden from the Editor nav. Public-readable so the frontend can render it.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: {
    group: 'Admin',
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: anyone,
    update: isAdmin,
  },
  fields: [
    {
      name: 'contactEmail',
      type: 'email',
      admin: { description: 'Public contact address shown across the site.' },
    },
    {
      name: 'hero',
      type: 'group',
      label: 'Homepage hero',
      fields: [
        { name: 'headline', type: 'text' },
        { name: 'subheadline', type: 'textarea' },
      ],
    },
    {
      name: 'footerText',
      type: 'textarea',
      admin: { description: 'Copyright / footer blurb.' },
    },
    {
      name: 'socialLinks',
      type: 'array',
      labels: { singular: 'Social Link', plural: 'Social Links' },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'X / Twitter', value: 'twitter' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Instagram', value: 'instagram' },
          ],
        },
        { name: 'url', type: 'text', required: true, validate: validateURL },
      ],
    },
  ],
}
