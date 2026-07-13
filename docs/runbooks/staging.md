# Staging runbook — Vercel + Neon + Blob

Stand up the **staging** environment for flowlyst-website so that every merge to
`main` auto-deploys. This is a step-by-step runbook **Tural executes personally**
(issue #5 is labelled `needs-tural`). It uses the Vercel and Neon dashboards (and
one local command); no part of it is run by an agent.

> **Operating model.** Vercel and Neon are **Tural-operated**: agents prepare the
> config, env-var lists, and this runbook, but never run `vercel` / `neonctl` or
> touch those accounts. Tural evaluated and **declined** connecting the Vercel/Neon
> MCPs (2026-07-13) — the Vercel MCP grants whole-account access with no per-project
> boundary — so no agent has a path to these dashboards. Every step below is Tural's.

> **Read this first.**
>
> - **Never paste a real secret into this file or the repo.** Every credential
>   below is a `<PLACEHOLDER>`. Fill real values only in the Neon/Vercel
>   dashboards and your local shell.
> - **Two env vars are strictly required to boot:** `DATABASE_URL` and
>   `PAYLOAD_SECRET`. The CMS features from issue #4 add three more, each of which
>   **fails closed** when unset: `BLOB_READ_WRITE_TOKEN` (absent → media on the local
>   filesystem instead of Vercel Blob), `CRON_SECRET` (absent → scheduled publishing
>   denied), and `PREVIEW_SECRET` (absent → admin draft preview denied — **no
>   fallback**). `RESEND_*` / `RECAPTCHA_*` are still forward-looking (forms issue)
>   and unused today.
> - **Production builds need one more, at build time:** `DATABASE_URL_UNPOOLED` (the
>   **direct**, non-pooled Neon string). Since PR #36, production Vercel builds apply
>   committed migrations **before** building, using this variable; the build **fails
>   closed** if it's missing. It arrives automatically via the Neon↔Vercel
>   integration (Part 6). See Part 3.
> - **Migrations on deploy.** You run a **one-time bootstrap** migration yourself
>   (Part 3) to seed the initial schema before the first `/admin` visit. After that,
>   production deploys apply any new committed migrations **automatically** — you do
>   **not** re-run the command per PR. See Part 3.

---

## Execution order at a glance

The brief's topics are resequenced here into true dependency order (Neon must
exist before you can migrate or set env vars; the Vercel project must exist
before you can attach a Blob store):

| Part | What                                                                 | Where            |
| ---- | -------------------------------------------------------------------- | ---------------- |
| 0    | Prerequisites                                                        | local            |
| 1    | Create the Neon database, grab the direct connection string          | Neon dashboard   |
| 2    | Generate `PAYLOAD_SECRET`                                            | local shell      |
| 3    | Bootstrap the schema against Neon (**one-time, manual migrate**)     | local shell      |
| 4    | Create the Vercel project (import repo, build settings)              | Vercel dashboard |
| 5    | Create + attach the Vercel Blob store                                | Vercel dashboard |
| 6    | Set environment variables                                            | Vercel dashboard |
| 7    | Deploy                                                               | Vercel dashboard |
| 8    | Scheduled publishing trigger (set `CRON_SECRET`; daily cron default) | Vercel dashboard |
| 9    | End-state verification                                               | browser          |

---

## Part 0 — Prerequisites

- A **Vercel** account with access to create a project, and permission to install
  the Vercel GitHub app on the `flowlyst-io/flowlyst-website` repo.
- A **Neon** account (the free tier is fine for staging).
- A **local clone** of `flowlyst-io/flowlyst-website` on `main`, with the toolchain
  from [`docs/development.md`](../development.md) working:
  - Node.js **22.x** (`node -v`)
  - pnpm **10.x** — `corepack enable` (the version is pinned via `packageManager`
    in `package.json`)
- `openssl` on your PATH (ships with macOS).

You need the local clone only for **Part 3** (the migration). Everything else is
dashboard work.

---

## Part 1 — Create the Neon database

