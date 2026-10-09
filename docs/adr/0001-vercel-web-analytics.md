# 0001. Vercel Web Analytics

- **Status**: Accepted
- **Date**: 2026-10-09

## Context

The site had no visitor analytics. Tural asked for Vercel Web Analytics to be set up (2026-10-09) and enabled it in the Vercel dashboard. Adding `@vercel/analytics` is a new library and service, so it passes the technology gate.

## Decision

We use Vercel Web Analytics via `@vercel/analytics`, rendering `<Analytics />` once in the frontend root layout. Approved by Tural, 2026-10-09.

## Consequences

- First-party, cookieless, aggregated page-view data: the cookie banner and consent flow do not change.
- Free on the current Vercel plan.
- The privacy and cookie policies state its use (flagged `[FOR TURAL]` for sign-off).
- The script reports only on Vercel deployments; locally it does not send data.
- Tied to Vercel; moving hosts would mean replacing it.

## Alternatives considered

| Option               | Buys                                        | Costs                                                |
| -------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Vercel Web Analytics | Cookieless, no consent change, free, simple | Basic metrics, Vercel-specific                       |
| Plausible            | Cookieless, richer reporting                | Paid subscription, another vendor to manage          |
| Google Analytics 4   | Deepest features                            | Cookies and consent banner changes, privacy exposure |
| None                 | No change                                   | No visibility into traffic or lead-form funnel       |
