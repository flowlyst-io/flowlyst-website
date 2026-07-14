# Development

How to get the flowlyst-website app running locally, from a fresh clone to a
working dev server and admin.

## Stack

- **Next.js 16 (App Router)** + **TypeScript** — the public marketing site is
  server-rendered (SEO / AI discoverability, PRD §10.1).
- **Payload CMS 3**, embedded in the same Next.js app. Admin lives at `/admin`.
- **Postgres** via `@payloadcms/db-postgres` (local: Docker; production: Neon).
- **Tailwind CSS v4** for the public site (scoped to the frontend route group so
  it never touches the Payload admin UI).
- **Vitest** (unit / component + integration) and **Playwright** (E2E).

The app is split into two Next.js route groups under `src/app/`:

- `(frontend)` — the public marketing site.
- `(payload)` — the Payload admin panel and its API, mounted at `/admin` and
  `/api`. These files are generated/managed by Payload; avoid hand-editing them.

## Prerequisites

| Tool    | Version        | Notes                                                                                                       |
| ------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| Node.js | 22.x (>= 20.9) | `node -v`                                                                                                   |
| pnpm    | 10.x           | `corepack enable` then `corepack use pnpm@10` — the version is pinned in `package.json` (`packageManager`). |
| Docker  | any recent     | For the local Postgres container. Docker Desktop must be running.                                           |

## First-time setup

```bash
# 1. Start the local Postgres database (Postgres 18, in Docker).
docker compose up -d

# 2. Create your local env file from the template.
cp .env.example .env

# 3. Generate a unique PAYLOAD_SECRET and paste it into .env as PAYLOAD_SECRET.
openssl rand -hex 32

# 4. Install dependencies.
pnpm install

# 5. Start the dev server.
pnpm dev
```

> **Upgrading an existing checkout to Postgres 18?** Recreate the local data volume
> (`docker compose down -v`, then `docker compose up -d`) — a Postgres-16 data
> directory won't boot under 18.

`.env` is gitignored. The default `DATABASE_URL` in `.env.example` already matches
the Docker Postgres credentials in `docker-compose.yml`, so you only need to fill
in `PAYLOAD_SECRET`.

### Environment variables

| Variable                 | Required | Notes                                                                                                                              |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | yes      | Postgres connection string. Local default matches `docker-compose.yml`.                                                            |
| `PAYLOAD_SECRET`         | yes      | Secret for Payload auth/JWT. Generate with `openssl rand -hex 32`.                                                                 |
| `NEXT_PUBLIC_SERVER_URL` | no       | Explicit override for Payload's `serverURL` — the origin used to build absolute URLs (admin meta/OG tags, email links). See below. |

`NEXT_PUBLIC_SERVER_URL` is optional. When unset, `src/payload.config.ts` derives
`serverURL` automatically:

1. `NEXT_PUBLIC_SERVER_URL` if set (explicit override, e.g. `https://flowlyst.io`).
2. Otherwise, on Vercel, `https://` + `VERCEL_PROJECT_PRODUCTION_URL` — a Vercel
   system env var (the production domain, no protocol) present at build and
   runtime on every deployment, so no Vercel dashboard step is needed.
3. Otherwise `http://localhost:3000` for local development.

Set `NEXT_PUBLIC_SERVER_URL` only to override the derived origin (e.g. to pin a
preview deployment to the production domain).

Then open **http://localhost:3000**. In development, Payload auto-creates the
database schema on first boot (Drizzle "push"), so there is no migration step for
local work.

### Create the first admin user

Go to **http://localhost:3000/admin**. On an empty database Payload shows a
**create-first-user** screen — fill it in to create your admin account and log in.
On subsequent runs `/admin` shows the login screen instead.

## Everyday commands

