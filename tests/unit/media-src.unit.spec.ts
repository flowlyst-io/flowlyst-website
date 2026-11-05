import { describe, it, expect } from 'vitest'

import { withMediaVersion } from '@/utilities/mediaSrc'

const T = '2026-11-02T21:17:35.137Z'

describe('withMediaVersion', () => {
  it('appends an encoded v= to a bare path', () => {
    expect(withMediaVersion('/a.jpg', T)).toBe('/a.jpg?v=2026-11-02T21%3A17%3A35.137Z')
  })

  it('uses & when the URL already has a query', () => {
    expect(withMediaVersion('/a.jpg?x=1', T)).toBe('/a.jpg?x=1&v=2026-11-02T21%3A17%3A35.137Z')
  })

  it.each([null, '', undefined])('leaves the URL alone for %j', (value) => {
    expect(withMediaVersion('/a.jpg', value)).toBe('/a.jpg')
  })
})
