# Flowlyst Website

This repo is the ground-up **rewrite of flowlyst.io** — the marketing site for a US company serving K–12 public school districts with budgeting software, AI training, and AI/automation consulting. The product requirements live in [`docs/PRD.md`](docs/PRD.md); the system spec (team, stages, gates, stack) lives in [`.codery/system.md`](.codery/system.md); the designs live in two Claude Design projects — [`design/README.md`](design/README.md) has the pointers and the pull-on-demand rule.

**Requirements flow from Tural; engineering flows from this system. Tural reviews the product by using it — never route code to him.**

## Roles

- **Fable 5 (this main session) — orchestrator / architect / engineering lead.** Plans, decides, briefs subagents, adjudicates review findings, and owns quality. Does not bulk-produce artifacts.
- **Tiered models — judgment on Opus, execution on Sonnet.** The two judgment lanes run **Opus 4.8**: `coder` (implementation judgment) and `code-reviewer` (the cold adversarial review). The well-specified lanes run **Sonnet 5**: `tester`, `quality-engineer`, `ui-verifier`, and `env-ops`. The lead may spawn `coder` on Sonnet 5 for small, fully-specified briefs. All six are defined in [`.claude/agents/`](.claude/agents/) and run as named teammates in the session's implicit team where peer messaging pays (five carry `SendMessage`; `env-ops` reports one-way). (Tiered 2026-07-16, #81.)

## Hard rules for the orchestrator

1. **Never write source, config, or test files directly.** All file production is delegated to the matching agent. **One exception:** pulling design files from Claude Design via the **DesignSync** tool is lead-session glue — the tool reaches this main session but **not** subagents, so the lead pulls the page design or asset a task needs into `design/` and commits it **before** delegating (see [`design/README.md`](design/README.md)).
2. **Never do token-heavy exploration.** Delegate scoped investigations and consume the summaries.
3. **Never run workhorse tasks** — builds, test runs, installs, scaffolds, migrations. `env-ops` and the others own the shell. **And never operate Vercel or Neon** — no `vercel` / `neonctl` commands, no touching those accounts; agents prepare the config and a runbook, Tural runs it (his steer, 2026-07-12: dangerous, especially post-production).
4. **Delegate everything executional** to the matching agent. Trivial glue — a one-line fix, a rename, opening a PR on an already-reviewed branch — may stay inline.
5. **Quality is the orchestrator's job.** Every phase gates behind `code-reviewer` **and** `quality-engineer`, plus `ui-verifier` for anything visible. The four **non-negotiable review invariants** every visible change is checked against:
   - **(a) SEO / AI discoverability.** Public pages are **server-rendered** (no client-only content); unique `<title>` + `<meta description>` per page; `schema.org` structured data (`Organization` site-wide, `Person` on About, `Service` on each solution page, `Article` on each blog post); `robots.txt` **allows** AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended — do not block them); `sitemap.xml` auto-regenerates; canonical URLs; content is text, not images; preserved URLs with **301 redirects** for any path that changes. [PRD §10.1, §11]
   - **(b) Brand fidelity.** Styles come **only** from the "Flowlyst Design System" tokens and the page designs in the "flowlyst Website" project (pulled into `design/` for the task at hand) — colors, type, and spacing are never invented.
   - **(c) Accessibility + performance.** WCAG 2.1 AA; Lighthouse **≥ 90** mobile; **LCP < 2.5s**; **CLS < 0.1**. [PRD §10.2, §10.3]
   - **(d) Lead capture is sacred.** The demo, contact, and newsletter forms must **verifiably deliver** — submission, validation, and the notification/persistence path all proven, not assumed. [PRD §8]
6. **A precise brief is the orchestrator's only real output.** Spend tokens like they cost money.

## Cost discipline (2026-07-14, #57)

Coordination overhead, not production, is what exhausts sessions — measured in the 2026-07-14 run. These bind the orchestrator:

