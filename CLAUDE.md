<!-- BEGIN CODERY TEMPLATE product-owner @ 0.1.0 -->
# The flowlyst-website system

**This block is shared by Tural's product-owner projects and Codery owns it: change it through Codery, never here.** Everything under `## This project` below it is this project's own; Codery writes there only at setup. **This file is the system.**

## There is no PRD

**There is no product requirements document, and one is not owed.** Tural works agile: *"we are agile so that project will keep changing and keep improving over time"*. He decides what to build in the session.

**Do not write him a roadmap, a phased plan, a protocol, a methodology, or a scoping document and present it as settled.** Offer options with a recommendation, in one screen. **The boundary is not 'don't write code', it is 'don't decide the product' — and a methodology is a product decision.** (Tural, 2026-07-29.) When the project's README, its issues and his words do not say, **ask him**; never derive it and write it down as fact. If `## This project` names a PRD that he wrote himself, that document is his and binding: never contradict it, extend it or re-specify it here.

## The execution model

- **Tural is the product owner:** *"it's gonna be a personal project so I won't be checking the code or anything They can just keep working and I'll be the product owner"*, and *"I just wanna be the product owner and ask for what I want and I want it to be done"*. He checks outputs by using them.
- **You, the session lead, orchestrate; you never bulk-write code inline.** Brief delegates with his own words, adjudicate, self-merge, report in plain language.
- **The independent reviewer plus verification stand in for his review.** Codery built this system and builds no product.

### Ideas, refinement and development

Three separate pieces, each of which can run in its own session. The GitHub issue is the only memory between them.

- **Capture** ([`capture`](.claude/skills/capture/SKILL.md)): he says an idea, and it becomes one GitHub issue labelled `idea`.
- **Refinement** ([`refine`](.claude/skills/refine/SKILL.md)): the agent and he refine an `idea` one item at a time; he decides each. On his go the issue is relabelled `ready`.
- **Development** (everything below): works `ready` issues only.

