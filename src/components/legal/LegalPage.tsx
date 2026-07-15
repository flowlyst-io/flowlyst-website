import React from 'react'
import Link from 'next/link'

import { LEGAL_NAV, type LegalBlock, type LegalDoc } from '@/content/legal/types'

/**
 * Shared shell for the three legal pages (design/site/pages.jsx → `LegalPage`), issue
 * #22. Server component — every legal word ships in the crawlable HTML (invariant a).
 * The layout owns Nav/Footer/main and the site-wide Organization JSON-LD; this renders
 * only the sticky left TOC (cross-navigation between the three documents) and the
 * content column, faithful to the comp.
 *
 * Two deliberate deviations from the comp, both documented:
 *  - Small text (the inactive TOC links and the "last updated" caption) uses
 *    `--c-ink-2`, not the comp's `--c-ink-3`. `--c-ink-3` (~3.44:1) is a known AA
 *    contrast fail parked on #70; reproducing it would ship a fresh AA fail on new
 *    text. `--c-ink-2` is a design-system token that clears AA — the same
 *    AA-driven-deviation-from-comp the About page already took. Tokens are not touched.
 *  - The comp's single decorative "email us" cream box is dropped: each document now
 *    carries a real "Contact us" section, so the box would duplicate it.
 *
 * `[FOR TURAL]` gaps render as visibly-distinct notes so they are unmistakable when
 * Tural reviews the staging pages; every one is also listed in the PR body.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <section className="legal">
      <div className="container">
        <div className="legal__grid">
          <aside className="legal__nav">
            <div className="eyebrow mb-24">Legal</div>
            <ul className="legal__toc">
              {LEGAL_NAV.map(({ key, label, href }) => {
                const active = key === doc.doc
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`legal__toc-link${active ? ' legal__toc-link--active' : ''}`}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="legal__updated">Last updated · {doc.lastUpdated}</div>
          </aside>

          <div className="legal__body">
            <h1 className="h1 legal__title">{doc.title}</h1>
            <p className="lead legal__lead">{doc.sub}</p>

            <div className="legal__draft" role="note">
              <strong>Draft — pending legal review.</strong> This copy is a working draft built from
              flowlyst’s actual data practices. Items marked “Needs Tural’s input” below flag facts
              that require confirmation or legal counsel before this page is published.
            </div>

            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="legal__section">
                {/* Semantic h2 (visual h3) keeps the page order h1 → h2 → h3 with no
                    skipped level (PRD §10.3); mirrors the About page's h2.h3 pattern. */}
                <h2 className="h3 legal__heading">{section.heading}</h2>
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="legal__p">{block.text}</p>
    case 'subheading':
      return <h3 className="legal__subheading">{block.text}</h3>
    case 'list':
      return (
        <ul className="legal__list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'flag':
      return (
        <div className="legal__flag" role="note">
          <span className="legal__flag-label">Needs Tural’s input</span>
          <span className="legal__flag-text">{block.text}</span>
        </div>
      )
  }
}
