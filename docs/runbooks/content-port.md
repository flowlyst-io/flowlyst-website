# Content port runbook — legacy blog posts → CMS

Port the **7 legacy blog posts** from the live legacy site (`https://flowlyst.io`)
into the Payload CMS by running `scripts/migrate-legacy-content.ts`. This is a
**one-shot data migration** (issue #20): it reads the live legacy HTML, converts each
post body to Lexical rich text, and upserts the posts, their author, and their
featured images into whatever database `DATABASE_URL` points at.

The script is **idempotent** — re-running it updates the same 7 posts in place and
creates zero duplicates (posts + author upsert by `slug`, media by `filename`). It is
safe to run more than once.

> **Operating model (why this is a runbook, not an automated step).** Staging and
> production live on **Vercel + Neon**, which are **Tural-operated** — no agent has
> credentials or a path to those accounts (the Vercel/Neon MCPs were declined,
> 2026-07-13; see `docs/runbooks/staging.md`). So the port against a deployed
> environment is **run by Tural, from a local clone**, exactly like the one-time
> schema bootstrap in the staging runbook. Nothing here touches the Vercel/Neon
> dashboards.

---

## What the script does

For each of the 7 legacy posts it:

1. **Fetches** the live post page and extracts title, excerpt (the hero subtitle),
   publish date (`<time datetime>`), body HTML (the `.prose` region), featured image,
   and tags — nothing is hand-transcribed, so a re-run reproduces the same content.
2. **Converts** the body HTML to Lexical via Payload's own `convertHTMLToLexical`.
3. **Upserts the author** — Aziz Aghayev, "Founder & Lead Consultant" (PRD §6). The
   legacy byline is a generic "Flowlyst Team"; every post is re-attributed to the
   named founder. No author photo (the design's fallback avatar is intentional until
   issue #42).
4. **Uploads the featured image** to the Media collection (→ Vercel Blob on staging,
   see the env note below) and attaches it.
5. **Upserts the post** as **published**, with the legacy `publishedAt` date, its
   original slug (URL parity — see below), `serviceCategory: general`, and its tags.
   Reading time is auto-computed by the collection's save hook.

### Slugs are preserved (do not change them)

Each post keeps its **exact legacy path segment** as its slug, so every legacy URL
resolves 1:1 on the new site with **no redirect** (PRD §10.1 / §11):

| #   | Slug (= legacy path segment)                 | Published  |
| --- | -------------------------------------------- | ---------- |
| 1   | `ai-predictive-analytics-staff-productivity` | 2025-04-05 |
| 2   | `ai-sis-erp-automation-schools`              | 2025-03-30 |
| 3   | `ai-multi-year-forecasting-school-budgeting` | 2025-03-25 |
| 4   | `ai-tools-school-admin-operations`           | 2025-03-20 |
| 5   | `ai-tools-school-hr-purchasing`              | 2025-03-15 |
| 6   | `ai-tools-school-finance-department`         | 2025-03-10 |
| 7   | `ai-tools-school-business-officials`         | 2025-03-08 |

### One deliberate content correction

Post #1's live title reads **"AI in K-15 Operations…"** — a typo for **"K-12"**
(adjudicated on issue #20). The script fixes it on port. This is the only content
edit; everything else is a faithful copy of the live text.

### Category: faithful `general` for all 7 (with an optional upgrade)

Every post is ported as `serviceCategory: general`. That is the **faithful** value:
the legacy site exposes a category for exactly one post (post #1 = `GENERAL` in the
`/blog` payload) and none for the other six — so `general` (also the collection's
default) is the only category the source actually asserts. Nothing is guessed.

If you want the posts categorised by topic for the on-site filter and "related posts"
grouping, that is a **CMS content decision you can make any time** — no re-run needed.
A defensible topical mapping (proposal only, apply in `/admin` if you like it):

| Slug                                         | Proposed category      |
| -------------------------------------------- | ---------------------- |
| `ai-sis-erp-automation-schools`              | Consulting             |
| `ai-tools-school-admin-operations`           | Consulting             |
| `ai-tools-school-hr-purchasing`              | Consulting             |
| `ai-multi-year-forecasting-school-budgeting` | Budget Software        |
| `ai-tools-school-finance-department`         | Budget Software        |
| `ai-tools-school-business-officials`         | Budget Software        |
| `ai-predictive-analytics-staff-productivity` | General (legacy value) |

---

## Environment variables

| Var                     | Required                           | Notes                                                                                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | **yes**                            | The target database. For staging, use the **same pooled Neon string** the staging app uses (the script does data writes, not DDL).                                                                                                                                            |
| `PAYLOAD_SECRET`        | **yes**                            | Same value as the deployed environment.                                                                                                                                                                                                                                       |
| `BLOB_READ_WRITE_TOKEN` | **yes for staging/prod**           | With it set, the 7 featured images upload to **Vercel Blob** (where the deployed app serves media from). **Without it, images write to a local `./media` folder that the deployed site cannot see** — so the posts would render with the fallback art, not their real images. |
| `CI`                    | **set to `true` for staging/prod** | Disables Payload's dev-only schema auto-`push`, so the script writes **data only** and never touches the deployed schema. **Do not omit this when pointing at Neon.**                                                                                                         |

You need internet access to `https://flowlyst.io` on the machine running the script
(it fetches the live posts).

---

## Run it against staging (Tural)

From a local clone of `flowlyst-io/flowlyst-website` on the branch/commit being
deployed, with the toolchain from `docs/development.md`:

```bash
pnpm install

# Fill these from the Vercel/Neon dashboards (never commit them):
export DATABASE_URL='<staging pooled Neon connection string>'
export PAYLOAD_SECRET='<staging PAYLOAD_SECRET>'
export BLOB_READ_WRITE_TOKEN='<staging Vercel Blob token>'
export CI=true    # data-only: disables dev schema push against Neon

pnpm tsx scripts/migrate-legacy-content.ts
```

### Expected output

A first run reports **7 created / 7 uploaded**; a re-run reports **7 updated /
0 uploaded** (proof it's idempotent):

```
Author "Aziz Aghayev" ready (id=…)
  created  /blog/ai-predictive-analytics-staff-productivity
  … (7 lines) …

=== Legacy content port complete ===
┌── slug ──┬─ action ─┬─ category ─┬─ publishedAt ─┬─ readMins ─┬─ title ──┐
│ …7 rows… │          │  general   │               │            │          │
└──────────┴──────────┴────────────┴───────────────┴────────────┴──────────┘
Posts: 7 created, 0 updated. Media: 7 uploaded, 0 reused.
```

Exit code `0` = success; any failure exits non-zero and prints the failing post.

---

## Verify

In a browser against the deployed site (or `http://localhost:3022/…` for a local
dev check):

1. `/blog` — the index lists all 7 posts, newest first (Apr 5 2025 → Mar 8 2025).
2. Each `/blog/<slug>` (the 7 slugs above) renders with:
   - the correct **title** (post #1 shows **K-12**, not K-15),
   - byline **Aziz Aghayev · Founder & Lead Consultant** and the legacy date,
   - **reading time** (2–3 min),
   - the full body (intro, `##` subheads, bullet lists),
   - a valid **`Article`** JSON-LD block in the page source (`type="application/ld+json"`).
3. In `/admin` → Blog Posts, all 7 show `_status: Published` with their featured image.

---

## Rollback

The port only adds rows; nothing legacy is modified. To undo it, delete the 7 posts
by slug (and, if desired, their author and media) — either:

- **In `/admin`:** Blog Posts → select the 7 by title → Delete; optionally delete the
  `Aziz Aghayev` author and the 7 `ai-*.jpg` media items.
- **By slug list** (for a scripted delete): the 7 slugs are in the table above.

Because the script is idempotent, the usual "fix" is simply to **re-run** it (e.g.
after correcting content upstream) rather than roll back.
