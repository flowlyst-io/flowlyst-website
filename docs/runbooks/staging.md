# Staging runbook — Vercel + Neon + Blob

Stand up the **staging** environment for flowlyst-website so that every merge to
`main` auto-deploys. This is a step-by-step runbook **Tural executes personally**
(issue #5 is labelled `needs-tural`). It uses the Vercel and Neon dashboards (and
one local command); no part of it is run by an agent.

> **Read this first.**
> - **Never paste a real secret into this file or the repo.** Every credential
>   below is a `<PLACEHOLDER>`. Fill real values only in the Neon/Vercel
>   dashboards and your local shell.
> - **Two env vars are strictly required to boot:** `DATABASE_URL` and
>   `PAYLOAD_SECRET`. The CMS features from issue #4 add three more that the code
>   reads with sensible fallbacks: `BLOB_READ_WRITE_TOKEN` (media → Vercel Blob;
>   absent → local filesystem), `CRON_SECRET` (secures scheduled publishing;
>   absent → cron denied), and `PREVIEW_SECRET` (**optional** — falls back to
>   `PAYLOAD_SECRET`). `RESEND_*` / `RECAPTCHA_*` are still forward-looking (forms
>   issue) and unused today.
> - The repo is **not** wired to run database migrations on deploy. You run the
>   migration yourself (Part 3), and again after any future PR that adds a
>   migration. This is intentional — see Part 3.

---

## Execution order at a glance

The brief's topics are resequenced here into true dependency order (Neon must
exist before you can migrate or set env vars; the Vercel project must exist
before you can attach a Blob store):

| Part | What | Where |
| ---- | ---- | ----- |
| 0 | Prerequisites | local |
| 1 | Create the Neon database, grab both connection strings | Neon dashboard |
| 2 | Generate `PAYLOAD_SECRET` | local shell |
| 3 | Run the initial migration against Neon (**mandatory, manual**) | local shell |
| 4 | Create the Vercel project (import repo, build settings) | Vercel dashboard |
| 5 | Create + attach the Vercel Blob store | Vercel dashboard |
| 6 | Set environment variables | Vercel dashboard |
| 7 | Deploy | Vercel dashboard |
| 8 | Scheduled publishing trigger (set `CRON_SECRET`; daily cron default) | Vercel dashboard |
| 9 | End-state verification | browser |

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
   - **Postgres version:** **16** (matches local Docker and CI).
   - **Region:** pick the one closest to your Vercel deployment region (e.g. AWS
     `us-east-1` / `US East`). Note it — you'll want production in the same region
     later.
2. Neon creates a default database. Rename or use the default; note the exact
   **database name** (e.g. `flowlyst` or `neondb`).
3. Open **Connection Details** (Dashboard → your project → Connect). You need
   **two** connection strings — Neon shows both behind a toggle:

   **a. Pooled connection** (the host contains **`-pooler`**). This is for the
   running app (serverless-friendly connection pooling). Its shape:

   ```
   postgresql://<role>:<password>@<endpoint-id>-pooler.<region>.aws.neon.tech/<database>?sslmode=require
   ```

   **b. Direct connection** (same host **without** `-pooler`). This is for
   migrations only. Its shape:

   ```
   postgresql://<role>:<password>@<endpoint-id>.<region>.aws.neon.tech/<database>?sslmode=require
   ```

   The **only** difference is the `-pooler` segment in the host. **Copy both
   strings verbatim from the dashboard** — don't hand-edit them (Neon may append
   `&channel_binding=require`; keep whatever it gives you).

> **Why two strings?** Payload's migrations open a direct session and run DDL;
> that wants the **direct** endpoint. The running app benefits from Neon's
> connection **pooler**. Keeping them separate means each is used only where it
> belongs — and avoids the pooler tripping on migration-time operations.

Keep both strings somewhere safe (a password manager). You'll paste the **direct**
one in Part 3 and the **pooled** one in Part 6.

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

## Part 3 — Run the initial migration against Neon (mandatory, manual)

**Do this before opening `/admin`.** In production `push` is disabled
(`payload.config.ts`: `push` is off when `NODE_ENV === 'production'` or `CI` is
set), so Neon has **no schema** until you migrate. If you skip this, `/admin` will
return a 500 (`relation "users" does not exist`).

The repo runs `next build` on deploy and **does not** run migrations — mirroring
CI, which applies migrations in a **separate** step (`.github/workflows/ci.yml` →
"Run database migrations"). So you apply them yourself, from your local clone,
against the Neon **direct** string:

