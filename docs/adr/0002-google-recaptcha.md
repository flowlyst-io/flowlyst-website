# 0002. Google reCAPTCHA v3

- **Status**: Accepted
- **Date**: 2026-10-11

## Context

PRD §10.4 names Google reCAPTCHA for the demo and contact forms, and the forms shipped with a server-validated honeypot only. Tural asked for it on 2026-10-11 ("we should add this ASAP to prevent spam when we go live", issue #103). reCAPTCHA is a third-party service, so it passes the technology gate; Tural's word covers the service as named in the PRD.

## Decision

We screen the demo, contact, speaking and newsletter submissions with reCAPTCHA v3 (score-based, invisible), verified server-side against Google's `siteverify` endpoint with `fetch`. No package is added.

- The token travels in the `x-recaptcha-token` request header, so no collection schema changes and no migration are needed.
- The server maps every verification to one of five outcomes. `skipped` (either key unset) proceeds untouched. `pass` proceeds. `fail` (a rejected token, an action mismatch or a score below `RECAPTCHA_MIN_SCORE`, default 0.5) is rejected with a visible 400; on `/subscribe` it returns the usual uniform ok and persists nothing. `missing` (no token) and `error` (Google unreachable, or a secret-side error) are accepted, logged, and the sales notification subject is prefixed `[Unverified] `.
- The honeypot stays in place.
- The script loads only on form pages, only once a visitor first focuses or presses inside a form, and a fresh token is fetched on every submit.
- The badge is hidden and Google's attribution sentence is shown above each submit button, as Google requires.
- reCAPTCHA is treated as strictly-necessary security: it runs regardless of the cookie-banner choice, and the cookie and privacy policies say so.

## Consequences

- Google becomes a processor of IP address, browser and device information, and page-interaction signals on form pages. The cookie and privacy policies are updated.
- The keys are Tural's to create and set in Vercel (see the cutover runbook). With either key absent, reCAPTCHA is off: no script, no attribution, no verification. Local, CI and e2e behave as before.
- Trade-off: a scripted POST that omits the token is accepted and marked `[Unverified]`, not blocked. Rejecting it would also drop leads from visitors whose ad-blocker or district filter blocks Google's script. The honeypot still catches naive bots, and rejecting `missing` is a one-line change if spam volume demands it.
- A mistyped secret is an `error`, never a `fail`, so a misconfiguration cannot reject every lead.
- District web filters may depress v3 scores; `RECAPTCHA_MIN_SCORE` is the lever and every reject logs its score.

## Alternatives considered

| Option                     | Buys                                                    | Costs                                                           |
| -------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| reCAPTCHA v3 (chosen)      | Named in the PRD, invisible, no friction on short forms | Google as processor, score tuning, attribution line             |
| reCAPTCHA v2 checkbox      | Clear human/bot signal                                  | A click on the primary lead form, against "keep the form short" |
| reCAPTCHA Enterprise       | Finer signals and reporting                             | A Google Cloud project and billing                              |
| Cloudflare Turnstile       | Privacy-friendlier, no scores to tune                   | Not named in the PRD, a new vendor                              |
| Honeypot only (status quo) | No third party                                          | Does not stop scripted POSTs that skip the hidden field         |
