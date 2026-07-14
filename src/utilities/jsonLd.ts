/**
 * Serialize an object as a JSON-LD string that is safe to inject through
 * `dangerouslySetInnerHTML` inside a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` does not escape `<`, so a string value containing `</script>`
 * — e.g. an editor-authored case-study or blog title — would close the script
 * element early and let the remaining markup execute (stored XSS). Escaping every
 * `<` to its JSON unicode form keeps the output valid JSON while making `</script>`
 * (and `<!--`) inert.
 *
 * Shared across every page that emits schema.org structured data from CMS content.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
