# Runbook — Resend email for lead notifications

**Audience:** Tural (this touches an external account + Vercel env — agent-prepared, human-run).
**What it enables:** the lead forms email a notification/confirmation on submit (PRD §8). Until these steps are done, **submissions still persist** — the app just logs `[email] skipped (RESEND_API_KEY unset)` instead of sending. Nothing breaks while email is unconfigured.

## Background — how the app uses email

- `payload.config.ts` wires the Resend adapter **only when `RESEND_API_KEY` is set**. Unset → Payload logs email to the console; the notifier helpers (`src/email/leadNotifications.ts`) skip-and-log before attempting a send.
- Email failure can **never** fail a form submission: notifiers run in `afterChange` (after the DB write) and never throw.
- `from` is `EMAIL_FROM` (must be a Resend-verified sender). Recipients come from the `*_NOTIFY_TO` vars below (default `info@flowlyst.io`).

## Steps

### 1. Create the Resend API key

1. Sign in at <https://resend.com> (create the account if needed).
2. **API Keys → Create API Key.** Name it `flowlyst-production`, permission **Sending access**.
3. Copy the key (`re_...`) — shown once. This is `RESEND_API_KEY`.

### 2. Verify the sending domain (required for `EMAIL_FROM`)

1. **Domains → Add Domain** → enter `flowlyst.io`.
2. Resend shows DNS records (SPF `TXT`, DKIM `CNAME`/`TXT`, and a MX/return-path record). Add each to the `flowlyst.io` DNS zone at the registrar/DNS host.
3. Wait for Resend to show the domain **Verified** (minutes to a few hours).
4. Choose the from-address, e.g. `noreply@flowlyst.io`. This is `EMAIL_FROM`. It must be on the verified domain or Resend rejects the send.

### 3. Set Vercel environment variables

Project → **Settings → Environment Variables** (Production, and Preview if you want staging email). Add:

| Variable             | Value                       | Required | Notes                                                                                                  |
| -------------------- | --------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY`     | `re_...` from step 1        | **Yes**  | Enables sending. Unset = skip-and-log.                                                                 |
| `EMAIL_FROM`         | `noreply@flowlyst.io`       | **Yes**  | Verified sender (step 2). Defaults to `noreply@flowlyst.io` if unset, but that must still be verified. |
| `SALES_NOTIFY_TO`    | e.g. `sales@flowlyst.io`    | No       | Demo-request notifications. Default `info@flowlyst.io`.                                                |
| `CONTACT_NOTIFY_TO`  | e.g. `info@flowlyst.io`     | No       | Contact-form notifications (PRD §8.2). Default `info@flowlyst.io`.                                     |
| `SPEAKING_NOTIFY_TO` | e.g. `speaking@flowlyst.io` | No       | Speaking-request notifications. Default → `SALES_NOTIFY_TO` → `info@flowlyst.io`.                      |

Redeploy (or let the next deploy pick them up).

### 4. Observe delivery (verification checklist)

After a deploy with the vars set:

1. **Demo:** submit `/request-demo` (once the page ships, #14). Confirm the sales inbox receives "New demo request — …" and the row appears in **Admin → Demo Requests**.
2. **Contact:** submit `/contact` (#15). Confirm `CONTACT_NOTIFY_TO` receives "New contact message — …".
3. **Newsletter:** subscribe on `/blog` (#16). Confirm the **subscriber's** address receives "You're subscribed to flowlyst", and re-subscribing the same email does **not** create a duplicate row or error.
4. **Speaking:** submit `/solutions/keynotes`. Confirm `SPEAKING_NOTIFY_TO` receives "New speaking request — …".
5. In the **Resend dashboard → Emails**, confirm each send shows **Delivered** (not bounced). A bounce on `EMAIL_FROM` usually means the domain/DKIM isn't fully verified.
6. Server logs: a successful send logs `[email] sent: <purpose> → <to>`; a failure logs `[email] send FAILED (…) — persistence unaffected`. You should see no `skipped` lines once `RESEND_API_KEY` is set.

## Parked: reCAPTCHA (do not do yet)

reCAPTCHA on the demo/contact forms (PRD §10.4) is **parked** (adjudicated). The forms currently use a server-validated honeypot for spam resistance. When reCAPTCHA is picked up:

- Obtain a reCAPTCHA (v3 or Enterprise) site + secret key pair.
- Add `RECAPTCHA_SITE_KEY` (public, used by the client form widgets) and `RECAPTCHA_SECRET_KEY` (server-only, used to verify the token) to Vercel env.
- Verification plugs in at the form submission path (a token check before `payload.create`) — server-side, alongside the existing honeypot.

No code for this ships in the Phase 3 foundation; this note only reserves the env-var names and integration point.
