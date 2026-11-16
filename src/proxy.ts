import { NextResponse, type NextRequest } from 'next/server'

import { REGION_COOKIE, regionForCountry } from '@/utilities/consentShared'

/**
 * Records which cookie banner applies to the visitor, from Vercel's country header, in a
 * session cookie the client island reads. Reading the header here rather than in a page
 * keeps every public page static: the cookie rides on the response, not in the HTML.
 */
export function proxy(request: NextRequest) {
  const region = regionForCountry(request.headers.get('x-vercel-ip-country'))
  const response = NextResponse.next()
  if (request.cookies.get(REGION_COOKIE)?.value !== region) {
    response.cookies.set(REGION_COOKIE, region, {
      path: '/',
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    })
  }
  return response
}

// Skips the admin, the API, contact cards and the /go redirect (no banner there), build
// assets and any path with a dot. Excluded words end at a segment boundary so a
// look-alike such as /cards still gets the cookie.
export const config = {
  matcher: [
    {
      source: '/((?!(?:api|admin|card|go)(?:/|$)|_next/|opengraph-image|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
