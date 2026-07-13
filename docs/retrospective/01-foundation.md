# Phase 1 — Foundation — Retrospective

Phase 1 stood up the whole engineering substrate for the flowlyst.io rewrite:
the app skeleton, the brand/design foundation, the Payload CMS content model, and
the staging runbook. Issues #2 (PR #23), #3 (PR #25), #4 (PR #27), #5 (PR #28).
This note is written for the agents building **Phase 2** (the public pages) —
read it before you start.

---

## What was built

**#2 — Scaffold (PR #23).** Next.js 16 (App Router) + Payload 3.86 embedded in one
app, TypeScript throughout, Postgres via `@payloadcms/db-postgres` (Docker locally,
Neon in staging). Tailwind v4 is scoped to the `(frontend)` route group so it never
touches the Payload admin. Testing: Vitest (unit/integration) + Playwright (e2e). CI
(`.github/workflows/ci.yml`) runs, in order, **lint → typecheck → format:check →
migrate → test:int → build → e2e** against a Postgres 16 service. Two route groups:
`(frontend)` (public site) and `(payload)` (admin at `/admin`, API at `/api`). Schema
has two paths: local **Drizzle push** for speed; **committed migrations only** in
CI/prod (`push` is off when `NODE_ENV==='production'` or `CI`).

**#3 — Design foundation (PR #25).** Brand tokens ported into Tailwind v4 from the
"Flowlyst Design System" `colors_and_type.css` contract, Nunito loaded via
`next/font`, and the site shell (`Nav`, `Footer`, `Mark`) plus the homepage. Component
CSS lives in `src/app/(frontend)/styles.css`. **Styles come only from the tokens —
colors/type/spacing are never invented.**

**#4 — CMS content model (PR #27).** The full PRD §9 model. Content collections
(Blog Posts, Case Studies, Testimonials, Training Programs, Authors, Media), lead
inboxes (Demo Requests, Contact Messages, Newsletter Subscribers), `Users` (auth with
an enforced `role`), and a `Site Settings` global. Two enforced roles (Admin/Editor)
via `src/access/index.ts`; drafts + scheduled publishing (Payload jobs +
`schedulePublish`) + secret-gated draft preview; CSV export via
`@payloadcms/plugin-import-export`, admin-gated. Three committed migrations; media
goes to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, else local filesystem.
Verified end-to-end — roles, draft-leak closed on every path, export guard airtight,
scheduled draft→published flip over the real HTTP cron path — by a QE running-server
pass and a `ui-verifier` admin screenshot pass.

**#5 — Staging runbook (PR #28).** `docs/runbooks/staging.md` — the exact,
copy-pasteable steps **Tural** executes to stand up Vercel + Neon + Blob so every
merge to `main` auto-deploys. Covers the env contract, pooled-vs-direct Neon strings,
the Corepack pnpm pin, the manual migration path, the daily publishing cron, the full
env-var table, and end-state verification. **No infrastructure was provisioned** —
this is a human runbook; staging does not exist until Tural runs it.

---

## What surprised us

- **`pnpm format:check` is CI's first gate and bit BOTH #4 and #5.** It runs before
  tests/build, so an otherwise-green branch goes red on formatting alone. Run
  `pnpm format` (and confirm `pnpm format:check` exits 0) on **every** branch before
  calling it done — **even docs-only**: the #5 runbook, pure markdown, failed on it.
- **The `PREVIEW_SECRET → PAYLOAD_SECRET` fallback was a silent secret leak.** #4
  originally fell back to the master JWT-signing secret when `PREVIEW_SECRET` was
  unset, embedding it in `/preview?...&secret=` URLs (Vercel access logs, browser
  history, log drains). Review caught it. Fix: **secrets fail closed, no fallbacks** —
  `PREVIEW_SECRET` unset ⇒ preview is denied, not silently substituted. Rule for
  Phase 2: never fall back to a more-privileged secret; fail closed.
- **Vercel Hobby hard-fails sub-daily cron deploys.** A `*/5 * * * *` cron makes the
  **whole deployment fail** on the Hobby plan (_"Cron expressions that would run more
  frequently than once per day will fail during deployment"_) — not a silent throttle.
  The committed default is daily `0 6 * * *` (deploys on any plan); the Pro `*/5`
  near-real-time schedule is documented as an optional one-line upgrade.
- **`plugin-import-export`'s `/download` + `/export-preview` endpoints bypass
  collection access.** Those export endpoints are separate from collection access
  control, so they needed an explicit admin guard (`adminOnlyEndpoints` wrapping the
  real handlers) plus a regression test that invokes the **wrapped** handler.
  **Re-verify this guard on any plugin upgrade** — an upgrade could silently unwrap it
  and re-expose lead PII.
- **Parallel-branch doc drift.** #5 documented #4's facts while #4 was still moving
  (its migration count went 2→3 mid-flight, and the `PREVIEW_SECRET` semantics
  flipped). **De-enumerate volatile facts in docs** — write "all committed migrations
  in `src/migrations/`" rather than naming a fixed count.
- **Migrations must be generated against a clean DB at the prior-migration state,
  with `CI=true` (push off).** Generating against a push-dirtied local DB yields wrong
  diffs; `CI=true` gives deterministic, migration-only schema for reproducible runs.

---

## What Phase 2 must know

- **Preview placeholder routes** at `/preview/[collection]/[slug]` are intentional thin
  placeholders — **Phase 2 replaces them with the real templates.** `noindex, nofollow`
  is already set on them (invariant a); **keep it** on the real templates for draft
  previews.
- **`publishedOrStaff` (`src/access/index.ts`) is the pattern for public queries** — it
  returns only `published` docs to anonymous callers and everything to staff. Use it
  for any new public-readable collection so drafts never leak.
- **Site Settings read is public by design** (`read: anyone`) — the frontend consumes
  it (contact email, hero copy, footer text, social links). Only **update** is
  admin-gated. Don't "fix" the public read.
- **`PREVIEW_SECRET` and `CRON_SECRET` are required in the staging env** (both fail
  closed) — see `docs/runbooks/staging.md`. Generate all three secrets
  (`PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET`) up front with `openssl rand -hex 32`.
- **e2e `seedUser` needs `name` + `role`** (`tests/helpers/seedUser.ts`) — `Users.name`
  is required; seeding goes through the Local API with `overrideAccess`. Any new e2e
  that creates a user must set both.
- **The FinalCTA two-button row (`design/site/site.jsx`) overflows at 390px.** Every
  page that uses it needs the `.footer__cta` amendment already in
  `src/app/(frontend)/styles.css` (the mobile media-query fix). Reuse the amended CSS;
  don't re-introduce the overflow.
- **Staging exists only after Tural executes `docs/runbooks/staging.md`.** Don't assume
  a live staging URL until then — nobody but Tural operates Vercel/Neon.

---

## Governance

- **Commit `40e359f` flipped the docs to "agent-operated Vercel/Neon" citing a steer
  that is UNCONFIRMED (issue #26).** Until Tural resolves #26, **do not operate Vercel
  or Neon** — no `vercel`/`neonctl`, no account actions. Prepare config files and
  runbooks; let Tural execute.
