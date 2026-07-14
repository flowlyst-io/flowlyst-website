import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import type { CaseStudy } from '@/payload-types'

/**
 * Renders a Case Study Lexical rich-text field (intro / challenge / solution /
 * results) as long-form reader copy, styled to match the settled blog-post reader
 * shell (design/site/pages.jsx `BlogPostPage`): body paragraphs at 17px / 1.7 on
 * `--c-ink`, headings as the design's visual `.h3` / `.h4`, comfortable list spacing.
 *
 * Local to this route on purpose. The parallel blog lane needs the same treatment
 * and would collide on a shared component file; folding the two into one shared
 * RichText wrapper is a welcome later refactor (mirrors the issue #1 revalidation
 * note). No invented values — sizes/spacing come from the design source, colors
 * from design-system tokens.
 */

// The four body fields share this generated shape. It is the structural equivalent
// of Lexical's `SerializedEditorState` (the generated type is looser — `type: any`
// children, an index signature), so one documented cast at the boundary is honest.
type CaseStudyRichText = NonNullable<CaseStudy['intro']>

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel'])

// Only these schemes may become a live `href`. Editor rich text is API-postable, so
// the default Lexical link converter — which renders `node.fields.url` verbatim —
// would turn a `javascript:` (or `data:`, `vbscript:`) URL into a live XSS anchor.
// A URL with no scheme (relative path, `#fragment`, `?query`) is safe. Schemes are
// matched by exact allowlist, so anything obfuscated (`JavaScript:`, `java\tscript:`)
// is rejected by default.
function isSafeHref(href: unknown): href is string {
  if (typeof href !== 'string') return false
  const value = href.trim()
  if (!value) return false
  const colon = value.indexOf(':')
  const pathStart = value.search(/[/?#]/)
  // No scheme before the first path/query/fragment delimiter → relative → safe.
  if (colon === -1 || (pathStart !== -1 && pathStart < colon)) return true
  return SAFE_SCHEMES.has(value.slice(0, colon).toLowerCase())
}

// A link/autolink node's resolvable, scheme-safe href, or null to neutralize it
// (keep the anchor text, drop the anchor). Internal links have no resolver configured
// here, so they are treated as plain text rather than dead `#` anchors.
function safeLinkHref(node: {
  fields?: { url?: string | null; linkType?: string | null } | null
}): string | null {
  if (node.fields?.linkType === 'internal') return null
  return isSafeHref(node.fields?.url) ? node.fields.url : null
}

function SanitizedLink({
  node,
  children,
}: {
  node: {
    fields?: { url?: string | null; linkType?: string | null; newTab?: boolean | null } | null
  }
  children: React.ReactNode
}) {
  const href = safeLinkHref(node)
  if (!href) return <>{children}</>
  const newTab = node.fields?.newTab
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  )
}

export function RichTextBody({ data }: { data: CaseStudyRichText }) {
  return (
    <RichText
      data={data as unknown as SerializedEditorState}
      disableContainer
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        paragraph: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          if (!children?.length) return null
          return (
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', margin: '0 0 24px' }}>
              {children}
            </p>
          )
        },
        heading: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          // Never emit an <h1> from body copy — the page's single H1 is the story
          // title. Body headings sit under a section's <h2>, so keeping the author's
          // relative level (clamped to h2+) never skips a heading level.
          const level = node.tag === 'h1' ? 2 : Number(node.tag.slice(1))
          const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
          const visual = level <= 2 ? 'h3' : 'h4'
          return (
            <Tag className={visual} style={{ margin: '40px 0 16px' }}>
              {children}
            </Tag>
          )
        },
        list: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          const Tag = node.tag
          return (
            <Tag
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: 'var(--c-ink)',
                margin: '0 0 24px',
                paddingLeft: 24,
              }}
            >
              {children}
            </Tag>
          )
        },
        // Sanitize link schemes: an unsafe href (e.g. `javascript:`) renders as plain
        // text (anchor dropped), a safe one as a normal anchor. Covers both node types.
        link: ({ node, nodesToJSX }) => (
          <SanitizedLink node={node}>{nodesToJSX({ nodes: node.children })}</SanitizedLink>
        ),
        autolink: ({ node, nodesToJSX }) => (
          <SanitizedLink node={node}>{nodesToJSX({ nodes: node.children })}</SanitizedLink>
        ),
      })}
    />
  )
}
