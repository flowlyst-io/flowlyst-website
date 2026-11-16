/**
 * Consent rules shared by the proxy (server) and the client island, kept free of
 * imports so neither side pulls the other's dependencies (docs/conventions.md).
 */

export const REGION_COOKIE = 'fl_consent_region'

export type ConsentRegion = 'opt-in' | 'opt-out'

export type ConsentChoice = 'accepted' | 'declined' | 'acknowledged'

// Every country not listed here counts as opt-out, so a country is missing from this set
// only on purpose. `EU` and `UK` are not ISO codes; they are listed in case a geo source
// emits them, so the visitor fails closed.
export const OPT_IN_COUNTRIES: ReadonlySet<string> = new Set([
  ...['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE'],
  ...['IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
  ...['IS', 'LI', 'NO', 'GB', 'CH'],
  ...['GF', 'GP', 'MQ', 'RE', 'YT', 'MF', 'AX', 'GI', 'GG', 'JE', 'IM'],
  ...['EU', 'UK'],
])

/** `opt-out` only for a real two-letter country outside the opt-in set; else `opt-in`. */
export function regionForCountry(header: string | null): ConsentRegion {
  const code = header?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return 'opt-in'
  return OPT_IN_COUNTRIES.has(code) ? 'opt-in' : 'opt-out'
}

export type ConsentState = {
  choice: ConsentChoice | null
  region: ConsentRegion
  gpc: boolean
}

/**
 * Whether analytics is counted and which banner shows on load. A Global Privacy Control
 * signal beats every stored choice in every region.
 */
export function decide({ choice, region, gpc }: ConsentState): {
  counted: boolean
  banner: ConsentRegion | null
} {
  if (gpc) return { counted: false, banner: null }
  if (choice === 'accepted') return { counted: true, banner: null }
  if (choice === 'declined') return { counted: false, banner: null }
  if (region === 'opt-out') return { counted: true, banner: choice === null ? 'opt-out' : null }
  return { counted: false, banner: 'opt-in' }
}

export type BannerVariant = ConsentRegion | 'gpc'

/** The banner the footer's Cookie settings control opens. */
export function bannerVariant(region: ConsentRegion, gpc: boolean): BannerVariant {
  return gpc ? 'gpc' : region
}
