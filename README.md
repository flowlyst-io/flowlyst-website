# flowlyst-website

The ground-up rewrite of **flowlyst.io** — the marketing site for flowlyst, a US company serving K–12 public school districts with budgeting software, AI training, and AI/automation consulting.

## How this repo is built

This site is built by a **plan-first squad**. A main session acts as engineering lead; a read-only locator maps the code, an Opus planner writes the plan, a fresh Opus plan reviewer checks it, and a Sonnet coder executes it and writes its tests. Every change then passes a **quality gate** that exercises acceptance criteria for real, **screenshot verification** for anything user-visible, CI, and an **independent fresh-context code review** on Opus; PRs **self-merge** once those pass. **Tural reviews by using the product on staging** — never by reading code — and his feedback becomes new issues. His explicit word is required only for decisions that are his: production cutover, spend, deletions outside this repo, outward-facing acts, brand calls not settled in the PRD, and a new library, third-party service, or major version bump.

## Where things are

- [`docs/PRD.md`](docs/PRD.md) — the product requirements: what the site is, who it serves, the 15 page templates, forms, CMS needs, and non-functional requirements.
- [`docs/stack.md`](docs/stack.md), [`docs/adr/`](docs/adr/README.md), [`docs/conventions.md`](docs/conventions.md) — what is in use and where each piece came from, the decision records behind load-bearing choices, and the house style for writing code.
- [`CLAUDE.md`](CLAUDE.md) — the orchestration contract, loaded every session.
- [`design/`](design/) — pointers to the two Claude Design projects the site is designed in: **"Flowlyst Design System"** (brand tokens/components) and **"flowlyst Website"** (the hi-fi page designs). The designs live there, not here; the lead session pulls what a task needs on demand. See [`design/README.md`](design/README.md).

## Local development

The app is a **Next.js (App Router)** site with **Payload CMS** embedded (admin at
`/admin`) on **Postgres**. To go from a fresh clone to a running dev server and
admin, follow [`docs/development.md`](docs/development.md).

## Legacy site

The current **flowlyst.io** runs on the legacy `naysaziz/flowlyst-landing` monorepo (Next.js on EC2/RDS). It **stays in production, untouched, until cutover** — the DNS move is a decision-gated launch step, not part of routine work here.
