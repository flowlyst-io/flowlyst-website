import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import type { BlogPost } from '@/payload-types'
import { SanitizedLink } from '@/utilities/richTextLinks'

/**
 * Renders a blog post's Lexical rich-text body as server HTML (RSC-safe — no client
 * JS). `RichText` emits bare `<p>` / `<h2>` / `<h3>` / `<ul>` with no styling; the
 * design (`design/site/pages.jsx` BlogPostPage) hand-styles every body element
 * inline, so these converters re-apply exactly those values — 17px/1.7 paragraphs
 * and the `.h3` / `.h4` display classes on subheads. Every value traces to the
 * design; none is invented (review invariant b).
 *
 * Lists: Tailwind's preflight resets `list-style: none` and drops list padding, so a
 * bare `<ul>`/`<ol>` renders with no markers or indent (ui-verifier #66). The list
 * converter restores `list-style` (disc / decimal) and the design's 24px indent so
 * bullets and numbers appear again.
 *
 * Links: authored rich text is API-postable, so link/autolink hrefs are run through
 * the shared `SanitizedLink` allowlist (`@/utilities/richTextLinks`) — a
 * `javascript:` / `data:` URL is neutralized to plain text, never a live anchor.
 *
 * Heading protection: the page's single `<h1>` is the post title (in the header),
 * so an author-entered `h1` in the body is demoted to `<h2>` — the body never
 * introduces a second H1, keeping the heading order valid (PRD §10.3).
 */

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

// className + margins per rendered level. h2 → visual .h3, h3+ → visual .h4, so the
// body's largest subhead sits a step below the page title, matching the design.
const HEADING_STYLE: Record<
  Exclude<HeadingTag, 'h1'>,
  { className: string; style: React.CSSProperties }
> = {
  h2: { className: 'h3', style: { marginTop: 32, marginBottom: 20 } },
  h3: { className: 'h4', style: { marginTop: 32, marginBottom: 12 } },
  h4: { className: 'h4', style: { marginTop: 24, marginBottom: 12 } },
  h5: { className: 'h4', style: { marginTop: 24, marginBottom: 12 } },
  h6: { className: 'h4', style: { marginTop: 24, marginBottom: 12 } },
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  paragraph: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    if (children.length === 0) return null
    return (
      <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 24 }}>
        {children}
      </p>
    )
  },
  heading: ({ node, nodesToJSX }) => {
    const requested: Exclude<HeadingTag, 'h1'> =
      node.tag === 'h1' ? 'h2' : (node.tag as HeadingTag as Exclude<HeadingTag, 'h1'>)
    const cfg = HEADING_STYLE[requested]
    return React.createElement(
      requested,
      { className: cfg.className, style: cfg.style },
      nodesToJSX({ nodes: node.children }),
    )
  },
  list: ({ node, nodesToJSX }) => {
    const Tag = node.tag // 'ul' | 'ol'
    return (
      <Tag
        style={{
          fontSize: 17,
          lineHeight: 1.7,
          color: 'var(--c-ink)',
          margin: '0 0 24px',
          // Restore the markers + indent that Tailwind preflight strips.
          paddingLeft: 24,
          listStyleType: Tag === 'ol' ? 'decimal' : 'disc',
          listStylePosition: 'outside',
        }}
      >
        {nodesToJSX({ nodes: node.children })}
      </Tag>
    )
  },
  listitem: ({ node, nodesToJSX }) => (
    <li style={{ margin: '0 0 8px' }}>{nodesToJSX({ nodes: node.children })}</li>
  ),
  // Sanitize link schemes (shared allowlist): an unsafe href (e.g. `javascript:`)
  // renders as plain text with the anchor dropped; a safe one as a normal anchor.
  link: ({ node, nodesToJSX }) => (
    <SanitizedLink node={node}>{nodesToJSX({ nodes: node.children })}</SanitizedLink>
  ),
  autolink: ({ node, nodesToJSX }) => (
    <SanitizedLink node={node}>{nodesToJSX({ nodes: node.children })}</SanitizedLink>
  ),
})

export function ArticleBody({ body }: { body: BlogPost['body'] }) {
  return <RichText data={body} converters={converters} disableContainer />
}
