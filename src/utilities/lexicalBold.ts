const BOLD_FORMAT = 1
const BOLD_PAIR = /\*\*([^*]+)\*\*/g

type LexicalNode = { type?: string; text?: string; format?: number; children?: LexicalNode[] }

export type BoldConversion<T> = {
  body: T
  /** Number of `**x**` pairs turned into bold text nodes. */
  converted: number
  /** Snippets of text nodes still holding a lone `**` that has no partner in the same node. */
  unmatched: string[]
}

/**
 * Legacy posts carry literal `**x**` in their text because the source markdown was
 * never rendered. Splits each such pair into its own bold text node (format bit 1,
 * OR'd into the node's existing format) and leaves every other node prop intact.
 * Pairs split across nodes, or a lone `**`, are reported rather than guessed at.
 * Idempotent: converted nodes no longer contain `**`.
 */
export function convertBoldMarkers<T>(body: T): BoldConversion<T> {
  const clone = structuredClone(body)
  const result: BoldConversion<T> = { body: clone, converted: 0, unmatched: [] }
  const root = (clone as { root?: LexicalNode } | null)?.root
  if (root) walk(root, result)
  return result
}

function walk(node: LexicalNode, result: BoldConversion<unknown>): void {
  if (!Array.isArray(node.children)) return
  const next: LexicalNode[] = []
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.text === 'string' && child.text.includes('**')) {
      next.push(...splitTextNode(child, result))
    } else {
      walk(child, result)
      next.push(child)
    }
  }
  node.children = next
}

function splitTextNode(node: LexicalNode, result: BoldConversion<unknown>): LexicalNode[] {
  const text = node.text as string
  const pieces: LexicalNode[] = []
  let cursor = 0
  for (const match of text.matchAll(BOLD_PAIR)) {
    const start = match.index
    if (start > cursor) pieces.push({ ...node, text: text.slice(cursor, start) })
    pieces.push({ ...node, text: match[1], format: (node.format ?? 0) | BOLD_FORMAT })
    result.converted += 1
    cursor = start + match[0].length
  }
  if (cursor < text.length) pieces.push({ ...node, text: text.slice(cursor) })
  if (pieces.length === 0) return [node]

  for (const piece of pieces) {
    if (piece.text?.includes('**')) {
      const at = piece.text.indexOf('**')
      result.unmatched.push(piece.text.slice(Math.max(0, at - 30), at + 32))
    }
  }
  return pieces
}
