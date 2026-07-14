import { expect, type APIRequestContext } from '@playwright/test'

/**
 * Dependency-free helpers for asserting against the *raw* server HTML — a plain
 * HTTP GET with no browser and no JS execution. This is the point: PRD §10.1
 * requires public pages to be server-rendered so Google and AI crawlers (GPTBot,
 * ClaudeBot, PerplexityBot, Google-Extended) receive crawlable HTML. If content or
 * metadata only appears after client hydration, assertions built on these helpers
 * fail — exactly as they should.
 *
 * These were first written inline in tests/e2e/home.e2e.spec.ts; extracted here so
 * per-page SEO specs can share the parsing without duplicating it. The home spec
 * keeps its own local copies (owned by the homepage work) — this module is used by
 * the newer specs.
 */

/** GET a path and return its HTML body, asserting a 200 text/html response. */
export async function fetchHtml(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path)
  expect(res.status(), `GET ${path} must return 200`).toBe(200)
  const ct = res.headers()['content-type'] ?? ''
  expect(ct, `GET ${path} must serve HTML`).toMatch(/text\/html/i)
  return res.text()
}

/** Extract the text of the first <title>. */
export function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : null
}

/** Value of a named <meta name="..." content="..."> (attribute order agnostic). */
export function getMetaContent(html: string, name: string): string | null {
  const tagRe = /<meta\b[^>]*>/gi
  for (const tag of html.match(tagRe) ?? []) {
    const nameM = tag.match(/\bname=["']([^"']*)["']/i)
    if (nameM && nameM[1].toLowerCase() === name.toLowerCase()) {
      const contentM = tag.match(/\bcontent=["']([\s\S]*?)["']/i)
      return contentM ? contentM[1].trim() : null
    }
  }
  return null
}

/** Value of an OpenGraph-style <meta property="og:..." content="..."> tag. */
export function getMetaProperty(html: string, property: string): string | null {
  const tagRe = /<meta\b[^>]*>/gi
  for (const tag of html.match(tagRe) ?? []) {
    const propM = tag.match(/\bproperty=["']([^"']*)["']/i)
    if (propM && propM[1].toLowerCase() === property.toLowerCase()) {
      const contentM = tag.match(/\bcontent=["']([\s\S]*?)["']/i)
      return contentM ? contentM[1].trim() : null
    }
  }
  return null
}

/** href values of every <link rel="canonical"> (there should be exactly one). */
export function getCanonicals(html: string): string[] {
  const tagRe = /<link\b[^>]*>/gi
  const out: string[] = []
  for (const tag of html.match(tagRe) ?? []) {
    const relM = tag.match(/\brel=["']([^"']*)["']/i)
    if (relM && relM[1].toLowerCase() === 'canonical') {
      const hrefM = tag.match(/\bhref=["']([^"']*)["']/i)
      if (hrefM) out.push(hrefM[1].trim())
    }
  }
  return out
}

export type JsonLdNode = Record<string, unknown> & {
  '@type'?: string | string[]
  '@context'?: unknown
}

/**
 * Parse every <script type="application/ld+json"> block and flatten into a list of
 * nodes, each tagged with the effective @context inherited from its wrapper (a node
 * inside an @graph or array does not repeat @context). Throws on malformed JSON —
 * so simply calling this asserts every block parses.
 */
export function collectJsonLdNodes(html: string): Array<{ node: JsonLdNode; context: unknown }> {
  const blockRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const out: Array<{ node: JsonLdNode; context: unknown }> = []
  for (const m of html.matchAll(blockRe)) {
    const parsed = JSON.parse(m[1].trim())
    const roots = Array.isArray(parsed) ? parsed : [parsed]
    for (const root of roots) {
      const context = (root as JsonLdNode)['@context']
      const graph = (root as { '@graph'?: unknown })['@graph']
      const nodes = Array.isArray(graph) ? graph : [root]
      for (const node of nodes) {
        out.push({ node: node as JsonLdNode, context: (node as JsonLdNode)['@context'] ?? context })
      }
    }
  }
  return out
}

/** Whether a JSON-LD node's @type is (or includes) the given type. */
export function typeMatches(node: JsonLdNode, type: string): boolean {
  const t = node['@type']
  return Array.isArray(t) ? t.includes(type) : t === type
}