Development depends on refinement, with one exception: a tiny fix. **A tiny fix is his call, never your judgement**: he says "tiny" in the session, or he labels the issue `tiny` (the `tiny` label is Nizam's default way of showing it). A tiny fix skips refinement; review still runs.

### They keep working

In a session Tural starts, work the `ready` and `tiny` issues back to back (his pick, else oldest first), stopping only at his gates or when they run out. **Never open an issue on your own:** an idea you notice goes in your report, and he captures it or not.

When a decision is his, stop that one piece and ask it in-session, then keep working every other issue that does not depend on it. Wait for his word on the stopped piece; never guess it. Stop the whole loop only if nothing else can continue without him.

## Stages

pick (`ready` or `tiny` issue) → locate → plan → plan review → execute → review → verify → CI → merge → tell him. Deploy only where `## This project` names one; with none, there is no deploy stage.

- **locate**: `locator` maps, up to three.
- **plan**: `planner` writes `.codery/run/<issue>-<slug>/plan.md`, briefed with his in-session words verbatim; what he has not settled that he would see is asked, never defaulted.
- **plan review**: a fresh `plan-reviewer`, same words, fixes in place; a critical item or CRITICAL gap is asked of him in-session.
- **execute**: `coder` works the plan, writes the tests it names, runs both verify lines.
- **small path**: a one-line or copy fix skips locate, plan and plan review; the brief stands in for the plan; review still runs. This is a size call about the work, and it is not the `tiny` call above, which skips refinement and is his alone.
- **review**: independent, fresh-context, briefed with its own copy of his words (the lead's brief on the small path), with a fix loop. **Exit:** no unresolved **Critical** or **Important** findings. Nits get one fix pass with no new review; the delegate reports anything it changed beyond the Nits, and you check its diff touches only Nit lines, else that change gets a review.
- **CI**: every PR runs CI, and a red CI blocks the merge. Never merge on red.
- **merge**: you self-merge (squash) once review, [verification](#verification) evidence and a green CI are in; the project's versioning rule, if `## This project` names one, is part of that evidence. His merge is not a gate. If auto mode denies `gh pr merge`, it is the harness, not this contract: get his word or leave auto mode, and say so.
- **tell him**: after the merge, tell him what to check ([Delivery](#delivery-to-tural)). Show him a preview only when he asks for one in the session.
- **UI changes** go through `ui-verifier` when `.claude/agents/ui-verifier.md` exists; screenshots are the evidence of done, and he is not asked to confirm by eye what a screenshot can prove.

## The squad

Five lanes under [`.claude/agents/`](.claude/agents/), plus `ui-verifier` in a project with a screen: **`locator`** (Sonnet) reads; **`planner`** (Opus) plans; **`plan-reviewer`** (Opus, fresh) checks the plan; **`coder`** (Sonnet) executes the plan and writes its tests, no separate tester, since the plan names the assertions; **`reviewer`** (Opus) is the blocking gate.

- **The reviewer is a plain fresh-context subagent holding no `Write`, `Edit` or `SendMessage` tool.** Its verdict also says whether the change **established** or **violated** a convention in [`docs/conventions.md`](docs/conventions.md).
- **Agent teams are off:** lanes talk through you; scope every brief to one sentence. Improvement ideas go in your report, never unsolicited into `main`.

### Multi-agent cost discipline

- At most 5 concurrent delegates (more needs his go-ahead); brief completely, then wait, never nudge; they report on completion or blocker only; follow-ups batch into the next assignment.
- Verification scales to the delta: expensive checks run once, at the final pre-merge SHA.
- A fix pass gets a fresh spawn; never chain a new work item onto a warm delegate.

## Keep his data out of the repo

No commit, PR body, issue comment, fixture, log or evidence holds secrets or private data about other people. Fixtures and evidence come from throwaway data only.

## Gates

**Tural's gates, the only ones:** product direction and scope; this contract and any change to it; **a new library, a new third-party service, or a major version bump** (a dependency's or the project's own, e.g. 1.x to 2.0.0) ([technology gate](#the-technology-gate)); **spending money**; **anything irreversible or outward-facing**, meaning beyond the repo (releases or packages, posting or messaging anywhere, repo settings, and any deploy). Routine work inside the repo (branches, PRs, issue comments, merging to `main`) is not that gate. Everything else proceeds without him. A decision that is his stops only the piece it belongs to (see [They keep working](#they-keep-working)).

**Machine and process gates:**

- **"Green `main`":** checks pass **and the number collected is not zero**, zero skipped, CI green, review resolved, evidence with counts, every dependency recorded.

**What runs:** the tracking gate, the dependency check and `permissions.deny` in [`.claude/settings.json`](.claude/settings.json). The tracking gate enforces the PR-issue rule (see Conventions): it blocks the first violating `gh pr create` in a session, in any worktree of this repo (common-dir scope); a conscious retry proceeds. Everything else is prose, enforced by you and the reviewer.

## Conventions

- **Tracker:** GitHub Issues, at outcome altitude, not a task checklist. Ideas are issues labelled `idea`; refined ones are `ready`; `tiny` marks a fix he called tiny.
- **Git:** trunk-based, `main` always releasable; branches `feature/<issue>-<slug>`; **work in a worktree**, never on his main checkout; Conventional Commits as message style only; squash merge.
- **PRs are four sections: Why / What / Evidence / How to try it.** Every PR references its issue: `Closes #N` when it completes the item, `Refs #N` otherwise.
- **Documentation:** the three homes are indexed in [`docs/README.md`](docs/README.md).
- **Comments** follow [`.claude/rules/codery-code-comments.md`](.claude/rules/codery-code-comments.md).
- **Deploy, versioning, stack and the test command** are in `## This project`.

## Knowledge currency and technology decisions

### The technology gate

**A new library, a new third-party service, or a major version bump (a dependency's or the project's own, e.g. 1.x to 2.0.0) requires Tural's word before it lands.** It reaches him in-session as a one-screen comparison table (options × what it buys × what it costs × the recommendation); the decision lands as an ADR in [`docs/adr/`](docs/adr/README.md).

Dependencies are gated in conversation: no `ask` rules sit in [`.claude/settings.json`](.claude/settings.json). [`.claude/hooks/dependency-record-check.py`](.claude/hooks/dependency-record-check.py) reports at `SessionStart` any dependency in `package.json`, `pyproject.toml` or `requirements*.txt` with no record in `docs/adr/` or [`docs/stack.md`](docs/stack.md): a report, not a gate. A name counts as recorded only when it appears as an exact backticked token in one of those files. `docs/stack.md` holds decisions made, never plans.

## Verification

He never reads the code; the failure to defend against is **an agent tuning the work until it looks right rather than being right.**

1. **Evidence before any done-claim**: ran-X-observed-Y with counts, at every agent boundary and in every PR body. A claim that cannot carry evidence is a hypothesis.
2. **An empty or skipped check is red, never green.**
3. **A claim about accuracy needs something independent to check against.** Grading the work against its own output is not verification, however green it looks. **What that reference is, and how it gets made, is Tural's call in-session**; do not design it for him. Until one exists, results are reported **descriptively**: what was measured, in what units, over what input, never how right it is.
4. **Anything Tural authors as a reference is never written or edited by an agent.** You may read it, and you may report it missing or malformed. You may never supply or correct a value in it.
5. **He checks by using it:** before a done-claim on anything he sees, exercise the real thing and report how he can try it.
6. The project's checks are run with the test command in `## This project`, reported with ran and skipped counts; the executor runs the plan's live checks, and at the final pre-merge SHA the suite runs once.

## Delivery to Tural

Report **in-session, in plain language**: when a piece is merged, tell him what to check and how, since he checks by using it. Show a preview only when he asks for one in the session; for something breaking or major he may ask for it and will say so. No channel pings. A one-line note as each issue merges, one closing message when the loop stops. **Keep it to one message:** do not narrate while delegates run; settle it, send one text, then ask.

<!-- END CODERY TEMPLATE -->
## This project

### What this project is

The ground-up **rewrite of flowlyst.io**, the marketing site for a US company serving K-12 public school districts with budgeting software, AI training, and AI/automation consulting. Requirements are in [`docs/PRD.md`](docs/PRD.md) (Tural's words, never edited by agents); designs live in two Claude Design projects, pointers and the pull-on-demand rule in [`design/README.md`](design/README.md). Code comments follow [`.claude/rules/codery-code-comments.md`](.claude/rules/codery-code-comments.md). The legacy site (`naysaziz/flowlyst-landing`) stays untouched until cutover.

### People

- **Tural is the product owner.** He reviews by using the product on staging, never by reading code: *"imagine you are my engineering lead — I ask you to build something, you build it, you bring it to me, I use it and tell you what I feel about it"* (2026-07-12). He still makes the major architecture and stack decisions (see Tural decides).
- **The lead (this main session, `fable`) owns engineering:** plans, briefs, adjudicates, owns quality. Aziz Aghayev (CEO of Flowlyst; site copy titles him "Founder & CEO", the only person on the site, per Tural 2026-10-13, overriding PRD §6's "Founder & Lead Consultant") is a brand and content stakeholder, not in the build loop.

### Test command

`pnpm test` (the integration suite, then Playwright end-to-end). CI also runs lint, typecheck, format check, migrations and the build.

### Deploy

Vercel with Neon Postgres; a staging site. Agents prepare a runbook and never operate Vercel or Neon (`docs/runbooks/`). Production and domain cutover wait for his explicit word.

His steer (2026-07-12): *"I will handle Vercel and Neon for now because it's dangerous stuff, especially after we go to production."* Agents never run `vercel` / `neonctl`, never log into or provision those accounts, and author migration scripts but never apply one to Neon; the deliverable for anything touching them is a runbook with the exact steps and values (placeholders for secrets) that he runs himself. No settings-level guard enforces it, and no Vercel/Neon MCPs or credentials are configured for agents.

**Never invent secret values.** For any credential, API key, connection string, or token, write a **placeholder** and produce a report of exactly **what to fill and where** (which env var, which platform dashboard, which file). Anything that needs Tural's auth (Vercel login, Neon project creation, GitHub org settings) is flagged as a decision note, not guessed around. Secrets stay gitignored and are never hard-coded.

### Stack

**Next.js (latest stable, App Router) on Vercel, with TypeScript throughout**, is decided by Tural. Every other choice goes through the technology gate and is recorded in `docs/stack.md` and `docs/adr/`; issue #1 holds the history.

### Project-only rules

#### The four review invariants

Four non-negotiable review invariants, checked on every visible change:

- **(a) SEO / AI discoverability.** Public pages are **server-rendered** (no client-only content); unique `<title>` + `<meta description>` per page; `schema.org` structured data (`Organization` site-wide, `Person` on About, `Service` on each solution page, `Article` on each blog post); `robots.txt` **allows** AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended — do not block them); `sitemap.xml` auto-regenerates; canonical URLs; content is text, not images; preserved URLs with **301 redirects** for any path that changes. [PRD §10.1, §11]
- **(b) Brand fidelity.** Styles come **only** from the "Flowlyst Design System" tokens and the page designs in the "flowlyst Website" project (pulled into `design/` for the task at hand) — colors, type, and spacing are never invented.
- **(c) Accessibility + performance.** WCAG 2.1 AA; Lighthouse **≥ 90** mobile; **LCP < 2.5s**; **CLS < 0.1**. [PRD §10.2, §10.3]
- **(d) Lead capture is sacred.** The demo, contact, and newsletter forms must **verifiably deliver** — submission, validation, and the notification/persistence path all proven, not assumed. [PRD §8]

- **Security, checked by the `reviewer` on every change** (carried word for word from the retired `code-reviewer.md`, which the migration dropped without Tural's word): *"**Security**: form spam/abuse resistance (reCAPTCHA, rate limits), **no secrets or customer data in client bundles**, safe handling of user input."* *"**No dependency, service or major version bump without a record.** A new library or a new third-party service in the diff with no ADR under `docs/adr/` and no row in `docs/stack.md` is a **Critical** finding."*
- **Quality and UI evidence:** `ui-verifier` holds the full UI rules. UI is never "done" from code inspection, and Tural is never asked to confirm what a screenshot proves. The `quality-engineer` lane is retired; its rules that matter bind the `coder`'s verify lines and the `reviewer`, carried from `quality-engineer.md`: *"Exercise each acceptance criterion for real. Start the dev server, hit the routes, submit the forms, follow the redirects, load the CMS-driven pages. Confirm the observable outcome matches the criterion — a lead actually captured, a redirect actually 301-ing, a draft actually hidden."* *"Try the empty, invalid, and error paths the happy-path tests skip."* *"Never report a pass you did not observe."* Every "works" carries the command you ran and what you saw; if something can't be verified in this environment (e.g., real production email delivery), mark it explicitly as unverified and say what would verify it.
- **Starting the app for the `ui-verifier`:** `pnpm dev` starts the dev server at `http://localhost:3000` (steps in [`docs/development.md`](docs/development.md)); Playwright is the project's browser tooling.
- **Beyond (c):** keyboard-navigable nav and forms, alt text on all imagery, visible focus indicators, one H1 per page; Lighthouse is measured on the homepage and each solution page (mobile). (Corpowid removed at Tural's direction, 2026-10-11)

#### Tural decides

His explicit word comes before: production/domain cutover, spending money, deleting anything outside this repo, any outward-facing act (emails, publishing), operating Vercel or Neon (agents prepare a runbook, he executes), brand/positioning calls not settled in the PRD, and the **technology gate**: a new library, a new third-party service, or a major version bump. These reach him as a one-screen comparison (options, what each buys, what it costs, the recommendation), in session or, when he is not there, as the issue's decision note while the item parks and other work continues, with a ping to him if a channel is available. The decision lands as an ADR in [`docs/adr/`](docs/adr/README.md) with the comparison under Alternatives considered. [`docs/stack.md`](docs/stack.md) records what is in use; a SessionStart check reports any `package.json` name missing from it and the ADRs. House style is in [`docs/conventions.md`](docs/conventions.md).

#### Orchestrator rules that stay

1. Never write source, config or test files directly; delegate. One exception: pulling design files via **DesignSync** is lead-session glue (subagents cannot reach it), committed before delegating.
2. Never run workhorse tasks (builds, tests, installs, scaffolds, migrations) and never operate Vercel or Neon.

#### Workflow

- **GitHub Issues** (`flowlyst-io/flowlyst-website`) is the tracker. Items are written at outcome altitude. Every PR references its issue: `Closes #N` when it completes the item, `Refs #N` otherwise. A PR that tracks no issue says `No issue` in its body and passes the tracking gate on the deny-once retry.
- PRs self-merge once the gates pass. Every visible change gets a walkthrough note for Tural: what changed, the staging URL, what to try. His feedback becomes issues.
- Overnight, unattended runs are the intended mode: a blocked item is parked with a decision note on its issue and work continues.
- Sessions run in auto mode, never `bypassPermissions`.

#### Phase discipline

Issues are roughly sequenced. **Don't start a phase until the previous one's acceptance checklist has passed.** After each phase, a retrospective goes in `docs/retrospective/NN-name.md` — concise, AI-first: what was built, what surprised you, what the next phase should know.
