# 0005. Google Analytics 4

- **Status**: Accepted
- **Date**: 2026-10-27

## Context

Tural asked for Google Analytics on every page of the website (issue #139, 2026-10-27) and answered the refinement round: GA runs "after Accept only", the `generate_lead` event is sent for all three lead forms, "You will give me instruction on how to get it", and the existing Vercel Analytics and Speed Insights stay. Google Analytics is a third-party service, so it passes the technology gate with his word. This supersedes the rejection of Google Analytics 4 in [ADR 0001](./0001-vercel-web-analytics.md), which turned it down for its cookies and consent changes.

## Decision

We use Google Analytics 4 through gtag, loaded with Next's `<Script>`. No package is added.

- **Gated twice.** Nothing renders unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set and `hasConsent()` is true. A Decline, or no choice yet, loads nothing; an Accept starts GA in the same page view.
- **One event.** Each successful lead-form submit sends `generate_lead` with only `form_name` (`demo`, `contact`, `newsletter`, `speaking`). Nothing the visitor typed is sent.
- **Production only.** The ID is set in Vercel for Production only. `/admin` is never tracked, because it lives in a separate root layout.
- **No Consent Mode.** Nothing is sent before Accept.

## Consequences

- GA sets the first-party cookies `_ga` and `_ga_<ID>` after Accept. The cookie banner, the privacy policy and the cookie policy say so.
- CI sets a fake ID (`G-E2ETEST000`) job-wide so the build inlines it for the GA e2e spec; Google is never reached from tests, and the fake ID never reaches a deployed build.
- SPA page views rely on GA4 Enhanced Measurement's history-change tracking.
- Consent cannot be withdrawn after a choice until the visitor clears cookies, as before.
- Tural creates the GA property (runbook `docs/runbooks/google-analytics.md`).

## Alternatives considered

| Option                                           | Buys                                  | Costs                                                  |
| ------------------------------------------------ | ------------------------------------- | ------------------------------------------------------ |
| GA4 through gtag and `next/script` (chosen)      | Deepest features, no package          | Cookies, consent gate, legal copy                      |
| `@next/third-parties`                            | Maintained component                  | A new package for what a few lines already do          |
| Vercel Analytics only (status quo)               | Cookieless, no consent change         | Basic metrics, no lead-form funnel                     |
| GA4 with Consent Mode v2 and pings before Accept | Modeled data for visitors who decline | Sends data before consent, against "After Accept only" |
