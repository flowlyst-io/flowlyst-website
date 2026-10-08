# Cutover runbook — flowlyst.io goes live on Vercel

**Audience:** Tural. Every Vercel, Neon, DNS and Resend step is yours; nothing here is run by an agent.
**Target:** Tuesday 2026-10-13. **Issue:** #11. **Builds on:** [`staging.md`](staging.md), [`resend-setup.md`](resend-setup.md), [`content-port.md`](content-port.md) (this file points into them rather than repeating them).
**Never paste a real secret into this file or the repo.** Every credential below is a `<PLACEHOLDER>`; real values live only in the Vercel/Neon/Resend dashboards and your password manager.

## What we found (read once)

Drafted 2026-10-08 from `dig`, `curl` and the code on `main` (b173772).

- **Legacy hosting:** a single AWS host, `3.12.162.23` (nginx 1.26 reverse-proxying a Next.js app). `flowlyst.io` is an **A record** to it; `www.flowlyst.io` is a **CNAME to `flowlyst.io`**. Both TTLs are **240 s**, so rollback propagates in minutes.
- **Who holds what:** registrar is **Namecheap**; nameservers are `ns-cloud-d1..d4.googledomains.com` (Google Cloud DNS). **Edit records in the DNS host (Google Cloud DNS), not in Namecheap's DNS panel**, which is not authoritative. Do not change the nameservers.
- **Email must survive:** Google Workspace MX (`aspmx.l.google.com` priority 1, `alt1`/`alt2` priority 5, `alt3`/`alt4` priority 10), SPF `v=spf1 include:_spf.google.com ~all`, a Google DKIM key at `google._domainkey`, and DMARC at `_dmarc`. **Touch none of them.** Only the apex `A` and the `www` record change.
- **Legacy `www` behaviour:** `https://www.flowlyst.io/*` 301s to the bare host. The new site must do the same (step 8).
- **Legacy URLs:** 15 of 16 live URLs keep identical paths on the new site (inventory on #20). `/resources/case-studies` is 301'd in `next.config.ts`. **`/ai-chat` is live on legacy and 404s on the new site**, pending your decision on #70.

## Go / no-go gates (all must be true before step 1)

- [ ] PR #78 (legal pages, cookie consent, Corpowid) and PR #80 (perf/a11y) are merged and staging has redeployed. Today `https://flowlyst-website.vercel.app/privacy` returns **404**; the legacy footer links to it, so launching without #78 ships dead legal links.
- [ ] Legal copy on `/privacy`, `/terms`, `/cookies` signed off by you (#70).
- [ ] `/ai-chat` decided (#70): redirect target, or leave to 404. If redirect, an agent adds a 301 in `next.config.ts` and it is merged **before** step 9.
- [ ] Decisions in "Open decisions" at the bottom are answered.

## T-minus schedule

| When | Do |
| --- | --- |
| Thu 10-08 to Fri 10-09 | Gates above. Decide Vercel plan and DB (Open decisions). |
| Sat 10-10 to Mon 10-12 | Steps 1 to 7 (everything that does not change live traffic). Resend DNS records (step 6) are additive and safe now. |
| Tue 10-13, a quiet hour | Steps 8 to 12 (domains, DNS flip, smoke). Keep an hour free to roll back. |

---

## Step 1 — Decide the production database, then provision or confirm it

**Default recommendation: reuse the existing staging Neon project.** On the current Vercel project the "Production" environment already is staging (`staging.md` Part 4 step 6), it already holds the migrated schema and any content you entered, and the Neon region is locked to the Vercel region. Cutover then becomes "add the domain" with no data move.

*Path A, reuse (recommended):*
1. Neon console, open the project behind the staging deploy, confirm the **Production** branch is the one the Vercel integration points at.
2. Delete the three smoke rows in `/admin` (speaking_requests id 1, demo_requests id 1, contact_messages id 1, "STAGING SMOKE TEST", #70). Step 12 starts from empty lead tables so a real submission is unambiguous.
3. Also consider Neon plan limits (Free auto-suspends and has compute-hour caps); the Launch plan is the usual upgrade for a live site. Spending call, yours.

*Path B, fresh production database:* follow `staging.md` Parts 1 to 3 and Part 6 ("Connect the Neon-Vercel integration") with project name `flowlyst-production`, Postgres **18**, region **`aws-us-east-1`** (matching Vercel's function region). Copy the **direct** (non-`-pooler`) string for the bootstrap. Re-enter all CMS content afterwards (testimonials, case studies, site settings). Only choose this if you want staging content kept separate.

**Verify:** Neon console shows the database `Active`; Vercel project, Settings, Environment Variables lists `DATABASE_URL` (pooled, host contains `-pooler`) and `DATABASE_URL_UNPOOLED` for **Production**, both integration-managed. Do not edit them by hand.

## Step 2 — Generate the secrets

Run once locally; store each in your password manager. **Never reuse the local-dev `.env` values.**

```bash
openssl rand -hex 32   # PAYLOAD_SECRET   (path A: keep the existing staging value, do not rotate)
openssl rand -hex 32   # CRON_SECRET
openssl rand -hex 32   # PREVIEW_SECRET
```

Rotating `PAYLOAD_SECRET` on a database that already has users invalidates their sessions and any stored auth tokens, so on Path A keep the current value. On Path B generate a new one.

**Verify:** you have three distinct 64-character hex strings saved.

## Step 3 — Set production environment variables

Vercel, project, Settings, Environment Variables. Set the values for the **Production** environment (add Preview as noted). A change takes effect only on the **next deploy**; `NEXT_PUBLIC_SERVER_URL` is inlined at build time, so a redeploy (step 5) is mandatory.

| Variable | Secret? | Value / source | Environments | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | secret | Neon-Vercel integration (pooled). **Do not hand-set.** | Prod | Required at runtime. |
| `DATABASE_URL_UNPOOLED` | secret | Neon-Vercel integration (direct). **Do not hand-set.** | Prod | Required at **build** time; production builds apply migrations with it and fail closed without it. |
| `PAYLOAD_SECRET` | **secret, you generate** | `<PAYLOAD_SECRET>` (step 2) | Prod, Preview | Required. |
| `BLOB_READ_WRITE_TOKEN` | **secret, Vercel generates** | Created when you attach the Blob store (`staging.md` Part 5); select Production | Prod, Preview | Without it uploads go to local disk the deployed site cannot serve. Path B: create a new store. |
| `CRON_SECRET` | **secret, you generate** | `<CRON_SECRET>` (step 2) | Prod only | Absent means scheduled publishing is denied. |
| `PREVIEW_SECRET` | **secret, you generate** | `<PREVIEW_SECRET>` (step 2) | Prod, Preview | Absent means draft preview is denied (no fallback). |
| `RESEND_API_KEY` | **secret, Resend generates** | `re_...` from step 6 | Prod (and Preview if you want staging email) | Unset means submissions persist but no email is sent (logged `skipped`). |
| `EMAIL_FROM` | not secret | `noreply@flowlyst.io` (must be on the Resend-verified domain) | Prod | Defaults to this value if unset, but the domain must still be verified. |
| `SALES_NOTIFY_TO` | not secret | e.g. `sales@flowlyst.io` | Prod | Demo requests. Defaults to `info@flowlyst.io`. |
| `CONTACT_NOTIFY_TO` | not secret | e.g. `info@flowlyst.io` | Prod | Contact form. Default `info@flowlyst.io`. |
| `SPEAKING_NOTIFY_TO` | not secret | e.g. `speaking@flowlyst.io` | Prod | Keynote requests. Default falls back to `SALES_NOTIFY_TO`, then `info@flowlyst.io`. |
| `NEXT_PUBLIC_SERVER_URL` | not secret | `https://flowlyst.io` | Prod | Drives sitemap `<loc>`, the robots `Sitemap:` line, canonical/OG URLs, JSON-LD. **Set this explicitly**; do not rely on `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets automatically and which may still resolve to the `.vercel.app` host. |
| `ENABLE_EXPERIMENTAL_COREPACK` | not secret | `1` | Prod, Preview | Pins pnpm 10.4.1. Already set on staging; confirm. |

**Not needed at launch (do not create):**
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`: reCAPTCHA is **parked** and no code on `main` reads them; forms rely on a server-validated honeypot (`resend-setup.md`, "Parked: reCAPTCHA"). Open decision below.
- A revalidation secret: none exists on `main`. Content pages revalidate on publish from the CMS hooks with no shared secret. If PR #80 or a later PR introduces one, add it here before merging.
- `VERCEL_PROJECT_PRODUCTION_URL`: Vercel-managed.

**Verify:** Settings, Environment Variables shows every row above with Production ticked; `CRON_SECRET` is Production only. No variable value is visible in any screenshot you share.

## Step 4 — (Path B only) bootstrap the schema

Skip on Path A (the schema is already there). On Path B follow `staging.md` Part 3 using the **direct** string and `<PAYLOAD_SECRET>`. A fresh database has no schema until migrated, and `/admin` returns 500 (`relation "users" does not exist`) otherwise.

**Verify:** the migrate command ends with all migrations applied and exits 0.

## Step 5 — Deploy and verify on the `.vercel.app` URL (domain not attached yet)

1. Vercel, Deployments, **Redeploy** the latest `main` deployment (uncheck "use existing build cache" so the new `NEXT_PUBLIC_SERVER_URL` is inlined).
2. Wait for the build log line `[vercel-build] ... applying committed migrations` followed by a green build.

**Verify** (live traffic is unaffected; this is the pre-flight):
```bash
curl -s https://flowlyst-website.vercel.app/robots.txt
curl -s https://flowlyst-website.vercel.app/sitemap.xml | grep -o '<loc>[^<]*' | head -5
curl -s https://flowlyst-website.vercel.app/ | grep -o '<link rel="canonical"[^>]*>'
```
Expect: the `Sitemap:` line and every `<loc>` start with `https://flowlyst.io`, the canonical is `https://flowlyst.io/`, robots allows `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`. **If any show `vercel.app`, stop: step 3's `NEXT_PUBLIC_SERVER_URL` did not reach the build.**

## Step 6 — First admin user and Resend (additive, safe before the flip)

**6a. First admin user.** Path A: your admin user already exists; log in at `https://flowlyst-website.vercel.app/admin` and skip to 6b. Path B: open `/admin` on the `.vercel.app` URL immediately after the deploy; Payload shows the **create first user** form while the users table is empty, and anyone who finds the URL first could claim it, so do this straight away. Use your own email and a unique password from the password manager.
**Verify:** you can log in and see the Content, Leads and Admin groups.

**6b. Resend.** Run [`resend-setup.md`](resend-setup.md) steps 1 and 2: create the key `flowlyst-production` (Sending access), add and verify the `flowlyst.io` domain. The DNS records Resend shows are **added to the existing zone in Google Cloud DNS** alongside the current ones:
- Add exactly what Resend displays (typically DKIM `resend._domainkey` and an SPF/MX pair on a `send` subdomain). They do not collide with the Workspace records.
- **If Resend asks for a root-level SPF `TXT`, do not add a second SPF record** (two SPF records invalidate both). Merge into the existing one: `v=spf1 include:_spf.google.com include:<resend-include> ~all`.
- **Do not edit or remove** MX, `google._domainkey` or `_dmarc`.
Then set `RESEND_API_KEY` (and the `*_NOTIFY_TO` vars) per step 3 and redeploy.
**Verify:** Resend shows `flowlyst.io` **Verified**; `dig MX flowlyst.io +short` still returns the five Google hosts.

## Step 7 — Port the blog content (must run BEFORE the DNS flip)

`pnpm content:port` **scrapes the live `https://flowlyst.io`** (`content-port.md`). After step 10 that URL is the new site, so the legacy source is gone. Run it now, from a local clone, against the production database, using the exact commands in `content-port.md` "Run it against staging" with the production pooled `DATABASE_URL`, `PAYLOAD_SECRET` and `BLOB_READ_WRITE_TOKEN`. Always use `pnpm content:port`, never bare `tsx`.

Path A where staging was already ported: re-run anyway; it is idempotent (expect `7 updated, 0 uploaded`).
**Verify:** expected output `7 created / 7 uploaded` (first run) and the checks in `content-port.md` "Verify" on the `.vercel.app` URL: `/blog` lists 7 posts, each `/blog/<slug>` renders, Article JSON-LD is present, `/admin` shows 7 Published. Then enter or confirm testimonials and case studies in `/admin` (no legacy source exists, #70).

## Step 8 — Add the domains in Vercel (still no traffic change)

1. Project, Settings, **Domains**, add `flowlyst.io`. Make it the **Production** domain (no redirect).
2. Add `www.flowlyst.io` and set it to **Redirect to `flowlyst.io`**. Choose status **301** if the dropdown offers it (PRD §11 says 301); a 308 is equivalent for crawlers if not.
3. Vercel shows each domain as "Invalid Configuration" with the DNS values it wants. **Write them down exactly as shown**; newer projects get project-specific values, and the dashboard is authoritative over anything in this file (the classic values are `A 76.76.21.21` and `CNAME cname.vercel-dns.com`).

**Verify:** both domains are listed, `www` shows the redirect to `flowlyst.io`, the legacy site is still serving (`curl -sI https://flowlyst.io | head -1` returns `200` from `nginx`).

## Step 9 — Pre-flip redirect check on the `.vercel.app` URL

Confirm the legacy URLs resolve on the new site while legacy still serves production:
```bash
for p in / /about /contact /request-demo /blog /solutions/ai-training /solutions/budget-software /solutions/consulting \
  /blog/ai-predictive-analytics-staff-productivity /blog/ai-sis-erp-automation-schools /blog/ai-multi-year-forecasting-school-budgeting \
  /blog/ai-tools-school-admin-operations /blog/ai-tools-school-hr-purchasing /blog/ai-tools-school-finance-department \
  /blog/ai-tools-school-business-officials /privacy /terms /cookies; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' https://flowlyst-website.vercel.app$p)" "$p"; done
curl -sI https://flowlyst-website.vercel.app/resources/case-studies | grep -iE '^(HTTP|location)'
```
**Verify:** every line is `200`; `/resources/case-studies` is `301` with `location: /case-studies`. `/ai-chat` is the only known mismatch (your #70 decision); if a redirect was chosen it should be `301` here too.

## Step 10 — The DNS flip

In Google Cloud DNS, zone `flowlyst.io`. TTLs are already 240 s, so no lowering is needed; keep new records at **300 s or less** until the post-cutover checks pass.

1. **Record the current state first** (screenshot the zone's record list; this is your rollback source): `A flowlyst.io -> 3.12.162.23`, `CNAME www -> flowlyst.io.`
2. **Change** the apex `A` record from `3.12.162.23` to the A value Vercel showed in step 8.
3. **Change** the `www` record from `CNAME flowlyst.io.` to the CNAME value Vercel showed (classically `cname.vercel-dns.com.`).
4. **Do not touch anything else**: MX, TXT (SPF, DMARC, DKIM, Resend records), NS and SOA stay as they are.

**Verify:**
```bash
dig +short flowlyst.io A          # the Vercel value, not 3.12.162.23
dig +short www.flowlyst.io        # the Vercel CNAME target
dig +short flowlyst.io MX         # unchanged: five aspmx.l.google.com hosts
dig +short flowlyst.io TXT        # SPF unchanged (plus Resend entries if root-level)
```
In Vercel, Settings, Domains: both domains flip to **Valid Configuration**, and the certificate is issued automatically (usually within minutes). Send a test email to `info@flowlyst.io` from outside and confirm it arrives.

## Step 11 — Post-flip redirect and canonical verification

```bash
curl -sI https://www.flowlyst.io/about | grep -iE '^(HTTP|location)'   # 301 -> https://flowlyst.io/about
curl -sI http://flowlyst.io/ | grep -iE '^(HTTP|location)'             # redirect to https
curl -sI https://flowlyst.io/ | grep -iE '^(HTTP|server)'              # 200, server: Vercel (not nginx)
curl -s https://flowlyst.io/robots.txt
curl -s https://flowlyst.io/sitemap.xml | grep -c '<loc>https://flowlyst.io'
curl -s https://flowlyst.io/ | grep -o '<link rel="canonical"[^>]*>'
```
Re-run the loop from step 9 with `https://flowlyst.io` in place of the `.vercel.app` host.
**Verify:** `www` returns 301 to the bare host with the path preserved; `server` is no longer nginx; every sitemap `<loc>` and each canonical is on `flowlyst.io`, none on `vercel.app`; all 15 preserved legacy URLs return 200; robots allows the four AI crawlers.

## Step 12 — Post-cutover smoke (lead capture is sacred)

Submit each form once on **`https://flowlyst.io`** with a clearly labelled test (`CUTOVER SMOKE TEST`, an address you control) and confirm the email arrives and the row exists in `/admin`:

| Form | Where | Email expected at | Row in |
| --- | --- | --- | --- |
| Demo request | `/request-demo` | `SALES_NOTIFY_TO`: "New demo request" | Admin, Demo Requests |
| Contact | `/contact` | `CONTACT_NOTIFY_TO`: "New contact message" | Admin, Contact Messages |
| Newsletter | `/blog` (bottom) | **the subscriber's own address**: "You're subscribed to flowlyst" | Admin, Newsletter Subscribers (re-subscribing creates no duplicate) |
| Speaking request | `/solutions/keynotes` | `SPEAKING_NOTIFY_TO`: "New speaking request" | Admin, Speaking Requests |

In the Resend dashboard, Emails, every send must show **Delivered**. A bounce usually means DKIM is not fully verified (step 6b). Then delete the four test rows.

Also check, in a real browser:
- [ ] **Corpowid widget** renders and opens on `https://flowlyst.io` (it may not initialise on a host the Corpowid account has not whitelisted; PR #78 saw a 404 "account id not correct" from `localhost`). If it fails on `flowlyst.io`, add the domain in the Corpowid account.
- [ ] Cookie banner appears on first visit; `/privacy`, `/terms`, `/cookies` load.
- [ ] `/admin` loads over `flowlyst.io` and you can log in.
- [ ] Publish a trivial edit in `/admin` and see it on the live page without a deploy (on-demand revalidation).
- [ ] Vercel, project, Settings, **Cron Jobs** shows `/api/payload-jobs/run` at `0 6 * * *`.
- [ ] Submit `https://flowlyst.io/sitemap.xml` in Google Search Console and Bing Webmaster (the legacy sitemap URL is the same path, so existing submissions keep working).

## Step 13 — Performance check (field LCP)

Lab numbers are already gated per PR (Lighthouse mobile at or above 90, LCP under 2.5 s, CLS under 0.1). **Field LCP via Vercel Speed Insights is not available on `main`**: `@vercel/speed-insights` is not installed and adding it is a technology-gate decision (Open decisions). If approved, an agent installs it, then you enable it under project, **Speed Insights**, and read the field LCP (p75, mobile) after a day of traffic: target under 2.5 s. Until then, run Lighthouse mobile on `https://flowlyst.io/` and the four `/solutions/*` pages as the post-cutover check and watch Search Console, Core Web Vitals once data accrues (about 28 days).

---

## Rollback (DNS revert)

Trigger: forms not delivering, widespread 5xx, wrong content, or email disruption that cannot be fixed in minutes. The legacy host `3.12.162.23` is untouched by this runbook and keeps serving, so rollback is purely DNS.

1. In Google Cloud DNS, set the apex `A` back to `3.12.162.23` and `www` back to `CNAME flowlyst.io.` (from your step 10 screenshot).
2. **Verify:** `dig +short flowlyst.io A` returns `3.12.162.23` and `curl -sI https://flowlyst.io | grep -i '^server'` shows `nginx`. With a 240 s TTL, most resolvers recover within about 5 minutes; some resolvers may hold the old answer longer.
3. Leave the Vercel domains attached (harmless while DNS points away) and keep the Vercel project running.
4. Any form submissions made on the new site while live are in the production database; export from `/admin` before discarding anything.

Email is unaffected by a flip or a rollback because MX is never changed. **Do not decommission the legacy AWS host** until the new site has run cleanly for at least two weeks and you have decided to retire it (outside this runbook).

## Open decisions (need Tural before Tuesday)

1. **Vercel Hobby is not licensed for commercial use.** This is a company marketing site; Vercel's terms point to **Pro** (about $20 per user per month) for it. Hobby also caps Speed Insights events and cron cadence. Spending call, yours.
2. **Production database:** reuse the staging Neon project (recommended, Path A) or create a fresh one (Path B)?
3. **`/ai-chat`:** rebuild later, 301 to `/request-demo` (or `/contact`, `/`), or let it 404 (#70)?
4. **Launch without reCAPTCHA?** PRD §10.4 lists it; it is parked and forms use a honeypot only. Launch on the honeypot, or hold for reCAPTCHA?
5. **Speed Insights:** approve `@vercel/speed-insights` (technology gate; ADR needed) or use Lighthouse plus Search Console only?
6. **Corpowid:** confirm the account is active, whitelisted for `flowlyst.io`, and sets no tracking cookies (#78 flag 11).
