# Runbook: turn on Google Analytics

**Audience:** Tural (this touches Google Analytics and the Vercel dashboard, so it is agent-prepared and human-run).
**What it enables:** visit and lead-form data in Google Analytics 4 from the code already in the site. Until you do this, nothing loads and the site works as before.

## Steps

1. Go to analytics.google.com and sign in with the company Google account.
2. Click **Admin**, then **Create**, then **Property**. Name it `flowlyst.io`, pick a US time zone and USD.
3. Fill in the business details.
4. Under **Data collection**, choose **Web**. URL `https://flowlyst.io`, stream name `flowlyst.io`. Leave **Enhanced measurement** on, because it records page views when visitors move between pages.
5. Copy the **Measurement ID**. It looks like `G-XXXXXXXXXX`.
6. In Vercel, open `flowlyst-website`, then **Settings**, then **Environment Variables**. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` with your real ID in place of the placeholder `G-XXXXXXXXXX`, and tick only **Production**.
7. Redeploy Production. The value is read at build time, so a redeploy is required.
8. Check: open the site in a private window, click **Accept**, and look for yourself in GA **Realtime**. In another private window click **Decline**; you should not appear.

## Good to know

- In **Admin**, then **Events**, mark `generate_lead` as a key event to see lead counts.
- Leave Google signals and Ads links off. The privacy policy says the site uses no advertising trackers.
- Nothing loads until the variable is set and a redeploy has run. Previews and staging send nothing.
