# CMS content model

The Payload content model that backs flowlyst.io (PRD §9). Everything marketing
content is CMS-driven — adding a testimonial, post, or case study never needs a
code change or redeploy.

## Collections & global

Grouped as they appear in the admin nav.

### Content

| Collection            | Purpose                                                                 | Publishing            |
| --------------------- | ----------------------------------------------------------------------- | --------------------- |
| **Blog Posts**        | Lexical body, excerpt, featured + OG image, author, tags, service category, auto reading-time, SEO meta | Drafts + scheduled publish + preview |
| **Case Studies**      | Structured long-form: intro / challenge / solution / results (each Lexical), district info, metrics, hero, SEO meta | Drafts + scheduled publish + preview |
| **Testimonials**      | Quote, client, org/district, industry, service category, video URL, photo, featured flag | Plain `status` (draft/published) |
| **Training Programs** | Hierarchical: program → ordered modules; level, format, duration        | Plain `status`        |
| **Authors**           | Name, title, photo, bio, links — referenced by blog posts               | Public                |
| **Media**             | Image library; **alt text required (validated)**; auto image sizes      | Public read           |

### Leads (inbox)

| Collection                 | Purpose                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| **Demo Requests**          | Highest-intent lead. Status workflow `pending → scheduled → completed/canceled`, internal notes, triage list columns + search. |
| **Contact Messages**       | Non-demo inquiries; reason dropdown; `new/handled` status.          |
| **Newsletter Subscribers** | Email + `subscribed/unsubscribed` status.                          |

### Admin

- **Users** — auth collection with an enforced `role` (see Roles).
- **Site Settings** (global) — contact email, hero copy, footer text, social links. Admin-only.

## Roles (enforced)

Two roles, enforced through Payload access control (`src/access/index.ts`):

- **Admin** — everything, including Users and Site Settings.
- **Editor** — content only. Cannot see or edit Users; cannot edit Site Settings.

Guardrails:

- The `role` field is locked at the field level to Admins, so an Editor editing
  their own profile can never self-escalate.
- The **first user ever created** (bootstrap screen) is forced to Admin.
- Public content collections return only `published` docs to anonymous
  callers (drafts never leak through the API); staff see everything.

## Drafts, scheduled publishing, preview

- **Drafts** — Blog Posts and Case Studies use Payload versions/drafts; unpublished
  work is invisible to the public. Testimonials/Training use a simple `status` select.
- **Scheduled publishing** — enabled via `versions.drafts.schedulePublish` on Blog
  Posts and Case Studies. Setting a future publish date enqueues a `schedulePublish`
  job. **The job only runs when the jobs queue is triggered** (see below).
- **Preview** — `admin.preview` → `/preview` route handler → validates a secret,
  enables Next.js Draft Mode, redirects to a server-rendered draft page. The page
  is an intentional placeholder until the Phase-2 templates exist.

### Production trigger for scheduled publishing — REQUIRED

Scheduled publishing does nothing until something calls the jobs runner:

```
GET /api/payload-jobs/run
```

On Vercel this is wired by [`vercel.json`](../vercel.json) as a Cron every 5 min.
Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the
`CRON_SECRET` env var is set, which the config's `jobs.access.run` checks.

**Runbook (issue #5 / staging & prod):**

1. Set `CRON_SECRET` to a random secret in the Vercel project env.
2. Deploy — `vercel.json` registers the cron automatically.
3. Note: Vercel Cron minute-level frequency requires a Pro plan; on Hobby the
   minimum is daily. Adjust `schedule` to the plan.

The queue can also be run manually by an authenticated Admin hitting the same
endpoint, or in code via `payload.jobs.run()`.

## Media storage

`@payloadcms/storage-vercel-blob`, gated on `BLOB_READ_WRITE_TOKEN`:

- **Token present** (staging/prod) → uploads go to Vercel Blob.
- **Token absent** (local dev) → filesystem (`/media`, gitignored).

`alwaysInsertFields: true` keeps the media DB schema identical in both modes, so a
single committed migration is valid everywhere.

## Environment variables

Local dev needs none of these (sensible fallbacks). Staging/prod:

| Var                     | Needed for                    | Notes                                                  |
| ----------------------- | ----------------------------- | ------------------------------------------------------ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob media storage     | Set by Vercel Blob. Absent → local filesystem.         |
| `CRON_SECRET`           | Scheduled publishing (cron)   | Secures `/api/payload-jobs/run`. Absent → cron denied. |
| `PREVIEW_SECRET`        | Draft preview                 | Optional; falls back to `PAYLOAD_SECRET`.              |

These three keys are documented in `.env.example` under the "CMS (issue #4)"
section (all optional locally).

## Migrations

Schema changes require a committed migration (CI/prod apply committed migrations,
not dev push):

```bash
pnpm migrate:create <name>   # generate from config diff (run with push off)
pnpm migrate                 # apply — what CI/prod run
```
