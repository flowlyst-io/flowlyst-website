import type { BlogPost } from '@/payload-types'

/**
 * Pure display helpers shared by the blog index (`/blog`) and the article reader
 * (`/blog/[slug]`). No React, no data fetching — just formatting, so both server
 * components render identical strings. Every visible value maps to the design
 * (`design/site/pages.jsx` BlogIndexPage / BlogPostPage); nothing invented.
 */

export type BlogCategory = BlogPost['serviceCategory']

/**
 * Human label for a serviceCategory. The enum is the authoritative data model
 * (`src/collections/BlogPosts.ts`) — these four values, matching the design's chip
 * row (All + AI Training, Budget Software, Consulting, General). "Consulting" was
 * added in #20 so legacy consulting posts can be tagged; the chip is now a live
 * filter, not a dead one.
 */
const CATEGORY_LABELS: Record<BlogCategory, string> = {
  'ai-training': 'AI Training',
  'budget-software': 'Budget Software',
  consulting: 'Consulting',
  general: 'General',
}

export function categoryLabel(category: BlogCategory): string {
  return CATEGORY_LABELS[category] ?? 'General'
}

/**
 * Display date, e.g. "Apr 22, 2026" (design byline format). Formatted in UTC so the
 * output is deterministic regardless of the server's timezone — publishedAt is a
 * point in time and we render its calendar date, not a locale-shifted one. Falls
 * back to createdAt when publishedAt is unset (drafts never reach the public pages).
 */
export function formatPostDate(post: Pick<BlogPost, 'publishedAt' | 'createdAt'>): string {
  const iso = post.publishedAt ?? post.createdAt
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

/**
 * The small green uppercase eyebrow on cards: "AI Training · 6 min" (design tag).
 * Reading time is auto-computed on save (BlogPosts beforeChange) and is >= 1; when
 * somehow absent the category label stands alone.
 */
export function postTag(post: Pick<BlogPost, 'serviceCategory' | 'readingTime'>): string {
  const label = categoryLabel(post.serviceCategory)
  return post.readingTime ? `${label} · ${post.readingTime} min` : label
}
