# Phase 4 — Content — Retrospective

Phase 4 gave the site real content: the blog (index + reader), testimonials,
case studies (index + long-form story), a content-model touch-up, the 7-post
legacy port, and the newsletter mount that finally closed #16 — plus a
`next/image` LCP conversion. Issues #17 (PR #66, also closes #16), #18 (PR #64),
#19 (PR #65), #20 (PRs #68 + #71), #69 (PR #72, image half). All gated
(code-reviewer + quality-engineer, plus ui-verifier for the visible pages) and
squash-merged to `main` on 2026-07-14. Current main is `9c61ecc`: five new
content routes, 110 int, 255 e2e serialized. This note is for the agents
building **Phase 5** (#21 — SEO / AI discoverability) — read it first.

---

## What was built

**#18 — `/testimonials` (PR #64).** Server-rendered, URL-driven filterable index
(service + role chips are `<Link>`s — no client filtering, invariant a),
canonical pinned to bare `/testimonials` across every filter. `keynotes` added
as a first-class `serviceCategory` via a data-independent `ADD VALUE` migration
(the #55 pattern; Payload enums are per-collection, so zero blast radius).

**#19 — `/case-studies` + `/case-studies/[slug]` (PR #65).** Index (static) +
long-form story (SSG). The detail template is a **design-gap fill** — no hi-fi
detail comp exists upstream (adjudicated on #19) — composed from settled
patterns (the blog reader shell + case-card motifs), section order following the
schema. Article JSON-LD per case (Organization author — case studies carry no
Person).

**#17 — `/blog` + `/blog/[slug]` (PR #66, closes #16).** Blog index (dynamic —
`?category=`) with server-rendered chip links, featured + archive grid, and the
sage newsletter section that **mounts `NewsletterSignup`**. The browser-level
e2e deferred from #16 — a real `/subscribe` submit persisting a `source: blog`
row — ran here, which closed #16. Reader is SSG with Article JSON-LD (Person
author), share anchors, related posts; drafts 404.

**#20 — content-model touch-up + legacy port (PRs #68, #71).** #68 added the
`consulting` blog category, case-study `excerpt` / `implementationDuration`
fields, the 48→56px card headline-stat fix, and `next.config` Blob
`remotePatterns` — one additive migration. #71 ported the **7 legacy blog
posts** via an idempotent Local-API script + runbook; every legacy
`/blog/<slug>` preserved 1:1 (no redirect), slug parity verified through
`formatSlug` (PRD §10.1). #20 stays referenced-not-closed — testimonial and
case-study content is Tural/Aziz's editorial call.

**#69 — image LCP (PR #72, image half).** Converted the three CMS-image sites
from `<img>` to `next/image` (`fill` + `priority` + `sizes`, aspect boxes kept
so CLS stays 0).

---

## What worked

- **Two independent gates converged on one defect in a single pass (#72).** The
  code-reviewer derived the optimizer-400-on-filesystem-media **statically** (a
  MUST-ADDRESS); the ui-verifier hit it **empirically** the same pass (render
  FAIL, optimizer 400, empty image boxes) — the static read gave the _why_, the
  screenshot the _that_.
- **Presence ≠ paint — proven fail-then-pass.** The defect survived a **green
  253-test suite** because the suite asserted the `<img>` was _present in the
  DOM_, not that the optimized image _loaded_. #72's new test asserts
  optimizer-200 + `naturalWidth > 0` and was **observed failing at the broken
  SHA (`e94a761`), passing at the fix (`71325dd`)** — proven, not asserted.
  Every visual/asset AC needs a did-it-render assertion, not a
  did-it-exist-in-HTML one.
- **Security-critical code was shared, never forked.** The JSON-LD stored-XSS
  class — unescaped `JSON.stringify` into a `<script>` tag — hit **both**
  CMS-fed Article pages (#65, #66); fixed once via a shared `serializeJsonLd`
  (`<` escape). The rich-text link-scheme sanitizer was likewise **extracted to
  `src/utilities/richTextLinks.tsx`** and adopted by both renderers — the
  reviewer flagged duplicated security code as unacceptable.
- **Migration evidence is `CI=true pnpm migrate` from a fresh DB — nothing
  else.** The suites boot Payload in **push mode** and never execute the
  migration files, so a green suite is _not_ migration evidence. Caught as a
  false PR-body claim on #64 and corrected; every later PR proved the chain from
  a fresh DB. `CI=true` is now baked into the `content:port` runbook, so a
  forgotten export can't schema-push staging.
- **Idempotent content port, keyed off the relationship.** #71 ran twice → `0
created / 7 updated`, media `0 uploaded / 7 reused`, zero duplicates even
  against a dirty media dir — because media idempotency keys off the **post
  relationship**, not the filename (Payload suffixes filename collisions).

---

## What surprised us

- **Coverage follows seeds — an unseeded path is an untested path.** #64's e2e
  ran against an **empty DB**, so the automated suite only rendered the _empty
  state_; the populated grid, video, and photo variants were proven only by the
  ui-verifier's manual seed, and #65's detail a11y was inspection-only for lack
  of a published case. **Seed the risky path, or the only gate covering it is
  the human one.**
- **Image optimization is not an LCP fix.** #72 measured the article LCP as
  **51% render delay (1471ms)**, image download only 201ms; the `/blog` index
  LCP element is the `<h1>` text. `next/image` still earned its place — a
  realistic **561KB photo went 5.7s / Perf 79 (FAIL) → 3.2s / Perf 90–94
  (PASS)**, ~123KB WebP — **preventing a guaranteed future failure** once #20's
  photos arrive. But the sub-2.5s miss is the render/font floor. Keep the issues
  distinct: the QE sweep first wrote "ties to #10," then **corrected itself** —
  blog-article LCP became its own #69, #72 fixed the image half, only the
  render-delay residual went to #10.
- **Coordination, not code, was the failure mode again.** (1) **Gates before
  fix passes** — dispatching a fix into the **same worktree** a ui-verifier was
  live-running (#65) killed its dev server mid-run; one DB per agent, and let a
  gate report land before touching its branch. (2) **Agent-failure recovery has
  a pattern** — three agents went idle without delivering reports (recover with
  a "deliver your report" resume); one died mid-stream twice, so the move was a
  **fresh spawn**, not a third resume.

---

## What Phase 5 must know

- **Most of the SEO surface (#21) already exists — #21 verifies it page by
  page.** Every content page shipped its structured data: **Article** JSON-LD on
  blog posts (Person author) and case-study details (Organization author),
  alongside the site-wide **Organization** node. #21's job is the page-by-page
  audit plus what's still missing: **`sitemap.xml`** enumerating the new
  **dynamic** routes (`/blog/[slug]`, `/case-studies/[slug]`, `/testimonials`),
  **`robots.txt`** explicitly allowing the AI crawlers, and the **301 map** —
  the legacy URL inventory (16 URLs) is already a comment on #20.
- **Article/detail JSON-LD is verifiable only on seeded content.** Staging
  serves the **empty state** — the content port (#71's runbook) is Tural's to
  run and hasn't landed — so #21's per-post schema/canonical checks need the
  port or a local seed first; the QE sweep verified Article JSON-LD locally,
  never on staging.
- **The two form invariants still bind** any new form: a non-semantic,
  autofill-proof honeypot with a server-side empty check, and the
  uniform-response + outcome-neutral-copy contract for anything
  public/enumerable.
- **Carried forward, still load-bearing:** use the shared `serializeJsonLd` for
  **any** new JSON-LD sink; `publishedOrStaff` for public-readable collections;
  honor the #58 nav fold; run `pnpm format:check` before done — **even
  docs-only**.

---

## Open threads

- **#67 (OPEN) — repo-wide hardening sweep.** ~6 latent static-content JSON-LD
  sinks (`layout.tsx`, `about`, all 5 solution pages) still use raw
  `JSON.stringify` — sweep them onto `serializeJsonLd` before a CMS-fed field
  can weaponize one. Also: consolidate the three near-identical
  revalidation-hook blocks (lazy-import vs top-level) into one guarded helper,
  and fix case-studies' `list` converter (same marker gap the blog fix closed).
- **#10 (OPEN) — LCP render/font floor + AA contrast.** LCP <2.5s is **not** met
  on the blog pages and isn't image-shaped. **AA color-contrast fails
  site-wide** at the design-token level — `--c-ink-3` ≈ 3.44:1 (needs 4.5:1),
  green `<em>` ≈ 2.82:1 (needs 3:1) — carried in from Phase 2/3, not a Phase-4
  regression. Both need **Tural's design-side token values** (parked on #70).
  The out-of-sequence `<h5>` on the article is an **editorial** heading-tree fix
  (deferred to #20 guidelines), not code.
- **Invariant (d): email delivery is still the one unverified link.** Every form
  persists and the newsletter negative paths (honeypot, invalid, dedupe) are
  proven, but no real email has been sent — blocked on Tural running
  `docs/runbooks/resend-setup.md`. reCAPTCHA likewise parked; the honeypot is
  the floor until keys land.
- **#70 is the single "needs Tural" tracker.** Resend keys, the content-port
  run, staging smoke-row + merged-branch cleanup, the AA token values, the
  demo-form optional-field call, and the design-source fold-in list all live on
  **#70**; agents append there rather than scattering decision notes.
