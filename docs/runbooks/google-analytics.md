# Runbook: turn on Google Analytics

**Audience:** Tural (this touches Google Analytics and the Vercel dashboard, so it is agent-prepared and human-run).
**What it enables:** visit and lead-form data in Google Analytics 4 from the code already in the site. Until you do this, nothing loads and the site works as before.

## Steps

1. The GA4 property already exists: account `Flowlyst` (359985101), property `flowlyst.io` (495083007). Its web stream's **Measurement ID** is `G-0Z0J8DQZND` (Aziz, 2026-10-27). It is public by design, since every visitor's browser receives it.
2. In GA, open **Admin**, then **Data streams**, then the `flowlyst.io` web stream. Confirm the ID matches and **Enhanced measurement** is on, because it records page views when visitors move between pages.
3. In Vercel, open `flowlyst-website`, then **Settings**, then **Environment Variables**. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-0Z0J8DQZND`, and tick only **Production**.
4. Redeploy Production. The value is read at build time, so a redeploy is required.
5. Check: open the site in a private window, click **Accept**, and look for yourself in GA **Realtime**. In another private window click **Decline**; you should not appear.

## Good to know

- In **Admin**, then **Events**, mark `generate_lead` as a key event to see lead counts.
- Leave Google signals and Ads links off. The privacy policy says the site uses no advertising trackers.
- Nothing loads until the variable is set and a redeploy has run. Previews and staging send nothing.
