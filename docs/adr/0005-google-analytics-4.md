# 0005. Google Analytics 4

- **Status**: Accepted; amended 2026-11-15 (#161)
- **Date**: 2026-10-27

## Context

Tural asked for Google Analytics on every page of the website (issue #139, 2026-10-27) and answered the refinement round: GA runs "after Accept only", the `generate_lead` event is sent on his three forms (demo, contact, newsletter) and on the speaking-request form too, which is an assumed default, and "You will give me instruction on how to get it". The existing Vercel Analytics and Speed Insights stay: that is Nizam's default in issue #139, which he did not object to. Google Analytics is a third-party service, so it passes the technology gate with his word. This supersedes the rejection of Google Analytics 4 in [ADR 0001](./0001-vercel-web-analytics.md), which turned it down for its cookies and consent changes.

## Decision

We use Google Analytics 4 through gtag, loaded with Next's `<Script>`. No package is added.

- **Gated twice.** _Superseded by the amendment below._ Nothing renders unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set and `hasConsent()` is true. A Decline, or no choice yet, loads nothing; an Accept starts GA in the same page view.
- **One event.** Each successful lead-form submit sends `generate_lead` with only `form_name` (`demo`, `contact`, `newsletter`, `speaking`). Nothing the visitor typed is sent.
- **Production only.** The ID is set in Vercel for Production only. `/admin` is never tracked, because it lives in a separate root layout.
- **No Consent Mode.** Nothing is sent before Accept. This still holds in the opt-in region; see the amendment.

## Consequences

- GA sets the first-party cookies `_ga` and `_ga_<ID>` after Accept. The cookie banner, the privacy policy and the cookie policy say so.
- CI sets a fake ID (`G-E2ETEST000`) job-wide so the build inlines it for the GA e2e spec; Google is never reached from tests, and the fake ID never reaches a deployed build.
- SPA page views rely on GA4 Enhanced Measurement's history-change tracking.
- _Superseded by the amendment below:_ consent cannot be withdrawn after a choice until the visitor clears cookies, as before.
- Tural creates the GA property (runbook `docs/runbooks/google-analytics.md`).

## Alternatives considered

| Option                                           | Buys                                  | Costs                                                  |
| ------------------------------------------------ | ------------------------------------- | ------------------------------------------------------ |
| GA4 through gtag and `next/script` (chosen)      | Deepest features, no package          | Cookies, consent gate, legal copy                      |
| `@next/third-parties`                            | Maintained component                  | A new package for what a few lines already do          |
| Vercel Analytics only (status quo)               | Cookieless, no consent change         | Basic metrics, no lead-form funnel                     |
| GA4 with Consent Mode v2 and pings before Accept | Modeled data for visitors who decline | Sends data before consent, against "After Accept only" |

## Amendment: regional consent (#161, 2026-11-15)

Tural decided (issue #161, 2026-11-15; confirmed in session 2026-11-16, overriding the 2026-11-12 comment "Only people who accept should be counted") that US and other non-EU visitors are counted from their first page and can opt out, while the EU, EEA, UK, Switzerland and unknown countries keep Accept-first. The wording of the privacy and cookie policies is held for his review, and the change is not merged until he confirms it.

- **The region.** `src/proxy.ts` (the Next 16 proxy) reads Vercel's `x-vercel-ip-country` header and sets the session cookie `fl_consent_region` to `opt-in` or `opt-out`. It stores the mode, never the country, and rewrites it only when it changes. Pages stay static: the cookie rides on the response, and the server HTML is the same for every region. The proxy skips `/admin`, `/api`, `/card`, `/go`, build assets and any path with a dot.
- **Opt-in region.** The 27 EU member states, Iceland, Liechtenstein, Norway, the UK, Switzerland, the territories with their own country codes (GF, GP, MQ, RE, YT, MF, AX, GI, GG, JE, IM), the non-ISO codes `EU` and `UK`, and any missing or unknown country. Nothing GA loads before Accept, and Decline or no choice loads nothing.
- **Opt-out region.** Every other country. GA runs from the first page with no click; the banner says so and offers **Got it** (stores `acknowledged`, still counted) and **Opt out** (stores `declined`).
- **Stored choices.** `accepted` stays counted and `declined` stays out. In the opt-in region `acknowledged` is not an accept.
- **Global Privacy Control.** A browser that sends GPC (`navigator.globalPrivacyControl`) is never counted, in either region, whatever it chose before; no Accept or Got it banner is shown. Cookie settings opens a note saying so, with only a Close button; nothing is stored.
- **Reopen.** A footer **Cookie settings** button reopens the banner for the visitor's region without clearing the stored choice, so "opt out at any time" is true.
- **Teardown.** Opting out or declining after GA has loaded sets gtag's own `ga-disable-<ID>` flag, which stops collection in the same page view, and deletes `_ga` and `_ga_<ID>` for the host and each parent domain. The loaded script cannot be unloaded; a later Got it or Accept clears the flag. The teardown also runs once on load, so a visitor who is no longer counted (GPC switched on) loses leftover cookies.
- **Leads.** `generate_lead` fires for anyone counted, including a US visitor who has not chosen yet.
- **Unchanged.** No Consent Mode, no new package or service, the measurement ID is Production-only, and `/admin` and the contact cards are never tracked.
