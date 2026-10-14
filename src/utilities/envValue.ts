/**
 * An env value with surrounding whitespace removed, or undefined when unset or
 * whitespace-only. Values pasted into the Vercel dashboard routinely carry a stray
 * space or newline, which silently breaks auth headers and recipient addresses.
 */
export function envValue(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}
