# 0004. Zoho Bigin CRM (lead push)

- **Status**: Accepted
- **Date**: 2026-10-20

## Context

Issue #116 asks that a verified demo, contact or speaking request lands in Bigin, where the sales development representative works the lead. Tural approved it on 2026-10-20 ("i approve integration with bigin"), and confirmed that unverified leads stay out of Bigin and that every request gets a new deal ("sure"). Bigin is a third-party service, so it passes the technology gate with his word.

## Decision

After a lead is saved, the lead collection's `afterChange` hook pushes it to Bigin with plain `fetch` against the Bigin REST API. No package is added.

- **Verified leads only.** The push runs for an anonymous form submission whose reCAPTCHA outcome is `pass`. `skipped`, `missing`, `error`, Local API and admin creates are never pushed.
- **The lead is saved first.** For the forms' path the hook commits the transaction before any network call (see `docs/conventions.md`), so no Bigin or email problem can lose a lead.
- **Never overwrite.** The contact is looked up by email and the account by name. A match is linked as it is; only a new person or organization is inserted. A form can never rewrite an existing CRM record. The deal is always a new insert, named `<District/Org> / <Person>`, in the stage "Form Submitted", with the full request in its Description.
- **Mapping is configuration.** Sub-pipeline per form, stage, pipeline, Lead Source and Product Interest field API names and their values come from `BIGIN_*` environment variables (runbook `docs/runbooks/bigin-setup.md`), not code.
- **Off until credentials are set.** Without the three credentials the push is skipped and the row says "Skipped: Bigin off".
- **Failure is flagged, retried, never lost.** The row records "Failed" with the error, and a `biginRetry` job runs from the daily cron, up to four attempts in total.
- Auth is a Zoho Self Client refresh token exchanged for an access token that is cached for 55 minutes.

## Consequences

- The sales development representative owns the Bigin side. Today Bigin maps the stage "Form Submitted" only to the sub-pipeline `ASBO ACE26 leads`, so deals for `sales` and `Keynotes` fail ("Failed" in /admin) until she adds that stage or the environment points elsewhere.
- Lead Source and Product Interest are left off the deal until their field API names are set.
- Bigin becomes a processor of the names, emails and organizations of K-12 staff who asked to be contacted; whether the privacy policy needs a line for it is a content call, not made here. A repeat submitter's new phone or title is not written to an existing contact; it is in the deal Description.
- The OAuth refresh token is a secret in Vercel and is Tural's to create. Agents never hold it.
- A deal create that times out on our side but succeeded in Bigin can be duplicated by the retry. Accepted: rare.
- The email to the team stays as it was, as a backup ("let's keep the email just in case").

## Alternatives considered

| Option                                     | Buys                                                                  | Costs                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Direct API from the lead hook (chosen)     | No new vendor or package, full control of the mapping and the retries | We own the OAuth handling and the failure flag                                  |
| Direct API in a custom form-handler route  | Same                                                                  | Changes every form's POST target and its tests; the hook already sees each lead |
| Zoho Forms or a Bigin web form webhook     | No code                                                               | Replaces our forms and their validation, reCAPTCHA gate and lead record         |
| n8n or another automation service in front | Visual mapping, retries                                               | A new vendor and a place for lead data to live outside our database             |
