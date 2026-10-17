# Runbook — enable Vercel Speed Insights

**Audience:** Tural (this touches the Vercel dashboard — agent-prepared, human-run).
**What it enables:** real-user performance data (Real Experience Score) from the `<SpeedInsights />` component already in the site. Until you do this, the site works as before and no data arrives.

## Steps

1. In the Vercel dashboard, open the `flowlyst-website` project.
2. Go to the **Speed Insights** tab and click **Enable**. Use the free tier; do not choose Plus.
3. Data starts arriving after the next production deployment (the merge of the PR that added the component triggers one), and only from real visits.

## Good to know

- The free tier shows the overall Real Experience Score and stops collecting, without billing, after 10,000 events in a rolling 30 days.
- No cookies are set, so the cookie banner stays as it is.
