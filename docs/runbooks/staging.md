# Staging runbook — Vercel + Neon + Blob

Stand up the **staging** environment for flowlyst-website so that every merge to
`main` auto-deploys. This is a step-by-step runbook **Tural executes personally**
(issue #5 is labelled `needs-tural`). It uses the Vercel and Neon dashboards (and
one local command); no part of it is run by an agent.

> **Read this first.**
> - **Never paste a real secret into this file or the repo.** Every credential
>   below is a `<PLACEHOLDER>`. Fill real values only in the Neon/Vercel
>   dashboards and your local shell.
> - The app currently reads exactly **two** environment variables: `DATABASE_URL`
>   and `PAYLOAD_SECRET`. Everything else in the table is provisioned now but
>   **not consumed until a later feature ships** — staging boots without them.
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
| 8 | Scheduled publishing trigger | _pending #4_ |
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

Expected output: Payload reports the `20260713_123011_initial` migration applied
(it creates the `users` table, Payload's internal tables, and the
`payload_migrations` ledger). `payload migrate` is idempotent — it records applied
migrations in `payload_migrations` and skips ones already run, so re-running is
safe.

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

> **No `vercel.json` is needed** for staging — the Next.js preset covers the build.
> (A committed `vercel.json` will arrive later **with issue #4** to declare the
> scheduled-publishing cron — see Part 8. Nothing to add to the repo now.)

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

