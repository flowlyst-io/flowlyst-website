# 0003. Vercel Speed Insights

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The PRD sets an LCP budget (§10.2) and the site has no real-user performance data. Issue #10 asked how to measure it. Adding `@vercel/speed-insights` is a new library and service, so it passes the technology gate.

## Decision

We use Vercel Speed Insights on the free tier via `@vercel/speed-insights`, rendering `<SpeedInsights />` once in the frontend root layout, next to `<Analytics />`, plus a one-time Google PageSpeed test of the live homepage and each solution page. Approved by Tural on #10 (option A, 2026-10-14).

## Consequences

- Cookieless, aggregated real-user data: the cookie banner and consent flow do not change.
- The free tier shows only the overall Real Experience Score and 10,000 events per rolling 30 days; collection pauses at the limit and is never billed.
- The script reports only on Vercel deployments; locally it does not send data.
- Tural enables Speed Insights in the Vercel dashboard himself ([runbook](../runbooks/speed-insights.md)); agents never operate Vercel.
- The privacy and cookie policies name it next to Web Analytics.
- Tied to Vercel; moving hosts would mean replacing it.

## Alternatives considered

| Option                                                      | Buys                                               | Costs                                             |
| ----------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| A. Free Speed Insights plus a one-time Google test (chosen) | Real-user trend going forward and a lab number now | Free tier shows only the overall score; event cap |
| B. Free Speed Insights only                                 | Real-user data, no extra step                      | No number until enough visits arrive              |
| C. Speed Insights Plus                                      | Per-page and per-route breakdowns                  | $10 per project per month, Pro plan only          |
| D. Google test only                                         | One measurement, no new dependency                 | No ongoing data; lab numbers only                 |