```bash
# From the repo root, on main, with dependencies installed (pnpm install).
# Uses the DIRECT (non-pooler) Neon string and the SAME secret you'll set in Vercel.
DATABASE_URL='<neon-direct-connection-string>' \
PAYLOAD_SECRET='<PAYLOAD_SECRET>' \
pnpm migrate
```

Expected output: Payload applies **both** committed migrations in order —
`20260713_123011_initial` then `20260713_151923_cms_content_model` — creating the
`users`/auth tables, the full CMS content model (blog posts, case studies,
testimonials, training programs, authors, media, the lead collections, and site
settings), Payload's internal tables, and the `payload_migrations` ledger.
`payload migrate` is idempotent — it records applied migrations in
`payload_migrations` and skips ones already run, so re-running is safe.

### After any future schema change

Because migrations are **not** applied on deploy, every time a PR that adds a file
to `src/migrations/` merges to `main`, the code deploys but the Neon schema does
**not** update on its own. Re-run the same command after the merge:

```bash
git checkout main && git pull
DATABASE_URL='<neon-direct-connection-string>' \
PAYLOAD_SECRET='<PAYLOAD_SECRET>' \
pnpm migrate
```

Run it **before** the new deploy relies on the new schema (or immediately after
the merge). Note the ordering gotcha: a deploy carrying code that expects a new
column, deployed before you migrate, will error until you run the migration.

> **Optional, for the orchestrator to decide (not done here):** if you later want
> migrations to apply automatically on every deploy, the Vercel **Build Command**
> can be overridden to `pnpm payload migrate && pnpm build`, with `DATABASE_URL`
> switched to the **direct** string (or a separate `DATABASE_URL_UNPOOLED` added
> for the migrate step). That trades the manual gate for auto-applied DDL on every
> deploy. It is deliberately **not** the default here — the repo isn't wired for
> it, and auto-running DDL against Neon is a change of deploy behaviour that should
> be an explicit decision, not a side effect of this runbook.

---

## Part 4 — Create the Vercel project

1. Vercel dashboard → **Add New… → Project**.
2. **Import** the `flowlyst-io/flowlyst-website` repository (install/authorize the
   Vercel GitHub app for the `flowlyst-io` org if prompted).
3. Configure the project:

   | Setting | Value |
   | ------- | ----- |
   | **Framework Preset** | **Next.js** (auto-detected) |
   | **Root Directory** | `./` (repo root — the app is not in a subfolder) |
   | **Build Command** | leave **default** (`next build` via the preset) |
   | **Install Command** | leave **default** — Vercel auto-detects **pnpm** from `pnpm-lock.yaml`. See step 4 for pinning the exact version |
   | **Output Directory** | leave **default** |

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

