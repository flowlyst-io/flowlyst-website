import type { Field } from 'payload'

/**
 * SEO / social metadata group, reused by blog posts and case studies.
 *
 * Decision: a hand-rolled field group rather than `@payloadcms/plugin-seo`.
 * PRD §9 only requires SEO meta + an OG image per document; a small group keeps
 * the dependency surface minimal and the schema explicit. Swap in the plugin
 * later if authors want live previews/scoring — the field names below
 * (`meta.title`, `meta.description`, `meta.ogImage`) match its conventions.
 */
export const seoFields: Field = {
  name: 'meta',
  type: 'group',
  label: 'SEO & Social',
  admin: {
    description: 'Controls the page <title>, meta description, and social share image.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Overrides the <title> tag. Falls back to the post title. ~60 chars.' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Meta description / social summary. Falls back to the excerpt. ~155 chars.',
      },
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Open Graph image',
      admin: { description: 'Image used when the page is shared on social. Ideally 1200×630.' },
    },
  ],
}
