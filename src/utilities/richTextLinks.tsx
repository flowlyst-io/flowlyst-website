import React from 'react'

/**
 * Link-scheme sanitization for Lexical rich-text converters, shared by every page
 * that renders CMS body copy (case studies, blog posts). Extracted from the
 * case-studies RichTextBody (#65) so the security-critical logic lives in one place
 * — reviewer-65 flagged the carry-forward duplication when the blog lane needed the
 * same defense. Behavior is identical to the original; both suites prove it.
 */

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel'])

// Only these schemes may become a live `href`. Editor rich text is API-postable, so
// the default Lexical link converter — which renders `node.fields.url` verbatim —
// would turn a `javascript:` (or `data:`, `vbscript:`) URL into a live XSS anchor.
// A URL with no scheme (relative path, `#fragment`, `?query`) is safe. Schemes are
// matched by exact allowlist, so anything obfuscated (`JavaScript:`, `java\tscript:`)
// is rejected by default.
export function isSafeHref(href: unknown): href is string {
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
export function safeLinkHref(node: {
  fields?: { url?: string | null; linkType?: string | null } | null
}): string | null {
  if (node.fields?.linkType === 'internal') return null
  return isSafeHref(node.fields?.url) ? node.fields.url : null
}

export function SanitizedLink({
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
