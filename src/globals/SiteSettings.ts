import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { validateURL } from '@/fields/validators'
import { revalidateSiteSettings } from '@/utilities/revalidate'

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
  hooks: {
    afterChange: [
      ({ req, doc }) => {
        revalidateSiteSettings(req)
        return doc
      },
    ],
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
      admin: {
        description:
          'The footer shows the LinkedIn entry as an icon; every entry feeds the Organization structured data. Leave empty to hide. The contact card shows the X, Instagram, Facebook and LinkedIn entries; a missing one is hidden.',
      },
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
    {
      name: 'founderLinkedIn',
      type: 'text',
      label: "Aziz's LinkedIn URL",
      validate: validateURL,
      admin: {
        description: "Shown on /about and in Aziz's structured data. Leave empty to hide.",
      },
    },
  ],
}