1. Neon dashboard → **New Project**.
   - **Name:** `flowlyst-staging` (any name; this is the staging project).
   - **Postgres version:** **18** (Tural's decision). Parity is enforced repo-wide
     since PR #35 — `docker-compose.yml` and CI both pin `postgres:18-alpine`, so
     staging must match.
   - **Region:** match your **Vercel function region**. On the **Hobby** plan Vercel
     defaults functions to **`iad1`** (Washington, D.C.); the closest Neon region is
     **`aws-us-east-1`** (AWS US East / N. Virginia) — pick that. Why this direction:
     Vercel's function region is **changeable later** (Settings → **Functions**), but
     **Neon's region is locked at project creation** — you can't move it without
     recreating the project. So create Neon to match Vercel, not the reverse. Note the
     region — you'll want production in the same one later.
2. Neon creates a default database. Rename or use the default; note the exact
   **database name** (e.g. `flowlyst` or `neondb`).
3. Open **Connection Details** (Dashboard → your project → Connect). Neon shows
   **two** connection strings behind a toggle:

   **a. Pooled connection** (the host contains **`-pooler`**). This is for the
   running app (serverless-friendly connection pooling). Its shape:

   ```
   postgresql://<role>:<password>@<endpoint-id>-pooler.<region>.aws.neon.tech/<database>?sslmode=require
   ```

   **b. Direct connection** (same host **without** `-pooler`). This is for
   migrations. Its shape:

   ```
   postgresql://<role>:<password>@<endpoint-id>.<region>.aws.neon.tech/<database>?sslmode=require
   ```

   The **only** difference is the `-pooler` segment in the host. **Copy the strings
   verbatim from the dashboard** — don't hand-edit them (Neon may append
   `&channel_binding=require`; keep whatever it gives you).

> **Why two strings?** Payload's migrations open a direct session and run DDL;
> that wants the **direct** endpoint. The running app benefits from Neon's
> connection **pooler**. Keeping them separate means each is used only where it
> belongs — and avoids the pooler tripping on migration-time operations.

**What you actually need to copy now:** just the **direct** string — it's the only
thing this runbook asks you to paste by hand (Part 3's one-time bootstrap). Keep it
somewhere safe (a password manager).

> **The running app's strings come from the integration, not this step.** In Part 6
> you connect the **Neon↔Vercel integration**, which injects **both** the pooled
> `DATABASE_URL` (runtime) **and** the direct `DATABASE_URL_UNPOOLED` (build-time
> migrations) into Vercel automatically. You do **not** hand-paste those. The direct
> string you copy here is only for the local bootstrap in Part 3.

---

## Part 2 — Generate `PAYLOAD_SECRET`

Payload signs auth tokens with this. Generate one value and reuse it for both the
migration (Part 3) and Vercel (Part 6) so they match:

```bash
openssl rand -hex 32
```

Copy the 64-character hex output. This is `<PAYLOAD_SECRET>` everywhere below.
Generate a **fresh, unique** value — do not reuse the local-dev secret from your
`.env`.

---

## Part 3 — Bootstrap the schema against Neon (one-time, manual)

**Do this once, before opening `/admin`.** In production `push` is disabled
(`payload.config.ts`: `push` is off when `NODE_ENV === 'production'` or `CI` is
set), so a fresh Neon database has **no schema** until it's migrated. If you skip
this, `/admin` returns a 500 (`relation "users" does not exist`).

This is a **one-time bootstrap** to seed the initial schema before the first deploy
and first `/admin` visit. **After** this, you never run the migrate command by hand
again: production Vercel builds apply any new committed migrations automatically (PR
#36 — see [After this: schema changes deploy themselves](#after-this-schema-changes-deploy-themselves)
below). `payload migrate` is idempotent, so the bootstrap and the first production
deploy's auto-migrate don't conflict — whichever runs second finds nothing pending.

Run it from your local clone against the Neon **direct** string (CI applies the same
migrations in its own step — `.github/workflows/ci.yml` → "Run database migrations"
— so a broken migration is caught before merge):

```bash
# From the repo root, on main, with dependencies installed (pnpm install).
# Uses the DIRECT (non-pooler) Neon string and the SAME secret you'll set in Vercel.
DATABASE_URL='<neon-direct-connection-string>' \
PAYLOAD_SECRET='<PAYLOAD_SECRET>' \
pnpm migrate
```

Expected output: Payload applies **all** committed migrations in `src/migrations/`
in order (three at the time of writing — `initial`, `cms_content_model`, and
`add_import_export_collections`), creating the `users`/auth tables, the full CMS
content model (blog posts, case studies, testimonials, training programs, authors,
media, the lead collections, and site settings), Payload's internal tables, and the
`payload_migrations` ledger. `payload migrate` is idempotent — it records applied
migrations in `payload_migrations` and skips ones already run, so re-running is
safe.

### After this: schema changes deploy themselves

The manual command above is the **only** migrate you run by hand. From here on,
schema changes apply on deploy — **you do not re-run `pnpm migrate` per PR.**

Since **PR #36**, `vercel.json` sets `"buildCommand": "node scripts/vercel-build.mjs"`,
and that script decides whether to migrate before building (logic in
`scripts/migrate-gate.mjs`):

- On a **production** build (`VERCEL_ENV === "production"`, set only for main-branch
  production deploys) it applies committed migrations against the **direct**
  connection (`DATABASE_URL_UNPOOLED`), **then** builds the app.
- On **preview** builds — and any non-production environment — it **skips migration**
  and goes straight to the build. Only production migrates; a preview's un-merged
  schema change isn't applied until it lands on `main` (previews run against their own
  Neon branch — Part 6).
