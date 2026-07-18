/**
 * Content model for the three legal pages (/privacy, /terms, /cookies) — issue #22.
 *
 * Legal copy is static content authored in code, NOT a CMS collection: it changes on a
 * legal, not editorial, cadence and must be version-controlled and reviewed like code
 * (PRD §10.4; the brief). Each document is plain structured data rendered server-side
 * by `LegalPage`, so every word ships in the crawlable HTML (invariant a).
 *
 * `flag` blocks are the `[FOR TURAL]` gap markers: places where a real, accurate policy
 * needs a fact only Tural/counsel can supply (retention periods, entity/address,
 * governing law, DPO). They render VISIBLY and distinctly so the gaps are unmistakable
 * when Tural reviews the staging site, and every one is mirrored in the PR body. This
 * is a faithful DRAFT with flagged gaps — never an invented legal claim.
 */

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'flag'; text: string }

export type LegalSection = {
  /** Stable anchor id (also used as the React key). */
  id: string
  heading: string
  blocks: LegalBlock[]
}

export type LegalDocKey = 'privacy' | 'terms' | 'cookies'

export type LegalDoc = {
  doc: LegalDocKey
  /** Page H1. */
  title: string
  /** Lead paragraph under the H1. */
  sub: string
  /** Human-readable effective date shown in the sidebar (flagged pending sign-off). */
  lastUpdated: string
  sections: LegalSection[]
}

/** Sidebar cross-navigation between the three documents (the design's left TOC). */
export const LEGAL_NAV: { key: LegalDocKey; label: string; href: string }[] = [
  { key: 'privacy', label: 'Privacy policy', href: '/privacy' },
  { key: 'terms', label: 'Terms of service', href: '/terms' },
  { key: 'cookies', label: 'Cookie policy', href: '/cookies' },
]
