import { describe, expect, it } from 'vitest'

import { convertBoldMarkers } from '@/utilities/lexicalBold'

type TextNode = ReturnType<typeof textNode>

const textNode = (text: string, format = 0) => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})
const doc = (...texts: TextNode[]) => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: texts }],
  },
})
const nodes = (d: ReturnType<typeof doc>) => d.root.children[0].children as TextNode[]
const summary = (d: ReturnType<typeof doc>) => nodes(d).map((n) => [n.text, n.format])

describe('convertBoldMarkers', () => {
  it('splits a simple pair into plain + bold + plain nodes', () => {
    const { body, converted } = convertBoldMarkers(doc(textNode('Intro **Bold:** text')))
    expect(summary(body)).toEqual([
      ['Intro ', 0],
      ['Bold:', 1],
      [' text', 0],
    ])
    expect(converted).toBe(1)
  })

  it('handles two pairs in one node', () => {
    const { body, converted } = convertBoldMarkers(doc(textNode('**a** and **b**')))
    expect(summary(body)).toEqual([
      ['a', 1],
      [' and ', 0],
      ['b', 1],
    ])
    expect(converted).toBe(2)
  })

  it('handles a pair at the start and at the end without empty nodes', () => {
    expect(summary(convertBoldMarkers(doc(textNode('**Lead** rest'))).body)).toEqual([
      ['Lead', 1],
      [' rest', 0],
    ])
    expect(summary(convertBoldMarkers(doc(textNode('rest **tail**'))).body)).toEqual([
      ['rest ', 0],
      ['tail', 1],
    ])
  })

  it('ORs bold into an existing italic format and keeps other props', () => {
    const { body } = convertBoldMarkers(doc({ ...textNode('x **y** z', 2), style: 'color: red' }))
    expect(nodes(body).map((n) => n.format)).toEqual([2, 3, 2])
    expect(nodes(body).every((n) => n.style === 'color: red' && n.mode === 'normal')).toBe(true)
  })

  it('leaves an unmatched ** untouched and reports it', () => {
    const { body, converted, unmatched } = convertBoldMarkers(doc(textNode('price is **TBD')))
    expect(summary(body)).toEqual([['price is **TBD', 0]])
    expect(converted).toBe(0)
    expect(unmatched).toEqual(['price is **TBD'])
  })

  it('is idempotent and does not mutate its input', () => {
    const input = doc(textNode('**a** b'))
    const first = convertBoldMarkers(input)
    expect(nodes(input)).toHaveLength(1)
    const second = convertBoldMarkers(first.body)
    expect(second.converted).toBe(0)
    expect(second.body).toEqual(first.body)
  })
})
