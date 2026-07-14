import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Testimonial } from '@/payload-types'
import { FinalCTA } from '@/components/FinalCTA'

/**
 * Testimonials index (`/testimonials`, issue #18, PRD §7) — a filterable, CMS-driven
 * list of published testimonials, built against the settled design
 * `design/site/pages.jsx` → `TestimonialsPage` (Direction C), composed with the
 * frontend layout's Nav/Footer chrome. Replaces the previously-broken footer link.
 *
 * Server-rendered (review invariant a): the bare `/testimonials` route renders every
 * published testimonial into the initial HTML with no client-only content, so crawlers
 * see the full list. Filtering is done with plain URL links (the filter chips are
 * `<Link>`s that set `?service=` / `?role=` searchParams) — no client JS. Reading
 * `searchParams` makes the route render dynamically per request, which is the only way
 * to server-render a filtered view; the on-demand revalidation hook in
 * `src/collections/Testimonials.ts` keeps this and the other testimonial consumers
 * fresh (issue #1 "content revalidation mechanism" decision).
 *
 * Two design-vs-schema calls, both adjudicated on issue #18:
 *  - Keynotes is a first-class service category: `keynotes` was added to the
 *    `serviceCategory` enum (additive `ADD VALUE` migration) and its chip renders per the
 *    design. Service chips are rendered from the enum's own labels, so every category —
 *    including the catch-all General — is filter-reachable.
 *  - The second axis is role-only ("By role" in the Direction C design). The design's
 *    role chips ("CFO / Business Manager", …) are curated buckets over free-text roles
 *    that the comp never wires to data, so the chips are derived from the distinct
 *    `roleTitle` values actually present in the published set and filtered by exact
 *    match; `industry` stays admin metadata with no page-facing filter.
 */

const CANONICAL_PATH = '/testimonials'

const PAGE_TITLE = 'Testimonials — what K–12 districts say about flowlyst'
const PAGE_DESCRIPTION =
  'District leaders in their own words — filterable by service and role. Real testimonials from K–12 public school districts using flowlyst software, training, and consulting.'

// Static metadata: the title/description and canonical never vary by filter, so every
// `?service=` / `?role=` variation points its canonical at the bare `/testimonials`
// path (no duplicate-content splintering across filter combinations). [PRD §10.1]
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_PATH,
    siteName: 'flowlyst',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

// Service filter vocabulary — the `serviceCategory` select's own options and labels
// (src/collections/Testimonials.ts), never invented. All four are shown, including
// General, so every category is filter-reachable.
type ServiceValue = NonNullable<Testimonial['serviceCategory']>

const SERVICE_OPTIONS: ReadonlyArray<{ value: ServiceValue; label: string }> = [
  { value: 'ai-training', label: 'AI Training' },
  { value: 'budget-software', label: 'Budget Software' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'keynotes', label: 'Keynotes' },
  { value: 'general', label: 'General' },
]

const SERVICE_LABEL: Record<ServiceValue, string> = Object.fromEntries(
  SERVICE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ServiceValue, string>

type SearchParams = { [key: string]: string | string[] | undefined }

/** Repeated params arrive as arrays; take the first value, treat blanks as absent. */
function firstParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v && v.length > 0 ? v : undefined
}

/**
 * Build a `/testimonials` href from the currently-active (already-validated) filters,
 * merging in a patch. A patch value of `null` clears that dimension (the "All" chip);
 * an omitted key preserves the current value — so toggling one dimension never drops
 * the other (clicking a role chip with a service active yields `?service=x&role=y`).
 */
function buildHref(
  current: { service?: string; role?: string },
  patch: { service?: string | null; role?: string | null },
): string {
  const service = 'service' in patch ? (patch.service ?? undefined) : current.service
  const role = 'role' in patch ? (patch.role ?? undefined) : current.role
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (role) params.set('role', role)
  const qs = params.toString()
  return qs ? `${CANONICAL_PATH}?${qs}` : CANONICAL_PATH
}

