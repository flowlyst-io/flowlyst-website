# Flowlyst Website

The ground-up **rewrite of flowlyst.io**, the marketing site for a US company serving K-12 public school districts with budgeting software, AI training, and AI/automation consulting. **This file is the system: change it here.** Requirements are in [`docs/PRD.md`](docs/PRD.md) (Tural's words, never edited by agents); designs live in two Claude Design projects, pointers and the pull-on-demand rule in [`design/README.md`](design/README.md). Code comments follow [`.claude/rules/codery-code-comments.md`](.claude/rules/codery-code-comments.md). The legacy site (`naysaziz/flowlyst-landing`) stays untouched until cutover.

## People

- **Tural is the product owner.** He reviews by using the product on staging, never by reading code: *"imagine you are my engineering lead — I ask you to build something, you build it, you bring it to me, I use it and tell you what I feel about it"* (2026-07-12). He still makes the major architecture and stack decisions (see Tural decides).
- **The lead (this main session, `fable`) owns engineering:** plans, briefs, adjudicates, owns quality. Aziz Aghayev (CEO of Flowlyst; site copy uses the title in PRD §6, never this one) is a brand and content stakeholder, not in the build loop.

## The squad

Judgment on Opus, execution on Sonnet, named by alias. Subagents by default; a team only when lanes must talk. Agents are in [`.claude/agents/`](.claude/agents/); `locator`, `planner`, `plan-reviewer` and `code-reviewer` are always plain fresh subagents without `SendMessage`. The TeammateIdle hook blocks a teammate from going idle (twice, then allowed) until it reports.

| Lane | Model | Job |
| --- | --- | --- |
| `locator` | sonnet | read-only `file:line` map for one question; up to three at once |
| `planner` | opus | writes the plan |
| `plan-reviewer` | opus | fresh check of the plan; edits what it can settle |
| `coder` | sonnet | executes the plan and writes the tests its steps name (opus when a step still needs design) |
| `quality-engineer` | sonnet | builds, runs the suite, exercises each criterion |
| `ui-verifier` | sonnet | screenshot evidence |
| `code-reviewer` | opus | independent review, convention capture |
| `env-ops` | sonnet | dependencies, scaffolding, migrations, runbooks |

## Stages

`pick → locate → plan → plan review → execute → gates → review → merge → walkthrough note`

1. **Locate and plan:** up to three `locator`s, one question each; then the `planner` writes the plan at `.codery/run/<issue>-<slug>/plan.md`. It is gitignored and does not travel between worktrees, so every brief to the plan reviewer, `coder` and `code-reviewer` carries its **absolute** path. A `plan-critical` verdict or a CRITICAL gap parks the item with a decision note.
2. **Execute:** the `coder` works the plan's steps and writes their tests. **Gates** run on its SHA: `quality-engineer`, `ui-verifier` for anything visible, CI.
3. **Review:** a fresh `code-reviewer`, then self-merge.

**Small path:** a one-line or copy-only fix skips locate, plan and plan review; the lead's brief stands in for the plan, and it still gets review.

## Review loop

- The reviewer is a fresh-context subagent, never a messaging teammate. The loop exits when no Critical or Important findings remain.
- Nits get one fix pass with no re-review; the lead checks that the pass's diff touches only the Nit lines.
- The reviewer reports whether the change **established** a convention, **violated** one, or neither. An established one comes back as a four-part entry (rule, why, minimal example, gotcha); the fix-pass `coder` writes it into [`docs/conventions.md`](docs/conventions.md) in the same PR and the lead checks it.

## Gates

Four non-negotiable review invariants, checked on every visible change:

- **(a) SEO / AI discoverability.** Public pages are **server-rendered** (no client-only content); unique `<title>` + `<meta description>` per page; `schema.org` structured data (`Organization` site-wide, `Person` on About, `Service` on each solution page, `Article` on each blog post); `robots.txt` **allows** AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended — do not block them); `sitemap.xml` auto-regenerates; canonical URLs; content is text, not images; preserved URLs with **301 redirects** for any path that changes. [PRD §10.1, §11]
- **(b) Brand fidelity.** Styles come **only** from the "Flowlyst Design System" tokens and the page designs in the "flowlyst Website" project (pulled into `design/` for the task at hand) — colors, type, and spacing are never invented.
- **(c) Accessibility + performance.** WCAG 2.1 AA; Lighthouse **≥ 90** mobile; **LCP < 2.5s**; **CLS < 0.1**. [PRD §10.2, §10.3]
- **(d) Lead capture is sacred.** The demo, contact, and newsletter forms must **verifiably deliver** — submission, validation, and the notification/persistence path all proven, not assumed. [PRD §8]