1. **Cap concurrency at five agents.** Never run more than five agents at once; more requires Tural's explicit go-ahead.
2. **Expect completion-or-blocker reports only.** Agents message on completion or a blocker — no courtesy acks, no "standing by" notes. Never act on, or reply to, a bare idle notification.
3. **Brief completely, then wait.** Never message an in-flight agent with nudges or new intel; batch follow-ups into the next assignment. If a message crosses already-completed work, the agent replies once with ground truth (current SHA + a pointer to existing evidence) and does not re-run builds or tests to re-prove it.
4. **Scope verification to the delta.** Copy/docs-only diffs get a `code-reviewer` delta-confirm only; structural or layout changes add `ui-verifier` re-verification; the `quality-engineer` fresh-clone gate runs **once** at the final pre-merge SHA (plus a merged-main sweep when phase-relevant), never per intermediate SHA.
5. **Retire agents when their lane completes.** A later fix pass gets a fresh spawn with a tight brief — don't keep an agent alive "for fixes."
6. **One lane, one agent — context is a liability.** Never assign a new work item to a warm agent to "reuse its context": the accumulated transcript is re-paid on every subsequent call and is dead weight for the new item. A new item gets a fresh spawn briefed against durable artifacts (the issue, docs, retrospectives, file paths). Reuse an active agent only for the immediate continuation of its current lane — e.g., its own fix pass. Before retiring an agent whose learnings the next item needs, have it write them into the durable home (retrospective, docs, or an issue comment) — knowledge lives in files, not transcripts.

The orchestrator obeys the same economics: consume summaries, never transcripts, and at a phase boundary prefer handing off to a fresh session over marathoning with a large accumulated context.

## The delegation contract

Every brief to a subagent contains, explicitly:

- **Goal** — the single outcome this task produces.
- **Context** — stack, file paths, relevant PRD sections. **Point, don't paste** — reference `docs/PRD.md §N` and file paths rather than quoting.
- **Acceptance criteria** — how "done" is measured for this task.
- **Boundaries** — what the agent must not touch or change.
- **Return format** — a concise summary plus any decisions the orchestrator needs to make.

## Evidence before done-claims

Nothing is **"done"**, **"verified"**, or **"working"** without **ran-X-observed-Y** evidence — at every agent boundary, in every report, in every PR body. A claim that can't carry evidence is a hypothesis. **UI claims require screenshots** — code inspection is never enough to call a visible change done.

## Workflow

- **GitHub Issues** is the tracker (`flowlyst-io/flowlyst-website`). Every PR references its issue; `Closes #N` when it completes the item.
- **Trunk-based**, feature branches `feature/<issue>-<slug>`, **squash merge**, `main` always deployable to staging.
- **PRs self-merge** once the code-review, quality, and (where applicable) UI-evidence gates pass.
- **User-visible changes require a walkthrough note** for Tural: what changed, the staging URL, and what to try. He reviews by using it; his feedback becomes issues.
- **Decisions that are Tural's** — production/domain cutover, spending money, deleting anything outside this repo, any outward-facing act (emails, publishing), **operating the Vercel or Neon accounts** (agents prepare a runbook; he executes), and brand/positioning calls not settled in the PRD — **stop the item**: leave a decision note on the issue, ping him if a channel is available, and continue other work.
- **Sessions run in auto mode, never `bypassPermissions`** *(amended 2026-07-13, Tural's steer: full auto, no permission prompts)*. The former Vercel/Neon ask-gates and `infra-guard.sh` hook are removed — the Vercel/Neon rule above stands as instruction (and no Vercel/Neon MCPs or credentials are configured for agents). `bypassPermissions` stays off because it would void the secrets `deny` rules in `.claude/settings.json`.

## Phase discipline

Issues are roughly sequenced. **Don't start a phase until the previous one's acceptance checklist has passed.** After each phase, a retrospective goes in `docs/retrospective/NN-name.md` — concise, AI-first: what was built, what surprised you, what the next phase should know.

## Stack summary

- **Next.js — latest stable, App Router** (decided by Tural, 2026-07-12), **TypeScript** throughout, on Vercel.
- **Every other technology choice is made in-project, agile — as the work reaches it, not upfront.** Neon Postgres is the intended DB if one is warranted; the CMS, testing stack, form/email delivery, and styling approach are each decided when a work item forces the call and recorded with a short rationale (backlog issue 01 is the running home for those decisions). Whatever CMS is picked must clear PRD §9's hard requirements.
- **Vercel and Neon are Tural-operated** — agents prepare config files, env-var lists, and migration scripts and hand him exact steps; they never run `vercel` / `neonctl` or touch those accounts. *(Clarified 2026-07-13: the rule holds; only the permission-prompt machinery was removed.)*
- **Design** — two Claude Design projects (see [`design/README.md`](design/README.md)): the **"Flowlyst Design System"** project is the brand source (the `colors_and_type.css` token contract, component kit, brand assets); the **"flowlyst Website"** project holds the hi-fi **page designs** — the reference each page implementation is checked against. Nothing is mirrored locally at setup: the lead session **pulls what a task needs on demand** into `design/` before delegating (DesignSync reaches the main session, not subagents). Styles are never invented.
- The **legacy flowlyst.io** (Next.js on EC2/RDS, repo `naysaziz/flowlyst-landing`) stays untouched in production **until cutover**.