> **`vercel.json` is already committed** (added by issue #4). It declares only the
> scheduled-publishing **cron** (Part 8) — the Next.js preset still covers the
> build. Vercel reads it automatically on deploy; nothing for you to add.

---

## Part 5 — Create and attach the Vercel Blob store

Media uploads will live in Vercel Blob.

1. In the project → **Storage** tab → **Create Database / Connect Store** →
   **Blob** → **Continue**.
2. **Name:** `flowlyst-staging-media` (any name). Create it.
3. **Connect it to this project.** When you connect a Blob store, Vercel
   **automatically injects** the `BLOB_READ_WRITE_TOKEN` environment variable into
   the project — **you do not copy or paste this token by hand.** Confirm it
   appears under Settings → Environment Variables after connecting.

> **How it's wired:** the `Media` collection and the `@payloadcms/storage-vercel-blob`
> adapter ship in the app (issue #4). The adapter is gated on
> `BLOB_READ_WRITE_TOKEN`: **present** (staging/prod, once you attach the store) →
> uploads go to Vercel Blob; **absent** (local dev) → filesystem (`/media`). So
> attaching the store is all it takes to send staging uploads to Blob — verified
> end-to-end in Part 9.

---

## Part 6 — Environment variables

Set these in the Vercel project → Settings → **Environment Variables**, using the
**Environments** column below for each (most go to **Production + Preview** so PR
preview URLs also boot; `CRON_SECRET` is Production-only, since Vercel Cron runs
only on Production deploys). Leave **Development** unset — local dev uses your
`.env` against Docker Postgres, per `docs/development.md`.

| Variable | Value (placeholder) | Environments | How to obtain | Status in code |
| -------- | ------------------- | ------------ | ------------- | -------------- |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | Production, Preview | Fixed value — pins pnpm to `10.4.1` (Part 4, step 4) | Build-time — makes Vercel use the pinned pnpm |
| `DATABASE_URL` | `<neon-POOLED-connection-string>` | Production, Preview | Part 1 — the **pooled** (`-pooler`) string | **Required** — read by `payload.config.ts` at runtime |
| `PAYLOAD_SECRET` | `<PAYLOAD_SECRET>` | Production, Preview | Part 2 — the **same** value you migrated with | **Required** — read by `payload.config.ts` |
| `BLOB_READ_WRITE_TOKEN` | _(auto-injected — do not paste)_ | _(auto)_ | Part 5 — created when you attach the Blob store | Consumed by the media adapter (#4) — present → uploads go to Blob; absent → local filesystem |
| `CRON_SECRET` | `<openssl rand -hex 32>` | Production | `openssl rand -hex 32` (fresh value) | Consumed by `jobs.access.run` (#4) — secures `GET /api/payload-jobs/run`; absent → scheduled publishing denied. See Part 8 |
| `PREVIEW_SECRET` | `<openssl rand -hex 32>` | Production, Preview | `openssl rand -hex 32` — **optional** | Optional (#4) — draft preview; **falls back to `PAYLOAD_SECRET`** if unset |
| `RESEND_API_KEY` | `<resend-api-key>` | Production, Preview | Resend dashboard → API Keys | Not yet consumed — set when the forms/email feature lands |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | `<recaptcha-site-key>` | Production, Preview | Google reCAPTCHA admin console (v3) | Not yet consumed — set when forms land |
| `RECAPTCHA_SECRET_KEY` | `<recaptcha-secret-key>` | Production, Preview | Google reCAPTCHA admin console (v3) | Not yet consumed — set when forms land |

Notes:
- **To boot staging:** `ENABLE_EXPERIMENTAL_COREPACK` (build time, so pnpm
  matches), `DATABASE_URL`, and `PAYLOAD_SECRET`. Nothing else is required for the
  app to come up.
- **To exercise the full CMS (issue #4):** attach the Blob store so
  `BLOB_READ_WRITE_TOKEN` is injected (media → Blob), and set `CRON_SECRET` so
  scheduled publishing works (Part 8). `PREVIEW_SECRET` is **optional** — skip it
  and draft preview uses `PAYLOAD_SECRET`.
- The `RESEND_*` / `RECAPTCHA_*` rows are for a later forms issue — add them as
  placeholders now or defer entirely; staging deploys and runs without them.
- **`DATABASE_URL` uses the POOLED string here** (runtime), which is the opposite
  of Part 3's migration command (direct string). That split is intentional.
- **Shared staging DB caveat:** Preview deploys point at the same Neon staging
  database as Production. Fine for staging; revisit for production.
- Changing an env var requires a **redeploy** to take effect (Part 7).

---

## Part 7 — Deploy

> **Cron cadence — no action needed to deploy.** The committed `vercel.json` runs
> the scheduled-publishing job **daily at 06:00 UTC** (`0 6 * * *`), which deploys
> on **Hobby and Pro alike** — no plan prerequisite. Tightening the cadence is an
> optional, Pro-only choice covered in Part 8; nothing to change here to deploy.

1. Trigger a deployment: Vercel project → **Deployments** → **Redeploy** the latest
   (or push/merge anything to `main`). This build now has `DATABASE_URL` +
   `PAYLOAD_SECRET`, so it succeeds.
2. Watch the build log complete with no errors. Note the deployment URL —
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

Confirm staging is live and self-deploying.

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
   Blob store → **Browser** the uploaded object appears. This proves media persists
   to Blob (the adapter routes to Blob because `BLOB_READ_WRITE_TOKEN` is present).

5. **Scheduled publishing.** Follow **Part 8 → Verify** — confirm the daily
   `/api/payload-jobs/run` cron is registered and that a scheduled post flips to
   **published** when the runner fires (trigger it manually to check right away, or
   let the 06:00 UTC cron do it).

### Done when
- [ ] `/` renders the marketing homepage over HTTPS.
- [ ] `/admin` reaches the create-first-admin screen; the admin you created sees
      the Content / Leads / Admin nav.
- [ ] A merge to `main` produced an automatic Production deployment.
- [ ] A media upload in `/admin` lands as an object in the Vercel Blob store.
- [ ] The `/api/payload-jobs/run` cron is registered (daily at 06:00 UTC), and a
      scheduled post publishes when the runner fires (verify via manual trigger).
