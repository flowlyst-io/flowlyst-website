# Phase 2 — Public Pages — Retrospective

Phase 2 built the public marketing pages on top of the Phase 1 foundation: the
founder page, a site-wide nav fix, all four solution pages, and the site's first
working lead-capture form. Issues #7 (PR #47), #45 (PR #48), #8 (PR #50), #12
(PR #51), #9 (PR #52), #13 (PR #53) — all fully gated (code-reviewer +
ui-verifier + tester + a fresh-clone quality-engineer) and squash-merged to
`main` overnight on 2026-07-14. This note is for the agents building **Phase 3**
(the remaining lead-capture forms + utility/trust/legal pages) — read it before
you start.

---

## What was built

**#7 — `/about` (PR #47).** Fully static (`○ /about`) founder page per the
settled design: cream hero, Meet Aziz, mission + three pillars, green manifesto
band, four-offerings cross-link grid, shared FinalCTA. SEO: unique
title/description, canonical, OG/Twitter, and **Person JSON-LD** (Aziz Aghayev,
`worksFor` → the site-wide Organization node). QE measured Lighthouse mobile
**perf 99 / a11y 94 / LCP 2.1s / CLS 0**.

**#45 — Shared-nav overflow fix (PR #48).** The full horizontal nav (brand + 6
links + Contact + Request-a-demo) doesn't fit below ~809px, but the hamburger
only engaged at ≤680px — so 681–808px (iPad portrait = 768) forced a ~41px
page-level horizontal scrollbar (WCAG 1.4.10 reflow) on **every** page. Found by
ui-verifier during #7's 768px pass, reproduced in the design source, so it's a
carried-in design-source condition, not a page regression. Fix: raise the
hamburger breakpoint **680 → 820px** as an additive, load-bearing-commented
amendment in `styles.css` (same pattern as the #6 `.footer__cta` amendment).

**#8 / #9 / #12 / #13 — the four solution pages (PRs #50 / #52 / #51 / #53).**
Budget Software, AI Training, Consulting, and Keynotes — each server-rendered
against its settled Direction-C composition in `design/site/solutions.jsx`, each
with its own `Service` JSON-LD alongside the site-wide Organization. The static
-vs-ISR call was made per page against the design: a section that maps to a CMS
collection (e.g. Budget's featured testimonial) uses ISR (`revalidate`); pages
with no CMS-mapped section (e.g. Consulting) ship fully static. Two new shared,
props-driven blocks — `SolutionHero`, `SectionHead` — were settled on the first
page (#8) and, with the pre-existing `FinalCTA`, reused across the other three.

**#13 — first working lead-capture form (part of PR #53).** `SpeakingRequestForm`
(the keynotes page's only client island) → Payload REST → a new
`SpeakingRequests` collection that mirrors `DemoRequests`: anonymous create-only,
PII read admin-only, admin-locked `status`/`internalNotes`, server-checked
honeypot. Additive migration (`20260714_040417_speaking_requests`), auto-applied
on deploy. Invariant (d) proven end-to-end: a browser submit persists a row that
a JWT-authed admin reads back; an empty submit fires zero API calls; a honeypot
hit returns 400 and persists nothing; an anonymous inbox read is 403 with no PII
in the body. (Email notification is Phase-3 scope, #14 — tonight the requests
land in the admin inbox.)

---

## What worked

- **Parallel 3-branch fan-out, but only after the shared blocks settled.** The
  first solution page (#8) settled `SolutionHero` / `SectionHead`;
  the remaining three (#9/#12/#13) then ran as parallel branches that reused them.
  Each page kept its own presentational art local, and none touched the shared
  components or `styles.css` unless it genuinely needed a new reusable class
  (Budget's `.stat-band__grid`) — so three concurrent branches union-merged with
  near-zero conflict.
- **Foundation-first ordering avoids migration collisions.** Shipping the pages
  with a data model before the forms meant only one branch (#13) added a
  collection + migration this phase. **Phase 3 repeats this deliberately** — land
  the form-delivery foundation (email, reCAPTCHA, shared form primitives) before
  fanning out the demo/contact/newsletter forms.
- **Fix-passes stay with the same agent over SendMessage.** Review/QE findings
  were routed back to the coder that built the branch (not a fresh agent), so the
  fix landed with full context on top of the tester's commit without clobbering it.
- **QE-last, from a fresh clone, catches what worktree runs can't.** Every page
  gated a final fresh-clone + fresh-DB + production-boot pass. That surfaced things
  a warm worktree dev run masks: migration-chain-from-clean, the prod-build
  static/ISR classification, and Lighthouse on a real build rather than dev.

---

## What surprised us

- **A honeypot field named `company` silently kills real leads.** Browser autofill
  populates any field literally named `company`, so the server rejected legitimate
  submissions as bot traffic — an invisible lead drop with no UI signal. Fix:
  rename the honeypot to a non-semantic `botField` (#13, f1f13f9). **This is THE
  template lesson for every Phase-3 form** (demo, contact, newsletter): honeypots
  must have non-semantic names autofill will never touch, and the empty-value check
  must be server-side.
- **QE holds the line on enumerated ACs and real-person facts.** Two #13 catches:
  QE refused to mark a required speaker-bio acceptance criterion "done" when it was
  only partially met (no rounding up an enumerated AC), and trimmed the venue tiles
  from the design's five to the **three PRD-backed venues** (ASBO International,
  NJASBO, CPS) — a factual claim about where a real person has spoken can't be
  padded from a design comp.
- **PRD-over-design substance is not invented copy.** When issue/PRD text mandates
  content the settled design omits, adding it is substance, not improvisation:
  precedent on #8 (module-07 → paid custom-dashboard framing), then the
  by-exception assessment line (#12) and founder credentials in the hero (#13).
  The rule: add the required substance using existing classes only, and flag it as
  an adjudicated deviation — never invent a color, size, or spacing value.

---

## What Phase 3 must know

- **Worktrees don't inherit the gitignored `.env`.** A fresh worktree has no
  `.env`, so Payload can't boot for `build`/tests. Either pass `DATABASE_URL` and
  `PAYLOAD_SECRET` **inline** on the command, or self-provision a local-only `.env`
  plus a scratch Postgres container. (Writing `.env` can be blocked by the secrets
  `deny` rules for some agents — inline env is the reliable fallback.)
- **Scratch clones from the LOCAL checkout resolve stale refs.** A clone of the
  local path only sees refs already committed/pushed to that local repo. Fetch from
  **GitHub (origin)** for the true branch state; don't diff against a local mirror.
- **Playwright `isVisible()` false-positives on clip-rect-hidden elements.** For
  real visibility/overflow assertions use `boundingBox()`, not `isVisible()`.
- **Next 16 enforces a per-directory dev-lock.** Only one `next dev` per worktree
  directory. Give each agent an explicit port and clear ownership, and kill stale
  `next dev` PIDs before a run.
- **Stamp admin fixtures per run; don't share seed emails (#46).** Shared seed
  emails collide across parallel test runs — stamp fixtures uniquely per run.
- **RSC-prefetch 404 console noise = unbuilt sibling routes, not a bug.** Links to
  `/contact`, `/request-demo`, `/testimonials`, `/case-studies` 404 until those
  pages land; the prefetch 404s in the console shrink as Phase 3 builds them. The
  pages that link forward are correct — the targets just don't exist yet.
- **Carried forward from Phase 1, still load-bearing:** reuse the `.footer__cta` /
  `.section--green` WCAG amendments (don't re-introduce the 390px overflow or the
  low-contrast green-band text); use `publishedOrStaff` for any new public-readable
  collection so drafts never leak; and run `pnpm format:check` before calling a
  branch done — **even docs-only** (this retro included).

---

## Open threads

- **LCP on the SolutionHero pages (#10).** `/about` (fully static, no SolutionHero)
  measured LCP 2.1s, but the four hero pages show ~3s LCP on localhost — systemic
  to the hero, tracked in **#10**. Address before staging perf sign-off.
- **Resend + reCAPTCHA keys are parked for Tural.** The keynotes form persists to
  the admin inbox but sends no email yet (#14); demo/contact forms will need
  reCAPTCHA (PRD §10.4). Keys are Tural-operated — a Phase-3-foundation runbook
  will hand him the exact env contract.
- **The design-source fold-in list is growing.** Items for Tural to fold upstream:
  the #6 green-band WCAG amendments, the #45 nav breakpoint, the venue-table
  correction, the `.t-row` mid-width squeeze, the dropped keynotes sample-reel CTA,
  and the founder bio-block question. These are implemented as load-bearing-commented
  amendments in the repo; the design source still needs the matching changes.
