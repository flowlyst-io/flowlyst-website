# Phase 3 — Lead Capture — Retrospective

Phase 3 finished the site's lead-capture surface: the shared form-delivery
foundation, then the two primary forms and the reusable newsletter island.
Issues #14 (PR #59, `/request-demo`), #15 (PR #60, `/contact`), #16 (PR #56,
`NewsletterSignup` — **stays open** by design), plus the P3 foundation (PR #55)
and a nav-fold follow-up #58 (PR #62). All gated (code-reviewer +
quality-engineer, plus ui-verifier for the visible pages) and squash-merged to
`main` on 2026-07-14. Current main is `08e76fa`: 8 static public pages, 200/200
e2e, 73/73 int. This note is for the agents building **Phase 4** (the blog) —
read it before you start, because #17's first job lives in here.

---

## What was built

**#55 — P3 lead-capture foundation (PR #55).** One lane laid the whole data +
delivery layer before any page lane started, so only this branch touched the
schema. Three collections aligned to PRD §8 and hardened to the Phase-2
`SpeakingRequests` template (anonymous create-only, PII read admin-only,
admin-locked workflow fields, server-validated `botField` honeypot):
`DemoRequests` (consent required-TRUE server-side), `ContactMessages` (reason
enum press/partnership/training/support/other), `NewsletterSubscribers` (unique
email, status, source). **Resend `afterChange` notifiers** (demo→sales,
contact→info@, newsletter→confirmation) are env-gated skip-and-log and
**never-throw**. The public `POST /api/newsletter-subscribers/subscribe`
endpoint does a case-insensitive upsert and returns a **uniform `200 {ok:true}`
for every outcome** (raw create stays admin-only). **One** combined migration
(`20260714_104309_lead_capture_foundation`) with data-independent CASE casts.

**#56 — `NewsletterSignup` (PR #56).** A reusable client island (email +
Subscribe, autofill-proof clip-rect `botField` honeypot, `source` prop,
submitting/success/error states, aria-live). Posts only to `/subscribe`.
**Ships UNMOUNTED** — the design places the newsletter capture only on the
Phase-4 `/blog` page, so mounting it is #17's job; issue #16 stays open across
the phase boundary until that mount + its browser e2e land.

