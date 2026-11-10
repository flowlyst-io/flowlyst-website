import { describe, expect, it } from 'vitest'

import {
  SCHOOL_FAQ,
  STATES_COUNT,
  TRAINED_STATES,
  TRAINING_RESULTS,
  TRAINING_VENUES,
} from '@/content/training'
import { buildFaqPageSchema } from '@/utilities/faqSchema'
import { serializeJsonLd } from '@/utilities/jsonLd'

const QUESTIONS = [
  'Who offers AI training for school business office staff?',
  'Do you train in my state?',
  'What does a session cover?',
  'Is it hands-on?',
  'How is sensitive employee data handled?',
]

describe('training content', () => {
  it('lists 16 unique states and 5 venues', () => {
    expect(TRAINED_STATES).toHaveLength(16)
    expect(new Set(TRAINED_STATES).size).toBe(16)
    expect(STATES_COUNT).toBe(16)
    expect(TRAINING_VENUES).toHaveLength(5)
  })

  it('states the 86% figure as the rounded 583 of 675', () => {
    expect(Math.round((583 / 675) * 100)).toBe(TRAINING_RESULTS.improvedPct)
    expect(TRAINING_RESULTS.improved).toBe(583)
    expect(TRAINING_RESULTS.surveyed).toBe(675)
  })

  it('carries the 98% positive feedback figure', () => {
    expect(TRAINING_RESULTS.positiveFeedbackPct).toBe(98)
  })

  it('keeps the five FAQ questions verbatim and in order', () => {
    expect(SCHOOL_FAQ.map((f) => f.question)).toEqual(QUESTIONS)
  })

  it('builds a FAQPage whose entries equal the source', () => {
    const schema = buildFaqPageSchema(SCHOOL_FAQ)
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity).toHaveLength(5)
    schema.mainEntity.forEach((q, i) => {
      expect(q.name).toBe(SCHOOL_FAQ[i].question)
      expect(q.acceptedAnswer.text).toBe(SCHOOL_FAQ[i].answer)
    })
  })

  it('has no capitalised brand, price, Chicago-based claim or satisfaction claim in the FAQ', () => {
    for (const { question, answer } of SCHOOL_FAQ) {
      for (const text of [question, answer]) {
        expect(text).not.toMatch(/Flowlyst/)
        expect(text).not.toMatch(/\$\d/)
        expect(text).not.toMatch(/Chicago-based|based in Chicago/i)
        expect(text).not.toMatch(/satisfaction/i)
      }
    }
  })

  it('escapes < in serialized FAQ JSON-LD', () => {
    const out = serializeJsonLd(buildFaqPageSchema([{ question: '</script>', answer: 'x' }]))
    expect(out).not.toContain('<')
  })
})
