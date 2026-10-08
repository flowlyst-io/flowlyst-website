<!-- Flowlyst website stack record. Edit in place; CLAUDE.md is the contract. -->

# Stack

What is in use in this repo, and where each piece came from. This is the record the `SessionStart` dependency check reads: **a package counts as recorded only when its exact name appears in backticks here or in an [ADR](./adr/README.md)**. A name written without backticks is not seen. Lockfile transitives are not checked; each is covered by its direct parent. Version bumps are not detected; the technology gate covers them in conversation.

New entries come through the technology gate in [`CLAUDE.md`](../CLAUDE.md#tural-decides): a new library, a new third-party service, or a major version bump is Tural's call, reaches him as a one-screen comparison, and lands as an ADR. An entry here records a decision that was made, not a plan.

The decisions before this record existed were logged on issue #1 (Architecture decision log); the first tier points back there and adds nothing to it.

---

## Decided (issue #1)

| What                                            | Packages                     | Decided                                              | By                                                                  |
| ----------------------------------------------- | ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Next.js (latest stable), App Router, TypeScript | `next`, `typescript`         | 2026-07-12, #1 table row                             | Tural                                                               |
| Vercel + Neon Postgres                          | services, no package         | 2026-07-12, #1 table row                             | Tural                                                               |
| Payload CMS 3, embedded in the Next.js app      | `payload`                    | 2026-07-13, #1 table row                             | Tural, on orchestrator recommendation                               |
| Tailwind CSS v4                                 | `tailwindcss`                | 2026-07-13, #1 table row                             | Tural, on orchestrator recommendation                               |
| Resend for email delivery                       | `@payloadcms/email-resend`   | 2026-07-13 row; 2026-07-14 comment names the package | Tural, on orchestrator recommendation (row); orchestrator (comment) |
| Vitest + Playwright for testing                 | `vitest`, `@playwright/test` | 2026-07-13, #1 table row                             | Tural, on orchestrator recommendation                               |
| Vercel Hobby (free) plan for staging            | service, no package          | 2026-07-13, #1 comment                               | Tural                                                               |

## Companion of a decided choice

Each is a peer dependency of a decided package, a type package for one, or the decided product's own scoped package. The parent is named; no separate decision is recorded.

| Package                        | Parent                         |
| ------------------------------ | ------------------------------ |
| `@payloadcms/db-postgres`      | `payload` (scoped package)     |
| `@payloadcms/next`             | `payload` (scoped package)     |
| `@payloadcms/richtext-lexical` | `payload` (scoped package)     |
| `@payloadcms/ui`               | `payload` (scoped package)     |
| `@tailwindcss/postcss`         | `tailwindcss` (scoped package) |
| `react`                        | `next` (peer dependency)       |
| `react-dom`                    | `next` (peer dependency)       |
| `graphql`                      | `payload` (peer dependency)    |
| `jsdom`                        | `vitest` (peer dependency)     |
| `@types/node`                  | `vitest` (peer dependency)     |
| `@types/react`                 | `react` (type package)         |
| `@types/react-dom`             | `react-dom` (type package)     |
| `@types/jsdom`                 | `jsdom` (type package)         |

## Present before this record, no recorded decision

These were in `package.json` when the record began and no decision for them is on issue #1. They are listed so the dependency check is silent; "present" is not "decided". "First added" is the commit that first put the name in `package.json`.

| Package                            | First added                                                                         | Described in                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| `@payloadcms/plugin-import-export` | `b71651a` P1: CMS content model (#27)                                               | [`docs/cms.md`](./cms.md) (line 124) |
| `@payloadcms/storage-vercel-blob`  | `b71651a` P1: CMS content model (#27)                                               | [`docs/cms.md`](./cms.md) (line 106) |
| `@testing-library/jest-dom`        | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `@testing-library/react`           | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `@vitejs/plugin-react`             | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `cross-env`                        | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `dompurify` (pnpm override)        | `56554b7` chore(deps): remediate Dependabot alerts (#30) (#49)                      |                                      |
| `dotenv`                           | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `eslint`                           | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `eslint-config-next`               | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `postcss` (also a pnpm override)   | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `prettier`                         | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `sharp`                            | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `tsx`                              | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `vite-tsconfig-paths`              | `1bb48b7` P1: Scaffold (#23)                                                        |                                      |
| `pnpm` (package manager)           | `1bb48b7` P1: Scaffold (#23); #1 lists "package manager confirmation" as still open |                                      |

Issue #1 also lists the media storage adapter ("Vercel Blob expected") as still to be decided, which is why `@payloadcms/storage-vercel-blob` sits in this tier and not the one above.
