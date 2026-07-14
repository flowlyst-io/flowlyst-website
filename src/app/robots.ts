import type { MetadataRoute } from 'next'

import { getServerURL } from '@/utilities/serverURL'

/**
 * robots.txt (`/robots.txt`, PRD §10.1; review invariant a). Two things it must get
 * right:
 *
 * 1. AI crawlers are EXPLICITLY allowed. PRD §10.1 is a hard invariant — GPTBot,
 *    ClaudeBot, PerplexityBot, and Google-Extended must NOT be blocked. They get
 *    their own allow group so the intent is unmistakable in the served file, and so
 *    the site keeps surfacing in AI-assistant answers (a core goal, PRD §1).
 * 2. Non-content surfaces stay out of the index: the Payload admin (`/admin`), the
 *    REST / GraphQL API (`/api`), and the draft-mode preview route (`/preview`).
 *
 * A robots.txt crawler obeys only its single most-specific matching user-agent group
 * and does NOT inherit rules from `*`. So the named AI-crawler group repeats the same
 * disallows: without them, naming GPTBot to allow it would silently drop its `/admin`
 * (etc.) protection, since it would then match only its own group.
 */

// Surfaces that must never be indexed — repeated in every group (see note above).
const DISALLOW = ['/admin', '/api', '/preview']

// The AI crawlers PRD §10.1 names explicitly. Allowed with the same disallows as `*`.
const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

export default function robots(): MetadataRoute.Robots {
  const base = getServerURL()
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