// Attribution: role · organization; falls back to the client name when both are blank
// (matches the homepage / budget page attribution form).
function primaryName(t: Testimonial): string {
  return t.roleTitle?.trim() || t.clientName
}

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const requestedService = firstParam(params.service)
  const requestedRole = firstParam(params.role)

  const payload = await getPayload({ config })

  // Public read: `overrideAccess: false` applies `publishedOrStaff`, so anonymous
  // requests never see drafts. The whole published set is fetched (deterministic
  // order) — the full set is needed to derive the role chips and is filtered
  // in-memory below, keeping the crawlable bare route showing everything. depth:1
  // populates the `photo` upload so its alt text is available.
  const result = await payload.find({
    collection: 'testimonials',
    where: { status: { equals: 'published' } },
    overrideAccess: false,
    depth: 1,
    limit: 200,
    sort: '-createdAt',
  })
  const all = result.docs

  // Validate the requested filters against real values so junk params can't produce a
  // spurious empty state or leak into chip hrefs.
  const serviceFilter = SERVICE_OPTIONS.some((o) => o.value === requestedService)
    ? (requestedService as ServiceValue)
    : undefined

  const roles = Array.from(
    new Set(all.map((t) => t.roleTitle?.trim()).filter((r): r is string => Boolean(r))),
  ).sort((a, b) => a.localeCompare(b))
  const roleFilter = requestedRole && roles.includes(requestedRole) ? requestedRole : undefined

  const current = { service: serviceFilter, role: roleFilter }

  const visible = all.filter((t) => {
    if (serviceFilter && t.serviceCategory !== serviceFilter) return false
    if (roleFilter && (t.roleTitle?.trim() ?? '') !== roleFilter) return false
    return true
  })

  const hasAny = all.length > 0
  const hasFilter = Boolean(serviceFilter || roleFilter)

  return (
    <>
      {/* HERO — cream, type-led, with the two filter-chip rows. */}
      <section
        style={{
          position: 'relative',
          padding: '64px 56px 96px',
          background: 'var(--c-cream)',
          color: 'var(--c-ink)',
          overflow: 'hidden',
          borderBottom: '1px solid var(--c-cream-2)',
        }}
        data-testid="testimonials-hero"
      >
        <div className="container" style={{ paddingTop: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 32 }}>
            In their own words
          </div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            What districts say <em>about flowlyst.</em>
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '54ch', marginBottom: 40 }}>
            Filterable by service and role. CMS-driven — new testimonials appear without a redeploy.
          </p>

          {/* Service filter — chips are links (server-rendered, no client JS). */}
          <div
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}
            data-testid="filter-service"
          >
            <FilterChip
              href={buildHref(current, { service: null })}
              label="All"
              active={!serviceFilter}
            />
            {SERVICE_OPTIONS.map((o) => (
              <FilterChip
                key={o.value}
                href={buildHref(current, { service: o.value })}
                label={o.label}
                active={serviceFilter === o.value}
              />
            ))}
          </div>

          {/* Role filter — chips derived from the distinct roles in the published set.
              Rendered only when at least one testimonial carries a role. */}
          {roles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} data-testid="filter-role">
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--c-ink-3)',
                  alignSelf: 'center',
                  fontWeight: 700,
                }}
              >
                By role:
              </span>
              <FilterChip
                href={buildHref(current, { role: null })}
                label="All"
                active={!roleFilter}
              />
              {roles.map((role) => (
                <FilterChip
                  key={role}
                  href={buildHref(current, { role })}
                  label={role}
                  active={roleFilter === role}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* GRID — published testimonials, filtered by the active chips. */}
      <section className="section section--cream">
        <div className="container">
          {visible.length > 0 ? (
            <div className="grid-3" data-testid="testimonials-grid">
              {visible.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState hasAny={hasAny} hasFilter={hasFilter} />
          )}
        </div>
      </section>

      <FinalCTA />
    </>
  )
}

// ---------------- supporting presentational elements ----------------
// Ported from design/site/pages.jsx `TestimonialsPage`. Pure/server-renderable;
// inline styles reference brand tokens only (no invented values).

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={active ? 'chip chip--green' : 'chip'}
      aria-current={active ? 'true' : undefined}
      style={{ textDecoration: 'none' }}
    >
      {label}
    </Link>
  )
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const tag = t.serviceCategory ? SERVICE_LABEL[t.serviceCategory] : null
  const photo = typeof t.photo === 'object' && t.photo ? t.photo : null
  const name = primaryName(t)
  const org = t.organization?.trim()

  return (
    <div className="card" style={{ padding: 32 }} data-testid="testimonial-card">
      {tag && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fl-green-700)',
            marginBottom: 20,
          }}
        >
          {tag}
        </div>
      )}

      {/* Video variant — a real link to the testimonial video, wrapping the play
          visual (the comp's dead play button is made a working anchor). */}
      {t.videoUrl && (
        <a
          href={t.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch video testimonial from ${name}`}
          data-testid="testimonial-video"
          style={{
            display: 'block',
            aspectRatio: '16 / 10',
            background: 'var(--c-forest)',
            borderRadius: 4,
            marginBottom: 20,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: 'var(--fl-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
              }}
            >
              ▶
            </span>
          </span>
        </a>
      )}

      <div
        aria-hidden="true"
        style={{
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 0.5,
          color: 'var(--fl-green)',
          marginBottom: 16,
        }}
      >
        “
      </div>
      {/* Plain text (not dangerouslySetInnerHTML). */}
      <p
        style={{
          fontSize: 17,
          fontWeight: 500,
          lineHeight: 1.45,
          margin: '0 0 24px',
          color: 'var(--c-ink)',
        }}
      >
        {t.quote}
      </p>

      <div
        style={{
          paddingTop: 16,
          borderTop: '1px solid var(--c-cream-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {photo && photo.url ? (
          // Media origin is storage-dependent (unknown here); next/image would need a
          // next.config remotePatterns entry, which is out of scope for this issue. alt
          // is required on Media and width/height are fixed, so there is no CLS.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={photo.alt}
            width={36}
            height={36}
            style={{ width: 36, height: 36, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #3a4a40, #1a2520)',
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{name}</div>
          {org && <div style={{ fontSize: 12, color: 'var(--c-ink-3)' }}>{org}</div>}
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state, two cases (review requirement):
 *  - no published testimonials at all (the pre-#20 state on staging now)
 *  - none match the active filter (offers a reset link back to the full list)
 */
function EmptyState({ hasAny, hasFilter }: { hasAny: boolean; hasFilter: boolean }) {
  return (
    <div
      data-testid="testimonials-empty"
      style={{ textAlign: 'center', padding: '64px 0', maxWidth: '48ch', margin: '0 auto' }}
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 0.5,
          color: 'var(--fl-green)',
          marginBottom: 24,
        }}
      >
        “
      </div>
      {hasAny && hasFilter ? (
        <>
          <p className="lead" style={{ marginBottom: 24 }}>
            No testimonials match this filter yet.
          </p>
          <Link
            href={CANONICAL_PATH}
            className="chip chip--green"
            style={{ textDecoration: 'none' }}
          >
            Show all testimonials
          </Link>
        </>
      ) : (
        <p className="lead" style={{ margin: 0 }}>
          District testimonials are on the way. In the meantime,{' '}
          <Link href="/request-demo" style={{ color: 'var(--fl-green-700)', fontWeight: 700 }}>
            request a demo
          </Link>{' '}
          to hear how districts use flowlyst.
        </p>
      )}
    </div>
  )
}
