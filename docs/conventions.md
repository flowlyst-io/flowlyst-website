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

## The contract for this file

**Every entry has four parts, in this order:**

1. **Rule**: stated as a positive directive ("we do X"), precise enough to apply in a situation the entry never mentions.
2. **Why**: the reason it exists. An entry without a why gets cargo-culted and then broken by the first person who has a reason.
3. **Minimal example**: the smallest snippet that shows the shape. Minimal, not representative.
4. **Gotcha**: the thing that bites when you follow the rule naively. If there genuinely isn't one, say so; don't invent one.

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
