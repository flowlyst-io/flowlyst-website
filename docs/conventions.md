<!-- Flowlyst website code conventions. Edit in place; CLAUDE.md is the contract. -->

# Conventions

The house style for writing code in this repo: how _this_ codebase does things, so the next session does them the same way instead of inventing a second way.

## Entries

### Link-capable `.btn` variants restate their colour on hover

1. **Rule**: every `.btn` variant that can render as a link restates its resting `color` in its `:hover` rule, and `.btn:hover` keeps `text-decoration: none`.
2. **Why**: the global `a:hover` (specificity 0,1,1) beats a single-class variant (0,1,0). It recoloured and underlined link-buttons, and the green "Request a demo" text vanished on hover (2026-10-09).
3. **Minimal example**: `.btn--x { color: #fff } .btn--x:hover { color: #fff; background: … }`
4. **Gotcha**: a hover rule that only sets `background` looks fine on `<button>` but breaks on `<Link>`/`<a>`.

### Pages that set `openGraph` or `twitter` name the social image themselves

1. **Rule**: any page that sets `openGraph` or `twitter` metadata includes `images: [SOCIAL_IMAGE]` (`[SOCIAL_IMAGE.url]` for `twitter`) from `src/utilities/socialImage.ts`.
2. **Why**: Next replaces the parent's `openGraph`/`twitter` objects wholesale, so a page that declares its own silently drops the root `opengraph-image`.
3. **Minimal example**: `openGraph: { images: [SOCIAL_IMAGE], title, … }`
4. **Gotcha**: the URL suffix (`-4usi79`) is derived from the route-group path; moving or renaming `(frontend)/opengraph-image.tsx` changes it, and an e2e guards this.

### Client islands never import server modules; shared values live in `*Shared.ts`

1. **Rule**: a module that imports `payload` or anything else server-only is never imported by a `'use client'` island. Values shared between island and server (header names, action unions) live in a dependency-free `*Shared.ts`; browser-only code lives in `*Client.ts`.
2. **Why**: a value import from the server module pulls Payload and secret-reading code into the client bundle.
3. **Minimal example**: `recaptchaShared.ts` exports `RECAPTCHA_HEADER` and imports nothing; `recaptcha.ts` and `recaptchaClient.ts` both import from it; `ContactForm.tsx` imports from `recaptchaShared` and `recaptchaClient`, never `recaptcha`.
4. **Gotcha**: the shared file must stay import-free. A type-only import from the server module is safe; a value import is not.

### Change one style on a Payload default rich-text converter by wrapping it