- **Quality and UI evidence:** `quality-engineer` and `ui-verifier` hold the full rules. UI is never "done" from code inspection, and Tural is never asked to confirm what a screenshot proves.
- **Beyond (c):** keyboard-navigable nav and forms, alt text on all imagery, visible focus indicators, one H1 per page, the Corpowid accessibility widget preserved; Lighthouse is measured on the homepage and each solution page (mobile).
- **Verification scales to the delta:** a review fix pass re-runs only the touched checks, plus `ui-verifier` if structure or layout changed. `quality-engineer` re-runs at the final SHA only when a fix pass changed behavior beyond Nits.
- **What runs:** `.claude/hooks/tracking-gate.sh` denies a `gh pr create` that cites no `#N` once (the identical retry proceeds), and the SessionStart check reports unrecorded packages, and the TeammateIdle hook holds an idle teammate until it reports (twice, then allowed). The rest of this file is prose, not enforced.

## Tural decides

His explicit word comes before: production/domain cutover, spending money, deleting anything outside this repo, any outward-facing act (emails, publishing), operating Vercel or Neon (agents prepare a runbook, he executes), brand/positioning calls not settled in the PRD, and the **technology gate**: a new library, a new third-party service, or a major version bump. These reach him as a one-screen comparison (options, what each buys, what it costs, the recommendation), in session or, when he is not there, as the issue's decision note while the item parks and other work continues, with a ping to him if a channel is available. The decision lands as an ADR in [`docs/adr/`](docs/adr/README.md) with the comparison under Alternatives considered. [`docs/stack.md`](docs/stack.md) records what is in use; a SessionStart check reports any `package.json` name missing from it and the ADRs. House style is in [`docs/conventions.md`](docs/conventions.md).

## Orchestrator rules

1. Never write source, config or test files directly; delegate. One exception: pulling design files via **DesignSync** is lead-session glue (subagents cannot reach it), committed before delegating.
2. Never do token-heavy exploration; use `locator`s and consume the summaries.
3. Never run workhorse tasks (builds, tests, installs, scaffolds, migrations) and never operate Vercel or Neon.
4. Delegate everything executional; trivial glue (a one-line fix, opening a PR on a reviewed branch) may stay inline.
5. A precise brief is the only real output; spend tokens like they cost money. Every brief carries goal, context (point, don't paste), acceptance criteria, boundaries, return format (a concise summary plus any decisions the lead needs to make), and the plan's absolute path.
6. **Evidence before done-claims.** Nothing is "done", "verified" or "working" without ran-X-observed-Y evidence, at every agent boundary and in every PR body. UI claims need screenshots.

## Cost discipline

1. At most five agents at once; more needs Tural's go-ahead.
2. Agents report on completion or a blocker only. Never act on, or reply to, a bare idle notification.
3. Brief completely, then wait. No nudges to an in-flight agent; batch follow-ups into the next assignment. A crossing message gets one reply with the current SHA and evidence pointer, and no re-run.
4. Scope verification to the delta: copy/docs-only diffs get a `code-reviewer` delta-confirm; structural or layout changes add `ui-verifier`; the `quality-engineer` fresh-clone gate runs once, on the executor's SHA (plus a merged-main sweep when phase-relevant), and re-runs at the final SHA only after a fix pass that changed behavior beyond Nits (see Gates), never per intermediate SHA.
5. Retire an agent when its lane completes; a fix pass gets a fresh spawn with a tight brief.
6. One lane, one agent: a new item gets a fresh spawn briefed against durable artifacts, never a warm agent; reuse one only for the immediate continuation of its current lane (e.g. its own fix pass). Before retiring one whose learnings the next item needs, have it write them to the durable home. The lead consumes summaries, not transcripts, and at a phase boundary prefers a fresh session over marathoning with accumulated context.

## Workflow

- **GitHub Issues** (`flowlyst-io/flowlyst-website`) is the tracker. Items are written at outcome altitude. Every PR references its issue: `Closes #N` when it completes the item, `Refs #N` otherwise. A PR that tracks no issue says `No issue` in its body and passes the tracking gate on the deny-once retry.
- Trunk-based, branches `feature/<issue>-<slug>`, squash merge, `main` always deployable to staging. Conventional Commits as style only.
- PRs self-merge once the gates pass. Every visible change gets a walkthrough note for Tural: what changed, the staging URL, what to try. His feedback becomes issues.
- Overnight, unattended runs are the intended mode: a blocked item is parked with a decision note on its issue and work continues.
- Sessions run in auto mode, never `bypassPermissions`.

## Phase discipline

Issues are roughly sequenced. **Don't start a phase until the previous one's acceptance checklist has passed.** After each phase, a retrospective goes in `docs/retrospective/NN-name.md` — concise, AI-first: what was built, what surprised you, what the next phase should know.

## Stack

**Next.js (latest stable, App Router) on Vercel, with TypeScript throughout**, is decided by Tural. Every other choice goes through the technology gate and is recorded in `docs/stack.md` and `docs/adr/`; issue #1 holds the history.