> **Note:** the code does **not** read `BLOB_READ_WRITE_TOKEN` yet — the Payload
> Vercel-Blob storage adapter and the `Media` collection are not in
> `payload.config.ts` at the time of writing (a separate part of issue #5). Attach
> the store now so the token is ready; media upload can't be exercised until that
> adapter ships (see Part 9).

---

## Part 6 — Environment variables

Set these in the Vercel project → Settings → **Environment Variables**. Add each
to the **Production** and **Preview** environments (Preview so PR preview URLs
also boot). Leave **Development** unset — local dev uses your `.env` against Docker
Postgres, per `docs/development.md`.

| Variable | Value (placeholder) | Environments | How to obtain | Status in code |
| -------- | ------------------- | ------------ | ------------- | -------------- |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | Production, Preview | Fixed value — pins pnpm to `10.4.1` (Part 4, step 4) | Build-time — makes Vercel use the pinned pnpm |
| `DATABASE_URL` | `<neon-POOLED-connection-string>` | Production, Preview | Part 1 — the **pooled** (`-pooler`) string | **Required** — read by `payload.config.ts` at runtime |
| `PAYLOAD_SECRET` | `<PAYLOAD_SECRET>` | Production, Preview | Part 2 — the **same** value you migrated with | **Required** — read by `payload.config.ts` |
| `BLOB_READ_WRITE_TOKEN` | _(auto-injected — do not paste)_ | _(auto)_ | Part 5 — created when you attach the Blob store | Provisioned now; consumed once the Media/storage adapter lands |
| `RESEND_API_KEY` | `<resend-api-key>` | Production, Preview | Resend dashboard → API Keys | Not yet consumed — set when the forms/email feature lands |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | `<recaptcha-site-key>` | Production, Preview | Google reCAPTCHA admin console (v3) | Not yet consumed — set when forms land |
| `RECAPTCHA_SECRET_KEY` | `<recaptcha-secret-key>` | Production, Preview | Google reCAPTCHA admin console (v3) | Not yet consumed — set when forms land |

Notes:
- **Minimum to stand up staging today:** `ENABLE_EXPERIMENTAL_COREPACK` (build
  time, so pnpm matches), plus `DATABASE_URL` + `PAYLOAD_SECRET` (runtime), plus the
  auto-injected `BLOB_READ_WRITE_TOKEN`. The `RESEND_*` / `RECAPTCHA_*` rows can be
  added now as placeholders you fill later, or deferred entirely until their
  feature ships — staging deploys and runs without them.
- **`DATABASE_URL` uses the POOLED string here** (runtime), which is the opposite
  of Part 3's migration command (direct string). That split is intentional.
- **Shared staging DB caveat:** Preview deploys point at the same Neon staging
  database as Production. Fine for staging; revisit for production.
- Changing an env var requires a **redeploy** to take effect (Part 7).

---

## Part 7 — Deploy

1. Trigger a deployment: Vercel project → **Deployments** → **Redeploy** the latest
   (or push/merge anything to `main`). This build now has `DATABASE_URL` +
   `PAYLOAD_SECRET`, so it succeeds.
2. Watch the build log complete with no errors. Note the deployment URL —
   `https://<project>.vercel.app` (and any `*-git-main-*` alias).

---

## Part 8 — Scheduled publishing trigger

<!-- PENDING #4 -->
<!--
  Issue #4 (content model, in flight in parallel) determines how scheduled
  publishing fires — most likely a Vercel Cron that calls an API route on a
  schedule. The orchestrator will supply the specifics to fold in here. When it
  lands, this section must state:

    - CRON SCHEDULE ....... the crontab expression (e.g. every 5 min: "*/5 * * * *")
    - ENDPOINT ............ the route the cron hits (e.g. /api/cron/publish)
    - DECLARED IN ......... vercel.json `crons` array, committed to the repo (a
                            vercel.json arrives WITH #4 — none exists today)
    - AUTH SECRET ......... any CRON_SECRET the endpoint verifies, and to set it in
                            Vercel → Settings → Environment Variables (Production)
    - VERIFY .............. how to confirm the cron ran (Vercel → project → Crons /
                            deployment logs) and that a scheduled item published

  Only the specifics above need filling in — the surrounding infra (Vercel
  project, env vars) is already established by Parts 4–7.
-->

_Pending issue #4. Nothing to configure here yet: the scheduled-publishing
mechanism (expected to be a committed `vercel.json` cron plus a `CRON_SECRET`) is
defined by issue #4. Once it lands, fill in the schedule, endpoint, secret, and
verification per the checklist in the comment above._

---

## Part 9 — End-state verification

Confirm staging is live and self-deploying.

1. **Public site.** Open `https://<project>.vercel.app/` →
   **Expect:** the flowlyst marketing homepage (the P1 site shell — nav, hero,
   footer), server-rendered. View source shows real HTML content, not an empty
   client shell.

2. **Admin + schema.** Open `https://<project>.vercel.app/admin` →
   **Expect:** the Payload admin. On a freshly-migrated, user-less database this is
   the **create-first-admin** screen. Fill it in to create your admin account and
   log in.
   - **If you instead see a 500 / "relation … does not exist":** the migration
     (Part 3) didn't run against this database — re-run Part 3 with the **direct**
     string, then reload.

3. **Auto-deploy on merge to `main`.** Make a trivial change on a branch, open a
   PR, and squash-merge it to `main`. →
   **Expect:** Vercel automatically starts a new **Production** deployment for that
   `main` commit (visible under Deployments) and promotes it live when the build
   passes. Also confirm Settings → Git → **Production Branch = `main`**. This proves
   "every merge to `main` auto-deploys."

4. **Media upload → Blob (conditional — cannot be exercised yet).** The `Media`
   collection and the Vercel-Blob storage adapter are **not** in the app at the
   time of writing (a separate part of issue #5). **Once that adapter ships:**
   - `/admin` → **Media** → upload an image.
   - Vercel → project → **Storage** → your Blob store → **Browser** → confirm the
     uploaded object appears there.
   Until the adapter lands, this step is not runnable — the Blob store is
   provisioned and its token wired, but there is no upload path yet.

### Done when
- [ ] `/` renders the marketing homepage over HTTPS.
- [ ] `/admin` reaches the create-first-admin screen and you created an admin.
- [ ] A merge to `main` produced an automatic Production deployment.
- [ ] Blob store attached and `BLOB_READ_WRITE_TOKEN` auto-injected (upload check
      deferred until the Media adapter ships).
