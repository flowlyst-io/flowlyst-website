import React from 'react'

import type { Testimonial } from '@/payload-types'

import { SectionHead } from './SectionHead'

type Props = {
  testimonials: ReadonlyArray<Testimonial>
  testid: string
  eyebrow: string
  title: React.ReactNode
}

// Attribution is initials plus organization (state or descriptor) only; `roleTitle`
// is deliberately never shown so a quote cannot identify a person.
function attribution(t: Testimonial): string {
  return t.organization ? `${t.clientName} · ${t.organization}` : t.clientName
}

export function TrainingTestimonials({ testimonials, testid, eyebrow, title }: Props) {
  if (testimonials.length === 0) return null

  return (
    <section className="section section--sage" data-testid={testid}>
      <div className="container">
        <SectionHead eyebrow={eyebrow} title={title} />
        <div className="grid-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="card" style={{ margin: 0 }}>
              <blockquote className="p" style={{ margin: '0 0 20px' }}>
                {t.quote}
              </blockquote>
              <figcaption
                style={{
                  fontSize: 13,
                  color: 'var(--c-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  fontWeight: 800,
                }}
              >
                {attribution(t)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