- It is **fail-closed**: if the migrate step fails, the build exits non-zero, the
  deploy fails, and the **previous** deployment stays live. If a production build is
  missing `DATABASE_URL_UNPOOLED` it fails loudly rather than falling back to the
  pooled string.

So the flow for a schema change is: add the migration file under `src/migrations/`,
open a PR (CI applies it to a throwaway DB and runs the suite), and merge to `main`
— the production deploy applies it automatically. Nothing to run by hand.

> **Keep migrations backward-compatible (expand-contract / additive).** The migration
> runs _before_ the new code goes live, and the previous deployment keeps serving
> traffic during the build — so add columns/tables in one deploy and only drop or
> rename old ones in a later deploy. Full rationale in
> [`docs/development.md` → "Schema changes deploy themselves"](../development.md#schema-changes-deploy-themselves-production).

---

## Part 4 — Create the Vercel project

> **The repo must be public on the Hobby plan.** Vercel **Hobby** cannot deploy a
> **private** repository owned by a GitHub **organization** — and `flowlyst-io` is an
> org. `flowlyst-io/flowlyst-website` was therefore made **public**; keep it that way
> (or move the project to a paid plan) or the import/deploy is blocked.

1. Vercel dashboard → **Add New… → Project**.
2. **Import** the `flowlyst-io/flowlyst-website` repository (install/authorize the
   Vercel GitHub app for the `flowlyst-io` org if prompted).
3. Configure the project:

   | Setting              | Value                                                                                                                                   |
   | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
   | **Framework Preset** | **Next.js** (auto-detected)                                                                                                             |
   | **Root Directory**   | `./` (repo root — the app is not in a subfolder)                                                                                        |
   | **Build Command**    | leave **default** — the committed `vercel.json` sets it to `node scripts/vercel-build.mjs`, which overrides the preset (see note below) |
   | **Install Command**  | leave **default** — Vercel auto-detects **pnpm** from `pnpm-lock.yaml`. See step 4 for pinning the exact version                        |
   | **Output Directory** | leave **default**                                                                                                                       |

4. **Pin pnpm to `10.4.1` via Corepack.** Vercel detects pnpm from the lockfile
   but, by default, uses **its own** pnpm version (chosen from the lockfile format)
   — **not** the `packageManager: pnpm@10.4.1` pin in `package.json`. A version
   mismatch is a classic, confusing first-deploy failure. To make Vercel use the
   exact pinned pnpm (matching local dev and CI, which both run `pnpm@10.4.1`),
   enable Corepack: add the project environment variable
   **`ENABLE_EXPERIMENTAL_COREPACK` = `1`** (Production + Preview). This is included
   in the env-var table in Part 6 — set it there. (Confirmed from Vercel's build
   docs: enabling Corepack is how a project pins a specific package-manager
   version.)
5. **Node.js version:** Settings → **Build and Deployment** → **Node.js Version** →
   set **22.x** (matches CI's Node 22). Do not leave it on an older default.
6. **Production Branch:** confirm Settings → **Git** → Production Branch = **`main`**.
   In this project, the "Production" environment **is** staging (a separate
   production project/domain comes at cutover). This is what makes "every merge to
   `main` auto-deploys" true.
7. **Do not deploy yet** if Vercel offers to — or let the first import build fail;
   it will succeed once env vars are set in Part 6. (Cancel/ignore the initial
   auto-build; you'll trigger a clean deploy in Part 7.)

> **`vercel.json` is already committed** and does two things Vercel reads
> automatically on deploy — nothing for you to add:
>
> - a **`buildCommand`** of `node scripts/vercel-build.mjs` (PR #36), which applies
>   committed migrations on **production** builds and then builds the app (Part 3 →
>   "schema changes deploy themselves"). It **overrides** the Next.js preset's
>   `next build`, so leaving the dashboard **Build Command** on default is correct —
>   `vercel.json` wins.
> - the scheduled-publishing **cron** (Part 8).

---

## Part 5 — Create and attach the Vercel Blob store

Media uploads will live in Vercel Blob. **Two settings at creation matter and were
both hit as traps in practice — read the warning below before clicking Create.**

1. In the project → **Storage** tab → **Create Database / Connect Store** →
   **Blob** → **Continue**.
2. **Name:** `flowlyst-staging-media` (any name).
3. **Access: Public.** Choose **Public**, not Private. Marketing media is served on
   the public site, and our adapter does not support private/authenticated reads.
4. **Read-write token environments: select Production + Preview.** In the create
   dialog, choose the environments to receive the store's **read-write token**. This
   is the step that injects **`BLOB_READ_WRITE_TOKEN`** into the project — pick
   **Production** and **Preview** so both deployed environments get it.
5. Create it, and confirm **`BLOB_READ_WRITE_TOKEN`** now appears under Settings →
   **Environment Variables** for Production + Preview. (If you missed step 4, the
   token is also copyable later from the store's **Quickstart** → `.env.local` box.)

> **The trap — do not rely on "connect" to inject the token (Vercel behavior, 2026-05).**
> Merely **connecting** a store to the project now uses **OIDC**: it injects only
> `BLOB_STORE_ID` + `BLOB_WEBHOOK_PUBLIC_KEY` (and a per-deploy `VERCEL_OIDC_TOKEN`)
> — **not** `BLOB_READ_WRITE_TOKEN`. But our adapter,
> `@payloadcms/storage-vercel-blob@3.86.0`, requires the **static read-write token**
> and has **no OIDC support** (none upstream either, as of 2026-07). So OIDC alone
> leaves media broken. You must get `BLOB_READ_WRITE_TOKEN` in via step 4 (or the
> Quickstart box).
>
> **A Private store is wrong** — it's unsupported by the adapter and inappropriate
> for public marketing media. This was hit for real: the original store was created
> Private and had to be **deleted and recreated as Public**. Get access right the
> first time.
>
> **Ignore the "revoke the read-write token" banner.** For OIDC-connected projects
> Vercel shows a banner recommending you revoke the static token — **do NOT revoke
> it.** That advice assumes the token is unused; **we use it** (the adapter has no
> OIDC path). Revoking it breaks media uploads.

> **How it's wired:** the `Media` collection and the `@payloadcms/storage-vercel-blob`
> adapter ship in the app (issue #4). The adapter is gated on
> `BLOB_READ_WRITE_TOKEN`: **present** (staging/prod) → uploads go to Vercel Blob;
> **absent** (local dev) → filesystem (`/media`). So the token from step 4 is what
> sends staging uploads to Blob — verified end-to-end in Part 9.

---

## Part 6 — Environment variables

Two sources fill these in: the **Neon↔Vercel integration** provisions the database
strings automatically (below), and you set the rest by hand in the Vercel project →
Settings → **Environment Variables**, using the **Environments** column in the table.
Most hand-set vars go to **Production + Preview** so PR preview URLs also boot;
`CRON_SECRET` is Production-only (Vercel Cron runs only on Production deploys). Your
local `pnpm dev` still uses Docker Postgres via your `.env` (per
`docs/development.md`) — it does not read Vercel's environment variables.

### Connect the Neon↔Vercel integration first

Do **not** hand-paste the Neon connection strings. Connect Neon to the Vercel
project (Neon **Integrations** → Vercel, or Vercel **Integrations** → Neon) and it
injects the database env vars for you:

- **`DATABASE_URL`** — the **pooled** runtime string.
- **`DATABASE_URL_UNPOOLED`** — the **direct** string, **required at build time** by
  the production migrate step (PR #36; the build fails closed without it).

The integration scopes both to **Development + Production**, backs Vercel's
**Development** environment with a dedicated **`vercel-dev`** Neon branch, and
provisions **preview branches on demand** — when a PR deploys, a branch named
`preview/<git-branch>` appears in Neon and its strings are injected into that preview
deploy. (Preview deploys therefore get their own branch rather than sharing the main
staging database. This supersedes the old "shared staging DB" caveat.) You never edit
the `DATABASE_URL*` rows by hand — they show up already set.

| Variable                         | Value (placeholder)                  | Environments                     | How to obtain                                                         | Status in code                                                                                                             |
| -------------------------------- | ------------------------------------ | -------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_EXPERIMENTAL_COREPACK`   | `1`                                  | Production, Preview              | Fixed value — pins pnpm to `10.4.1` (Part 4, step 4)                  | Build-time — makes Vercel use the pinned pnpm                                                                              |
| `DATABASE_URL`                   | _(integration-managed — don't set)_  | Development, Production, preview | Neon↔Vercel integration — the **pooled** string, injected             | **Required** — read by `payload.config.ts` at runtime                                                                      |
| `DATABASE_URL_UNPOOLED`          | _(integration-managed — don't set)_  | Development, Production, preview | Neon↔Vercel integration — the **direct** string, injected             | **Required at build time** — the production migrate step (PR #36) runs against it; build fails closed if missing           |
| `PAYLOAD_SECRET`                 | `<PAYLOAD_SECRET>`                   | Production, Preview              | Part 2 — the **same** value you bootstrapped with                     | **Required** — read by `payload.config.ts`                                                                                 |
| `BLOB_READ_WRITE_TOKEN`          | _(from store creation — don't type)_ | Production, Preview              | Part 5 — select Prod+Preview for the read-write token (or Quickstart) | Consumed by the media adapter (#4) — present → uploads go to Blob; absent → local filesystem                               |
| `NEXT_PUBLIC_SERVER_URL`         | `<https://origin>` _(optional)_      | Production, Preview _(if set)_   | PR #37 ("Part of #33") — **optional** override; usually leave unset   | Optional — Payload `serverURL`; unset → derives from `VERCEL_PROJECT_PRODUCTION_URL`, else `http://localhost:3000`         |
| `CRON_SECRET`                    | `<openssl rand -hex 32>`             | Production                       | `openssl rand -hex 32` (fresh value)                                  | Consumed by `jobs.access.run` (#4) — secures `GET /api/payload-jobs/run`; absent → scheduled publishing denied. See Part 8 |
| `PREVIEW_SECRET`                 | `<openssl rand -hex 32>`             | Production, Preview              | `openssl rand -hex 32` (fresh value)                                  | **Required for draft preview** (#4) — secures the `/preview` route; **unset → preview denied** (no fallback)               |
| `RESEND_API_KEY`                 | `<resend-api-key>`                   | Production, Preview              | Resend dashboard → API Keys                                           | Not yet consumed — set when the forms/email feature lands                                                                  |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | `<recaptcha-site-key>`               | Production, Preview              | Google reCAPTCHA admin console (v3)                                   | Not yet consumed — set when forms land                                                                                     |
| `RECAPTCHA_SECRET_KEY`           | `<recaptcha-secret-key>`             | Production, Preview              | Google reCAPTCHA admin console (v3)                                   | Not yet consumed — set when forms land                                                                                     |

Notes:

- **To boot staging:** `ENABLE_EXPERIMENTAL_COREPACK` (build time, so pnpm matches)
  and `PAYLOAD_SECRET` are the only ones you set by hand for a bare boot;
  `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) come from the integration. Nothing else
  is required for the app to come up.
- **Generate all three secrets up front** with `openssl rand -hex 32` — a distinct
  value each for `PAYLOAD_SECRET`, `CRON_SECRET`, and `PREVIEW_SECRET` — and set them
  at initial setup so the full CMS works from the first deploy.
- **To exercise the full CMS (issue #4):** create the Blob store with the read-write
  token scoped to Prod+Preview so `BLOB_READ_WRITE_TOKEN` is present (media → Blob,
  Part 5); set `CRON_SECRET` so scheduled publishing works (Part 8); and set
  `PREVIEW_SECRET` so admin draft preview works — **it has no fallback, so if it's
  unset, preview is denied.**
- The `RESEND_*` / `RECAPTCHA_*` rows are for a later forms issue — add them as
  placeholders now or defer entirely; staging deploys and runs without them.
- **Pooled vs. direct is handled for you.** The integration injects **both**: the
  **pooled** `DATABASE_URL` for the running app and the **direct**
  `DATABASE_URL_UNPOOLED` for the build-time migrate step. That split (pooler at
  runtime, direct for DDL — see Part 1) is intentional and no longer something you
  wire up by hand.
- **Preview deploys get their own Neon branch** (`preview/<git-branch>`), provisioned
  by the integration on demand — they don't share the Production database. Preview
  builds still **skip** migration (only production migrates — Part 3).
- Changing a hand-set env var requires a **redeploy** to take effect (Part 7).

---

## Part 7 — Deploy

> **Cron cadence — no action needed to deploy.** The committed `vercel.json` runs
> the scheduled-publishing job **daily at 06:00 UTC** (`0 6 * * *`), which deploys
> on **Hobby and Pro alike** — no plan prerequisite. Tightening the cadence is an
> optional, Pro-only choice covered in Part 8; nothing to change here to deploy.

1. Trigger a deployment: Vercel project → **Deployments** → **Redeploy** the latest
   (or push/merge anything to `main`). This build now has `PAYLOAD_SECRET` plus the
   integration's `DATABASE_URL` + `DATABASE_URL_UNPOOLED`, so it succeeds.
2. Watch the build log complete with no errors. On a **production** build,
   `scripts/vercel-build.mjs` logs an `[vercel-build] … applying committed migrations`
   line before the Next.js build (PR #36), then builds. Note the deployment URL —
   `https://<project>.vercel.app` (and any `*-git-main-*` alias).

---

## Part 8 — Scheduled publishing trigger

Blog Posts and Case Studies support **scheduled publishing** (set a future publish
date in `/admin`). This enqueues a Payload `schedulePublish` job that only runs
when something hits the jobs runner:

```
GET /api/payload-jobs/run
```

**How it's wired (issue #4):** the committed [`vercel.json`](../../vercel.json)
registers a **Vercel Cron** that calls that endpoint **daily at 06:00 UTC**
(`"schedule": "0 6 * * *"`). This daily cadence deploys and runs on **every Vercel
plan** (Hobby and Pro), so there's no plan prerequisite. Vercel automatically
attaches `Authorization: Bearer <CRON_SECRET>` to cron requests when `CRON_SECRET`
is set, and the config's `jobs.access.run` verifies that header. **If `CRON_SECRET`
is unset, the runner denies the request and scheduled posts never publish.**

**Setup — nothing new to do beyond env + deploy:**

1. Set `CRON_SECRET` in the Vercel project (Production) — done in **Part 6**.
2. Deploy (Part 7). Vercel reads the committed `vercel.json` and registers the cron
   automatically. No repo change is required.

> ### Publish cadence — optional, Tural's choice (not a prerequisite)
>
> The committed default publishes **once daily at 06:00 UTC**, so a scheduled post
> goes live at the next 06:00 UTC after its scheduled time — fine for a marketing
> site, and it works on every plan. If you want **near-real-time** publishing (posts
> live within ~5 minutes of their time), that requires the **Vercel Pro plan**:
> change the one line in `vercel.json` to `"schedule": "*/5 * * * *"` and redeploy.
> This is a cadence preference, **not** a requirement to stand up staging.
>
> **Regardless of cadence**, an authenticated **Admin** can trigger the queue at any
> time by hitting `GET /api/payload-jobs/run` while logged in (or via
> `payload.jobs.run()` in code) — a manual fallback for demos/testing and the
> fastest way to verify below.

**Verify:**

1. Vercel → project → **Settings → Cron Jobs** shows the `/api/payload-jobs/run`
   job registered with its schedule (`0 6 * * *`).
2. In `/admin`, open a Blog Post (or Case Study), set the publish date to a moment
   already passed (or a minute ago), and save it as scheduled.
3. Trigger the runner immediately rather than waiting for 06:00 UTC — as the
   logged-in Admin, request `GET /api/payload-jobs/run` (e.g. in the browser).
   Reload the document: it flips to **published** and becomes visible to anonymous
   site/API callers. (The daily cron does the same automatically at 06:00 UTC.)

---

## Part 9 — End-state verification

Confirm staging is live and self-deploying. These are the instructions for anyone
re-standing staging.

> **Already passed once.** All five checks below passed on **2026-07-13** during the
> first stand-up (see the issue #5 comment "Staging end-state verification"). Re-run
> them whenever staging is rebuilt.

1. **Public site.** Open `https://<project>.vercel.app/` →
   **Expect:** the flowlyst marketing homepage (the P1 site shell — nav, hero,
   footer), server-rendered. View source shows real HTML content, not an empty
   client shell.

2. **Admin + schema.** Open `https://<project>.vercel.app/admin` →
   **Expect:** the Payload admin. On a freshly-migrated, user-less database this is
   the **create-first-admin** screen (the first user ever created is forced to the
   **Admin** role). Fill it in and log in — you should see the full CMS nav grouped
   into **Content**, **Leads**, and **Admin**.
   - **If you instead see a 500 / "relation … does not exist":** the migration
     (Part 3) didn't run against this database — re-run Part 3 with the **direct**
     string, then reload.

3. **Auto-deploy on merge to `main`.** Make a trivial change on a branch, open a
   PR, and squash-merge it to `main`. →
   **Expect:** Vercel automatically starts a new **Production** deployment for that
   `main` commit (visible under Deployments) and promotes it live when the build
   passes. Also confirm Settings → Git → **Production Branch = `main`**. This proves
   "every merge to `main` auto-deploys."

4. **Media upload → Blob.** In `/admin` → **Media**, upload an image (alt text is
   required and validated). →
   **Expect:** the upload succeeds, and in Vercel → project → **Storage** → your
   Blob store → **Browser** the uploaded object appears (original + Sharp size
   renditions). This proves media persists to Blob (the adapter routes to Blob
   because `BLOB_READ_WRITE_TOKEN` is present).
   - **Only meaningful when `BLOB_READ_WRITE_TOKEN` is set** (Part 5). If it's
     absent, uploads land on the deploy's ephemeral filesystem instead and this
     check doesn't apply — fix Part 5 first.

5. **Scheduled publishing.** Follow **Part 8 → Verify** — confirm the daily
   `/api/payload-jobs/run` cron is registered and that a scheduled post flips to
   **published** when the runner fires (trigger it manually to check right away, or
   let the 06:00 UTC cron do it).

6. **(Optional) Preview builds skip migration.** Open a PR and, in its **preview**
   deployment's build log, confirm the line
   `[vercel-build] VERCEL_ENV is "preview" (not "production") — skipping migrations`.
   This proves only production builds migrate (PR #36). Requires reading Vercel build
   logs (dashboard), so it's Tural's to eyeball.

### Done when

- [ ] `/` renders the marketing homepage over HTTPS.
- [ ] `/admin` reaches the create-first-admin screen; the admin you created sees
      the Content / Leads / Admin nav.
- [ ] A merge to `main` produced an automatic Production deployment.
- [ ] A media upload in `/admin` lands as an object in the Vercel Blob store.
- [ ] The `/api/payload-jobs/run` cron is registered (daily at 06:00 UTC), and a
      scheduled post publishes when the runner fires (verify via manual trigger).