**#14 — `/request-demo` (PR #59).** Server-rendered primary lead path: sticky
proof column + `DemoRequestForm` island. **Consent required-TRUE on client AND
server**; interests multi-select (incl. keynotes), districtSize / heardAboutUs /
datePreference / anythingElse per the comp. Adjudicated (issue #14):
title/district/phone/date are **optional** — PRD §8.1 keep-it-short beats the
comp's asterisks (one-line reversal if Tural overrules).

**#15 — `/contact` (PR #60).** Server-rendered contact form with a 5-value
reason dropdown 1:1 with the enum (reason omitted, not empty, when unselected)
and functional alternative-contact links (mailto info@ / /request-demo /
/solutions/keynotes). Zero `styles.css` changes.

**#58 — Nav fold fix (PR #62).** Measurement-driven: the hamburger fold moves
820 → **959** (single-line fit is ~908px with Nunito loaded), landing on the
existing 960 tablet-reflow breakpoint, killing the 821–959 two-line wrap on
every page. Raise-fold over tighten-spacing (fitting 821 would shave ~90px off
the comp's nav proportions — a brand-fidelity loss).

---

## What worked

- **Foundation-first fan-out — the pattern for any schema-touching phase.** One
  lane shipped all three collections, the notifiers, the `/subscribe` endpoint,
  and a **single** migration before the page lanes fanned out. Result: zero
  parallel-migration conflicts, and the demo/contact pages were pure
  presentation over a settled wire contract. Repeat this deliberately whenever a
  phase adds more than one collection.
- **Anti-enumeration is a form-infra invariant now.** `/subscribe` returns a
  byte-identical `200` whether the email is new, returning, malformed, or a
  honeypot hit; success copy is outcome-neutral (never "welcome!" vs "you're
  already subscribed"). The reviewer caught **two membership-enumeration
  vectors** in #55 pre-merge — treat any new public form as an enumeration
  surface by default.
- **Email never blocks persistence — the iron rule of invariant (d).** The
  Resend `afterChange` notifiers are env-gated and swallow transport throws, so
  a lead row persists even when notification is unconfigured or fails. Tester
  proved both branches (skip-log with keys unset; swallowed transport throw);
  QE saw the skip-logs live on every path. Persistence is the contract;
  delivery is best-effort on top.
- **Reviewer-caught-before-merge earns its cost.** Besides the enumeration
  vectors, #55's review caught a **data-dependent enum cast** that would have
  broken the deploy migration on existing rows. The gate is not ceremony.

---

## What surprised us

- **Coordination overhead — not production — is what exhausts a session.** The
  phase peaked at ~14 concurrent agents with idle-ping chatter and
  re-verification cascades (every intermediate SHA re-gated), and that is where
  the budget went. The **six binding cost-discipline rules** in CLAUDE.md were
  born mid-phase out of this (#57): cap concurrency at five, expect
  completion-or-blocker reports only, brief-completely-then-wait, scope
  verification to the delta, retire agents when their lane completes, one lane
  per agent. The controlled segment that followed (~4–5 agents, no idle pings,
  delta-scoped gates) delivered the same quality faster. **Orchestrate to those
  rules from the first task of Phase 4 — do not rediscover them.**
- **Delta-scoped gating works in practice.** #62 was CSS-only, so its dedicated
  quality-engineer pass was adjudicated-skipped (post-merge staging covers the
  deploy) — a clean instance of "scope verification to the delta" rather than a
  reflexive full fresh-clone gate on a two-line change.

---

## What Phase 4 must know

- **#17's first job is the deferred #16 mount.** Phase 4 is the blog. `#17`
  mounts `NewsletterSignup` on `/blog`, supplies the section wrapper (sage
  section, eyebrow/heading/lead, 480px centering per the design), and runs the
  **browser-level e2e that was deliberately deferred** from #56 — that is what
  finally **closes #16**. The endpoint is already int-covered (upsert,
  uniform-200, honeypot, export) by the P3 foundation spec; what's missing is
  the mounted UI proof.
- **Real Resend delivery is the ONE unverified link in invariant (d).** Every
  form persists and every notifier skip-logs correctly, but no actual email has
  been sent — it is blocked on Tural running `docs/runbooks/resend-setup.md`
  (keys + reCAPTCHA env names are reserved there). **Nothing in Phase 3 claims
  delivery verified**; do not mark invariant (d) fully closed until an inbox
  receipt exists. Same for reCAPTCHA — the honeypot is the floor until keys land.
- **Every new form inherits the two form invariants:** non-semantic
  autofill-proof honeypot with a server-side empty check, and (for anything
  public/enumerable) the uniform-response + outcome-neutral-copy contract.
- **Carried forward, still load-bearing:** honor the #62 nav fold (959) and the
  Phase-1/2 WCAG amendments; use `publishedOrStaff` for any public-readable
  collection; run `pnpm format:check` before calling a branch done — **even
  docs-only**.

---

## Open threads

- **Resend + reCAPTCHA keys are parked for Tural** (`docs/runbooks/resend-setup.md`).
  Forms land in the admin inbox; email + reCAPTCHA light up when he provisions
  the keys.
- **#16 stays open** until #17 mounts `NewsletterSignup` and its browser e2e
  passes (intentional cross-phase carry).
- **SolutionHero LCP (#10)** — still open from Phase 2; the demo/contact pages
  measured LCP 2.7–2.9s localhost, consistent with the systemic hero item.
  Address before staging perf sign-off.
- **The design-source fold-in list keeps growing.** Items for Tural to fold
  upstream: the #58 nav breakpoint (959), the `/request-demo` optional-field
  marking (comp shows required), the functional `/contact` alternative-contact
  links (comp shows static text), and the `NewsletterSignup` success-state
  cadence copy (comp has no success state). All are implemented as adjudicated,
  load-bearing-commented deviations; the design source still needs the matches.
