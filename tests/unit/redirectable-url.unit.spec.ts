import { describe, expect, it } from 'vitest'
import { isRedirectableHttpsUrl } from '../../src/fields/validators'

describe('isRedirectableHttpsUrl', () => {
  it.each(['https://x.example', 'https://x.example/a?b=1#c'])('accepts %s', (v) => {
    expect(isRedirectableHttpsUrl(v)).toBe(true)
  })

  it.each([
    'https:evil.example',
    'HTTPS://UPPER.example',
    'https://user:pw@host.example',
    'https://user@host.example',
    ' https://x.example',
    'https://x.example ',
    'http://x.example',
    'javascript:alert(1)',
    'https://',
    '',
  ])('rejects %j', (v) => {
    expect(isRedirectableHttpsUrl(v)).toBe(false)
  })
})
