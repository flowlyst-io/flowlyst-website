# Runbook — Zoho Bigin for lead push

**Audience:** Tural (this touches an external account and Vercel env — agent-prepared, human-run).
**What it enables:** a verified demo, contact or speaking request becomes a contact, an organization and a new deal in Bigin (issue #116, [ADR 0004](../adr/0004-zoho-bigin-crm.md)). Until the three credentials are set the push is off: submissions still persist, the team email still goes out, and /admin shows "Skipped: Bigin off". Nothing breaks.

## What happens on a submit

1. The lead is saved. 2. If reCAPTCHA passed, the contact and organization are looked up (an existing one is linked, never changed) or inserted, and a **new deal** is created in the stage "Form Submitted". 3. /admin shows the result in the **Bigin** column: Not sent, In Bigin, Failed, Skipped: unverified, Skipped: Bigin off. A failed push is retried by the daily 06:00 UTC cron up to three more times, then stays "Failed" for the sales development representative to add by hand.

## Steps

### 1. Create the Zoho client (Self Client)

1. Sign in at <https://api-console.zoho.com> with the Zoho account that owns Bigin.
2. **Add Client → Self Client → Create.** Copy the **Client ID** and **Client Secret** (`BIGIN_CLIENT_ID`, `BIGIN_CLIENT_SECRET`).
3. **Generate Code** tab: scope `ZohoBigin.modules.contacts.ALL,ZohoBigin.modules.accounts.ALL,ZohoBigin.modules.pipelines.ALL`, time duration 10 minutes, description `flowlyst website`. Click **Create** and copy the grant code. It is valid for the time you chose.

### 2. Exchange the grant code for a refresh token

Use the accounts domain of your data center (table below; US is `accounts.zoho.com`). Run once, within the grant code's lifetime:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "code=<GRANT_CODE>"
```

The answer contains `refresh_token`. That is `BIGIN_REFRESH_TOKEN`; it does not expire until revoked. Keep it out of chat, the repo and screenshots.

| Your Bigin address ends in | `BIGIN_ACCOUNTS_URL`            | `BIGIN_API_DOMAIN`            |
| -------------------------- | ------------------------------- | ----------------------------- |
| `.com` (US)                | `https://accounts.zoho.com`     | `https://www.zohoapis.com`    |
| `.eu`                      | `https://accounts.zoho.eu`      | `https://www.zohoapis.eu`     |
| `.in`                      | `https://accounts.zoho.in`      | `https://www.zohoapis.in`     |
| `.com.au`                  | `https://accounts.zoho.com.au`  | `https://www.zohoapis.com.au` |
| `.jp`                      | `https://accounts.zoho.jp`      | `https://www.zohoapis.jp`     |
| `.ca`                      | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca`     |
| `.sa`                      | `https://accounts.zoho.sa`      | `https://www.zohoapis.sa`     |
| `.com.cn`                  | `https://accounts.zoho.com.cn`  | `https://www.zohoapis.com.cn` |

The data center was not confirmed from here; check the address you log in to Bigin with. For the US the defaults work and `BIGIN_ACCOUNTS_URL` / `BIGIN_API_DOMAIN` can stay unset (the API domain then comes from the token answer).

### 3. Set the Vercel environment variables

Project → **Settings → Environment Variables** (Production, and Preview if staging should push). All are server-side; none may start with `NEXT_PUBLIC_`.

| Variable                        | Placeholder / default                    | Required    | Purpose                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BIGIN_CLIENT_ID`               | `<client id>`                            | **Yes**     | Zoho client id (step 1). With the next two, turns the push on.                                                                                                            |
| `BIGIN_CLIENT_SECRET`           | `<client secret>`                        | **Yes**     | Zoho client secret (step 1). Secret.                                                                                                                                      |
| `BIGIN_REFRESH_TOKEN`           | `<refresh token>`                        | **Yes**     | Refresh token (step 2). Secret.                                                                                                                                           |
| `BIGIN_ACCOUNTS_URL`            | default `https://accounts.zoho.com`      | Non-US only | Zoho accounts domain of your data center.                                                                                                                                 |
| `BIGIN_API_DOMAIN`              | e.g. `https://www.zohoapis.com`          | No          | Bigin API domain; unset = taken from the token answer.                                                                                                                    |
| `BIGIN_PIPELINE_NAME`           | default `Sales Pipeline`                 | No          | Pipeline (layout) name for new deals.                                                                                                                                     |
| `BIGIN_PIPELINE_ID`             | e.g. `7598387000000091023`               | Recommended | Pipeline id, sent with the name. The id of the Sales Pipeline layout was read from the account.                                                                           |
| `BIGIN_STAGE`                   | default `Form Submitted`                 | No          | Stage of every new deal.                                                                                                                                                  |
| `BIGIN_SUB_PIPELINE_DEMO`       | default `sales`                          | No          | Sub-pipeline for demo requests.                                                                                                                                           |
| `BIGIN_SUB_PIPELINE_CONTACT`    | default `sales`                          | No          | Sub-pipeline for contact messages.                                                                                                                                        |
| `BIGIN_SUB_PIPELINE_SPEAKING`   | default `Keynotes`                       | No          | Sub-pipeline for speaking requests.                                                                                                                                       |
| `BIGIN_LEAD_SOURCE_FIELD`       | e.g. `Lead_Source` (API name)            | No          | Deal field that receives the lead source; unset = the field is not sent.                                                                                                  |
| `BIGIN_LEAD_SOURCE_DEMO`        | default `Website – Demo`                 | No          | Lead Source value for demo requests.                                                                                                                                      |
| `BIGIN_LEAD_SOURCE_CONTACT`     | default `Website – Contact`              | No          | Lead Source value for contact messages.                                                                                                                                   |
| `BIGIN_LEAD_SOURCE_SPEAKING`    | default `Website – Speaking`             | No          | Lead Source value for speaking requests.                                                                                                                                  |
| `BIGIN_PRODUCT_INTEREST_FIELD`  | e.g. `Product_Interest` (API name)       | No          | Deal field that receives the interests (sent as a list, so it must be a multi-select); unset = not sent.                                                                  |
| `BIGIN_PRODUCT_INTEREST_VALUES` | JSON, e.g. `{"consulting":"Automation"}` | No          | Overrides the picklist text per key. Defaults: `ai-training` → `AI Training`, `budget-software` → `Budget Software`, `consulting` → `Consulting`, `keynotes` → `Keynote`. |
| `BIGIN_CLOSING_DAYS`            | default `30`                             | No          | Closing date of a new deal = submission date plus this many days.                                                                                                         |

`RECAPTCHA_SITEVERIFY_URL` is for local testing only and is ignored in production. Do not set it on Vercel.

### 4. Turn it on, confirm, turn it off

- **On:** set the three credentials, then **redeploy** (env changes apply on the next deploy).
- **Confirm:** on staging, from a private window (a signed-in admin skips reCAPTCHA and the push), submit a demo request with a test district. Open **/admin → Demo Requests**: the **Bigin** column should read "In Bigin" and the row sidebar shows the deal id. Find the deal in Bigin under the sub-pipeline you set. If it reads "Failed", the row's **Bigin last error** says why.
- **Off:** remove any one of the three credentials and redeploy. New leads show "Skipped: Bigin off".

## For the sales development representative (Bigin side)

- The stage **Form Submitted** must exist in each sub-pipeline the website uses (`sales`, `Keynotes`, or whatever the variables name). When this was prepared it was mapped only to `ASBO ACE26 leads`, so deals for the others show "Failed" until it is added, or `BIGIN_STAGE` / `BIGIN_SUB_PIPELINE_*` point to something that exists.
- If you want Lead Source and Product Interest on deals: create the deal fields, send their **API names** and picklist values, and they go into `BIGIN_LEAD_SOURCE_FIELD`, `BIGIN_PRODUCT_INTEREST_FIELD` and the value variables above. Product Interest must be a **multi-select**, or Bigin rejects the deal.
- Existing contacts and organizations are only linked, never edited. Every request makes a new deal, with the full request in its Description.
- The website sends the workflow trigger, so your Bigin automation on new deals runs.
