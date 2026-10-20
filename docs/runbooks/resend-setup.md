# Runbook — Resend email for lead notifications

**Audience:** Tural (this touches an external account + Vercel env — agent-prepared, human-run).
**What it enables:** the lead forms email a notification/confirmation on submit (PRD §8). Until these steps are done, **submissions still persist** — the app just logs `[email] skipped (RESEND_API_KEY unset)` instead of sending. Nothing breaks while email is unconfigured.

## Background — how the app uses email

- `payload.config.ts` wires the Resend adapter **only when `RESEND_API_KEY` is set**. Unset → Payload logs email to the console; the notifier helpers (`src/email/leadNotifications.ts`) skip-and-log before attempting a send.
- Email failure can **never** fail a form submission: notifiers run in `afterChange` (after the DB write) and never throw.
- `from` is `EMAIL_FROM` (must be a Resend-verified sender). Recipients come from `LEAD_NOTIFY_TO` (set this one); the per-form `*_NOTIFY_TO` vars below are optional overrides (final default `info@flowlyst.io`).

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

| Variable             | Value                                | Required               | Notes                                                                                                  |
| -------------------- | ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY`     | `re_...` from step 1                 | **Yes**                | Enables sending. Unset = skip-and-log.                                                                 |
| `EMAIL_FROM`         | `noreply@flowlyst.io`                | **Yes**                | Verified sender (step 2). Defaults to `noreply@flowlyst.io` if unset, but that must still be verified. |
| `LEAD_NOTIFY_TO`     | e.g. `leads@flowlyst.io`             | **Yes** (set this one) | Default recipient for demo, contact and speaking notifications. Default `info@flowlyst.io`.            |
| `LEAD_NOTIFY_CC`     | `tural@flowlyst.io,aziz@flowlyst.io` | No (not secret)        | CCs demo, contact and speaking notifications; unset = no CC.                                           |
| `SALES_NOTIFY_TO`    | e.g. `sales@flowlyst.io`             | No                     | Optional override: demo-request notifications. Default `LEAD_NOTIFY_TO`.                               |
| `CONTACT_NOTIFY_TO`  | e.g. `info@flowlyst.io`              | No                     | Optional override: contact-form notifications (PRD §8.2). Default `LEAD_NOTIFY_TO`.                    |
| `SPEAKING_NOTIFY_TO` | e.g. `speaking@flowlyst.io`          | No                     | Optional override: speaking requests. Default → `SALES_NOTIFY_TO` → `LEAD_NOTIFY_TO`.                  |

Redeploy (or let the next deploy pick them up).

### 4. Observe delivery (verification checklist)

After a deploy with the vars set:

1. **Demo:** submit `/request-demo` (once the page ships, #14). Confirm the sales inbox receives "New demo request — …" and the row appears in **Admin → Demo Requests**.
2. **Contact:** submit `/contact` (#15). Confirm `CONTACT_NOTIFY_TO` receives "New contact message — …".
3. **Newsletter:** subscribe on `/blog` (#16). Confirm the **subscriber's** address receives "You're subscribed to flowlyst", and re-subscribing the same email does **not** create a duplicate row or error.
4. **Speaking:** submit `/solutions/keynotes`. Confirm `SPEAKING_NOTIFY_TO` receives "New speaking request — …".
5. **CC:** with `LEAD_NOTIFY_CC` set, confirm each CC'd inbox also receives the copy of the demo, contact and speaking notifications (and none receives the newsletter confirmation).
6. In the **Resend dashboard → Emails**, confirm each send shows **Delivered** (not bounced). A bounce on `EMAIL_FROM` usually means the domain/DKIM isn't fully verified.
7. Server logs: a successful send logs `[email] sent: <purpose> → <to>`; a failure logs `[email] send FAILED (…) — persistence unaffected`. You should see no `skipped` lines once `RESEND_API_KEY` is set.

## reCAPTCHA

reCAPTCHA v3 is decided in [ADR 0002](../adr/0002-google-recaptcha.md). Creating the keys and setting the env vars is in the [cutover runbook](./cutover.md).