| Command                             | What it does                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server (http://localhost:3000).                                            |
| `pnpm build`                        | Production build.                                                                        |
| `pnpm start`                        | Serve the production build (expects the schema to already exist — run migrations first). |
| `pnpm lint`                         | ESLint.                                                                                  |
| `pnpm typecheck`                    | `tsc --noEmit`.                                                                          |
| `pnpm format` / `pnpm format:check` | Prettier write / check.                                                                  |
| `pnpm test:int`                     | Vitest unit/component + integration tests (needs the DB running).                        |
| `pnpm test:e2e`                     | Playwright E2E tests (see below).                                                        |
| `pnpm generate:types`               | Regenerate `src/payload-types.ts` after changing collections.                            |

### Running tests

```bash
# Unit / component + integration (Vitest). Requires Postgres running.
pnpm test:int

# E2E (Playwright). One-time browser install, then run:
pnpm exec playwright install chromium
pnpm test:e2e
```

Locally, Playwright starts `pnpm dev` for you and Payload pushes the schema
automatically. In CI it runs against the production build with migrations applied
(see below).

## Database & migrations

Two schema paths, on purpose:

- **Local development** — schema is auto-synced from the Payload config on boot
  (`push`). Fast, zero-config. No migration files needed for day-to-day work.
- **CI and production (Neon)** — `push` is disabled; the schema comes **only** from
  the committed migrations in `src/migrations/`. This makes the production schema
  deterministic and reviewable.

**When you change the data model** (add/edit a collection or field), create a
migration and commit it so CI and production pick it up:

```bash
# With the local DB running and up to date, generate a migration:
pnpm migrate:create <short_name>

# Apply pending migrations to a database (this is what CI/production run):
pnpm migrate
```

> Because CI and production use migrations rather than push, a schema change that
> only lives in the config (works locally via push) will **not** apply in CI — you
> must generate and commit a migration.

### Schema changes deploy themselves (production)

You don't run migrations by hand against Neon. **Production builds on Vercel apply
committed migrations automatically, before the app build**:

1. Change the data model, then `pnpm migrate:create <short_name>` and commit the
   generated file in `src/migrations/`.
2. Open a PR. CI applies the migration to a throwaway database and runs the full
   suite against it, so a broken migration fails the check.
3. Merge to `main`. The production deploy runs `scripts/vercel-build.mjs`, which
   applies any pending migrations and **then** builds the app. If the migration
   fails, the build fails and the previous deployment stays live.

Only production deploys migrate. **Preview** deploys skip migration regardless of
topology — a preview's branch schema isn't merged yet, so it's never applied until
it lands on `main`. (The Neon↔Vercel integration is _documented_ to provision a
dedicated Neon branch per preview rather than pointing previews at the Production
database — see `docs/runbooks/staging.md` — but previews don't migrate either way.)
Local `pnpm build` never touches this path. The gate is `VERCEL_ENV === "production"` plus a required
`DATABASE_URL_UNPOOLED` (the direct, non-pooled Neon connection the Neon↔Vercel
integration injects) — migrations run against that string, not the pooled runtime
`DATABASE_URL`. See `scripts/vercel-build.mjs` and `scripts/migrate-gate.mjs`.

> **Keep migrations backward-compatible (expand-contract / additive).** The
> migration runs _before_ the new code deploys, so for the minutes the build takes
> the **previous** deployment keeps serving traffic against the already-migrated
> schema — add columns/tables in one deploy and only drop or rename the old ones in
> a later deploy, once nothing live references them.

### Resetting the local database

```bash
docker compose down -v   # stop Postgres and delete its data volume
docker compose up -d     # start fresh (dev push recreates the schema on next boot)
```

## Deployment

Production runs on **Vercel + Neon Postgres**. Initial provisioning (project
setup, env vars, connection strings, the first migration against Neon) is operated
by Tural — see issue #5. After that, deploys are automatic: every build on `main`
applies committed migrations to Neon and then builds the app (see "Schema changes
deploy themselves" above). Local development and CI never connect to Neon or
Vercel.

## Troubleshooting

- **`docker compose up` fails / port 5432 in use** — another Postgres is bound to
  5432 (e.g. a Homebrew `postgresql` service). Stop it (`brew services stop postgresql@15`)
  or change the host port mapping in `docker-compose.yml` and `DATABASE_URL`.
- **Payload can't connect to the database** — make sure `docker compose up -d`
  is running and `DATABASE_URL` in `.env` matches `docker-compose.yml`.
- **`PAYLOAD_SECRET` errors / blank admin** — ensure `PAYLOAD_SECRET` is set in
  `.env`.
- **Playwright can't find a browser** — run `pnpm exec playwright install chromium`.
