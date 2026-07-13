/**
 * Estimate reading time (minutes) from a Lexical rich-text value.
 *
 * PRD §9 lists "reading time" as a managed field on blog posts. Rather than ask
 * authors to compute it, we derive it from the body on save (words ÷ 200 wpm,
 * the common estimate). Defensive by design — a malformed tree yields 1 minute
 * rather than throwing during a save.
 */

type LexicalNode = {
  text?: unknown
  children?: unknown
}

const extractText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''
  const n = node as LexicalNode
  let text = typeof n.text === 'string' ? n.text : ''
  if (Array.isArray(n.children)) {
    for (const child of n.children) text += ' ' + extractText(child)
  }
  return text
}

/** Root is the Lexical value's `.root` node (i.e. `body?.root`). */
export const readingTimeMinutes = (root: unknown): number => {
  const words = extractText(root).trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