1. **Rule**: to adjust a default Lexical converter (spacing, a class), call Payload's default and merge props onto its element with `React.cloneElement`; don't rewrite the converter. Values the blog and case-study readers share live in `src/utilities/richTextLists.ts`.
2. **Why**: the default handles node shapes a rewrite drops, such as `list-style-type: none` on the wrapper item that holds a sub-list and the checklist item attributes. Shared values stop the two readers drifting apart (#79).
3. **Minimal example**: `listitem: (args) => { const item = defaultConverters.listitem(args); return isValidElement(item) ? cloneElement(item, { style: { ...item.props.style, margin: LIST_ITEM_MARGIN } }) : item }`
4. **Gotcha**: spread the existing `style`. Passing `style` alone replaces it, which brings back a stray bullet on sub-list wrappers and breaks checklist styling.

### E2E specs derive their own Payload user email with `deriveFixtureEmail`

1. **Rule**: an e2e spec that needs its own Payload user derives the email with `deriveFixtureEmail({ prefix: '<spec>-e2e-admin' })`, never `Date.now()`, and seeds it by deleting then creating.
2. **Why**: the email is stable within one checkout and port, so re-runs and crash recovery reuse the row instead of stranding one; it is distinct per spec, checkout and port, so parallel files and worktrees never delete each other's user (#46, #77).
3. **Minimal example**: `const email = deriveFixtureEmail({ prefix: 'contact-e2e-admin' })`, then delete where email equals it, then create.
4. **Gotcha**: every spec file needs its own prefix; the default `dev-e2e` belongs to `admin.e2e.spec.ts`. Isolation relies on files running in separate workers: turning on `fullyParallel` would run one file's `beforeAll` in several workers against the same row.

### A dependency upgrade that reshapes stored data rewrites it in the same migration

1. **Rule**: when an upgrade changes the shape of stored data, the data rewrite goes in the same generated migration as the schema change: after the DDL in `up`, and in `down` before its DDL. The rewrite lives in exported helper functions, and an int test calls those helpers against old-shape data, then runs the real consumer.
2. **Why**: Payload runs each migration in one transaction, so schema and data land or roll back together, and the production migrate gate applies it automatically. Exporting the helpers is the only way to test the data step without replaying the whole migration chain.
3. **Minimal example**: `export async function wrapPendingJobUsers(db) {…}`; `up` runs the ALTERs, then `await wrapPendingJobUsers(db)`. The test inserts a legacy row, calls `wrapPendingJobUsers(payload.db.drizzle)`, then `payload.jobs.run()`, and asserts the outcome. See `src/migrations/20261012_023721_payload_3_90_upgrade.ts` and `tests/int/cms.int.spec.ts`.
4. **Gotcha**: Payload's loader reads only `up` and `down`, so extra exports are safe. A migration's name is permanent once applied to a shared database, so rename only before it reaches main. The rewrite cannot cover rows the old deployment writes while the production build is running.

### Server env vars are read through `envValue`, never raw `process.env`

1. **Rule**: every server-side secret, address or key env var is read through `envValue(name)` from `src/utilities/envValue.ts`, never as a raw `process.env.X`. Client `NEXT_PUBLIC_*` reads stay literal member accesses, written `process.env.NEXT_PUBLIC_X?.trim() || undefined`.
2. **Why**: values pasted into the Vercel dashboard carry stray whitespace, which breaks recipients and headers and makes a blank value look set (PR #118).
3. **Minimal example**: `const to = envValue('SALES_NOTIFY_TO') || envValue('LEAD_NOTIFY_TO') || DEFAULT_INTERNAL_TO`
4. **Gotcha**: never pass a `NEXT_PUBLIC_*` name to `envValue` in client code. Next.js inlines only literal `process.env.NEXT_PUBLIC_X` accesses at build time, so the dynamic lookup is `undefined` in the browser.

### Network side effects in Payload hooks are awaited, never `void`-ed

1. **Rule**: a Payload hook that calls the network (sending email, for example) `await`s the call. The callee catches and logs its own errors, so the save never fails because of it.
2. **Why**: Vercel freezes a serverless function once the response returns, which drops an in-flight request. Production lost a demo-request notification this way, logged as `fetch failed` (PR #118).
3. **Minimal example**: `afterChange: [async ({ doc, operation, req }) => { if (operation === 'create') await notifyDemoRequest(req.payload, doc, …) }]`, where `notifyDemoRequest` sends through `trySend`, which catches every send error.
4. **Gotcha**: once awaited, an exception that escapes the callee fails the request and can roll back the write it follows. The callee must never throw, and that includes the code that runs before its own `try`.

## The contract for this file

**Every entry has four parts, in this order:**

1. **Rule**: stated as a positive directive ("we do X"), precise enough to apply in a situation the entry never mentions.
2. **Why**: the reason it exists. An entry without a why gets cargo-culted and then broken by the first person who has a reason.
3. **Minimal example**: the smallest snippet that shows the shape. Minimal, not representative.
4. **Gotcha**: the thing that bites when you follow the rule naively. If there genuinely isn't one, say so; don't invent one.

### URL-driven form defaults are read by the page, never by the island

1. **Rule**: when a query parameter should prefill a form (e.g. `/contact?reason=pricing`), the server page reads it from `searchParams`, checks it against a dependency-free allow-list (here `toContactReason`), and passes the result to the client island as a prop; unknown values become `undefined`; the island never calls `useSearchParams()`.
2. **Why**: `useSearchParams()` in a client island makes that part client-only and drops the form from the server HTML (invariant a); the allow-list keeps a hand-written or malicious param from reaching the select or the DB enum.
3. **Minimal example**: `const { reason } = await searchParams; <ContactForm key={toContactReason(reason) ?? ''} initialReason={toContactReason(reason)} />`, island `useState({ ...INITIAL, reason: initialReason ?? '' })`.
4. **Gotcha**: island state only takes the prop on first mount, so key the island on it; reading `searchParams` makes the page dynamic, which is acceptable only when the page makes no DB calls.

**Entries arrive from the code reviewer.** The independent reviewer reads every diff with fresh eyes, which is exactly the position from which a new convention is visible. Its verdict says whether the change **established** a convention, which becomes an entry here, or **violated** one, which is a finding to fix in the review loop. Nobody writes speculative conventions in advance: an entry describes what a merged change actually did.

**This is house style, not tutorial.** It says what this codebase does, not how the language works. And it obeys the house rules below, in particular no code-knowable facts: an entry that lists exact signatures or versions is stale the moment someone edits the code.

**Decisions belong in [`adr/`](./adr/README.md), not here.** This file carries the _how we write it_; the ADR carries the _why we chose it at all_, with the alternatives that lost. A new library, a new third-party service, or a major version bump earns an ADR, not a convention entry.

## House rules for docs/

These apply to every file under `docs/` that the squad writes (conventions, ADRs, the stack record). Product documents and dated history, `PRD.md` and `retrospective/`, are not edited under them.

1. **No code-knowable facts.** Don't copy exact signatures, version numbers, parameter lists or file inventories into prose; they rot the moment someone touches the code.
2. **Fix or delete on the same commit that made it wrong.** A stale doc taints every doc next to it.
3. **Decisions go in [adr/](./adr/README.md), not in feature docs.** A feature gets rewritten and its prose goes with it; the _why_ survives in the ADR.
4. **Split when a topic is its own thing, not when a file feels long.** A 300-line doc on one topic beats ten 30-line shards.
5. **Filenames carry meaning.** `conventions.md` says what's inside; `notes.md` doesn't.
