# Runbook — Resend email for lead notifications

**Audience:** Tural (this touches an external account + Vercel env — agent-prepared, human-run).
**What it enables:** the lead forms email a notification/confirmation on submit (PRD §8). Until these steps are done, **submissions still persist** — the app just logs `[email] skipped (RESEND_API_KEY unset)` instead of sending. Nothing breaks while email is unconfigured.

## Background — how the app uses email

- `payload.config.ts` wires the Resend adapter **only when `RESEND_API_KEY` is set**. Unset → Payload logs email to the console; the notifier helpers (`src/email/leadNotifications.ts`) skip-and-log before attempting a send.
- Email failure can **never** fail a form submission: notifiers run in `afterChange` (after the DB write) and never throw.
- `from` is `EMAIL_FROM` (must be a Resend-verified sender). The confirmation email to the person who filled in a form is sent only when reCAPTCHA passed, and its reply-to is the same per-form `*_NOTIFY_TO` inbox as that form's team email. Recipients come from `LEAD_NOTIFY_TO` (set this one); the per-form `*_NOTIFY_TO` vars below are optional overrides (final default `inquiries@flowlyst.io`).

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

| Variable             | Value                   | Required               | Notes                                                                                                  |
| -------------------- | ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY`     | `re_...` from step 1    | **Yes**                | Enables sending. Unset = skip-and-log.                                                                 |
| `EMAIL_FROM`         | `noreply@flowlyst.io`   | **Yes**                | Verified sender (step 2). Defaults to `noreply@flowlyst.io` if unset, but that must still be verified. |
| `LEAD_NOTIFY_TO`     | `inquiries@flowlyst.io` | **Yes** (set this one) | Default recipient for demo, contact and speaking notifications. Default `inquiries@flowlyst.io`.       |
| `LEAD_NOTIFY_BCC`    | (no value)              | No                     | Leave unset; inquiries@ already reaches the team.                                                      |
| `SALES_NOTIFY_TO`    | normally unset          | No                     | Optional override: demo-request notifications. Default `LEAD_NOTIFY_TO`.                               |
| `CONTACT_NOTIFY_TO`  | normally unset          | No                     | Optional override: contact-form notifications. Default `LEAD_NOTIFY_TO`.                               |
| `SPEAKING_NOTIFY_TO` | normally unset          | No                     | Optional override: speaking requests. Default → `SALES_NOTIFY_TO` → `LEAD_NOTIFY_TO`.                  |

Redeploy (or let the next deploy pick them up).

All lead notifications go to `inquiries@flowlyst.io`, a group address that reaches the team (Tural, Aziz and Sama). Keep `LEAD_NOTIFY_BCC` unset, since the group already delivers to everyone.

### Switching lead email to inquiries@ (2026-10-21)

A Vercel step for Tural, on the Production environment:

1. Set `LEAD_NOTIFY_TO=inquiries@flowlyst.io`.
2. Delete `SALES_NOTIFY_TO`, `CONTACT_NOTIFY_TO`, `SPEAKING_NOTIFY_TO` and `LEAD_NOTIFY_BCC` if present, or set the three `*_NOTIFY_TO` to `inquiries@flowlyst.io`.
3. Redeploy.
4. Check: submit `/contact` from a private window; the team email arrives at inquiries@ for all three people.

### 4. Observe delivery (verification checklist)

After a deploy with the vars set:

1. **Demo:** submit `/request-demo` (once the page ships, #14). Confirm the sales inbox receives "New demo request — …" and the row appears in **Admin → Demo Requests**.
2. **Contact:** submit `/contact` (#15). Confirm `CONTACT_NOTIFY_TO` receives "New contact message — …".
3. **Newsletter:** subscribe on `/blog` (#16). Confirm the **subscriber's** address receives "You're subscribed to flowlyst", and re-subscribing the same email does **not** create a duplicate row or error.
4. **Speaking:** submit `/solutions/keynotes`. Confirm `SPEAKING_NOTIFY_TO` receives "New speaking request — …".
5. **BCC:** with `LEAD_NOTIFY_BCC` set, confirm each BCC'd inbox receives a copy of the demo, contact and speaking notifications (the lead's address will not show the BCC'd addresses; none receives the newsletter confirmation).
6. In the **Resend dashboard → Emails**, confirm each send shows **Delivered** (not bounced). A bounce on `EMAIL_FROM` usually means the domain/DKIM isn't fully verified.
7. Server logs: a successful send logs `[email] sent: <purpose> → <to>`; a failure logs `[email] send FAILED (…) — persistence unaffected`. You should see no `skipped` lines once `RESEND_API_KEY` is set.

## reCAPTCHA

reCAPTCHA v3 is decided in [ADR 0002](../adr/0002-google-recaptcha.md). Creating the keys and setting the env vars is in the [cutover runbook](./cutover.md).
