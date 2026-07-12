# flowlyst-website

The ground-up rewrite of **flowlyst.io** — the marketing site for flowlyst, a US company serving K–12 public school districts with budgeting software, AI training, and AI/automation consulting.

## How this repo is built

This site is built by an **orchestrator + workhorse agent system**. A **Fable 5** main session acts as engineering lead — it plans, briefs, adjudicates review findings, and owns quality; it never bulk-produces artifacts. All production work (code, tests, environment, screenshots) runs through **Opus 4.8** subagents. Every change passes an **independent code review** and a **quality gate** that exercises acceptance criteria for real, plus **screenshot verification** for anything user-visible. PRs **self-merge** once those gates pass. **Tural reviews by using the product on staging** — never by reading code — and his feedback becomes new issues. His explicit word is required only for decisions that are his: production cutover, spend, deletions outside this repo, outward-facing acts, and brand calls not settled in the PRD.

## Where things are

- [`docs/PRD.md`](docs/PRD.md) — the product requirements: what the site is, who it serves, the 15 page templates, forms, CMS needs, and non-functional requirements.
- [`.codery/system.md`](.codery/system.md) — the system spec: team, stages, gates, tracker, git, verification stack, stack choices.
- [`CLAUDE.md`](CLAUDE.md) — the orchestration contract, loaded every session.
- [`design/`](design/) — pointers to the two Claude Design projects the site is designed in: **"Flowlyst Design System"** (brand tokens/components) and **"flowlyst Website"** (the hi-fi page designs). The designs live there, not here; the lead session pulls what a task needs on demand. See [`design/README.md`](design/README.md).

## Legacy site

The current **flowlyst.io** runs on the legacy `naysaziz/flowlyst-landing` monorepo (Next.js on EC2/RDS). It **stays in production, untouched, until cutover** — the DNS move is a decision-gated launch step, not part of routine work here.
