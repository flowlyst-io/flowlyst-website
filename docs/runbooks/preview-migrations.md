# Runbook: add the new tables to the PR preview database (#146)

**Audience:** Tural (this touches Neon and Vercel, so it is agent-prepared and human-run).
**Why:** preview builds never run migrations. The Links and Contact cards pages need two new tables (`links`, `cards`), so on the preview they exist only after you do step 2. Production needs nothing: the merge's production build applies the additive migration itself.

## Steps

1. In the Neon console, open the project and look at **Branches**. Confirm the branch the PR preview uses (documented as `preview/feature/146-qr-links-cards`) exists, and that it is **not** the production branch. If the preview points at production, stop and tell the lead.
2. From a checkout of branch `feature/146-qr-links-cards`, copy the branch's **direct** (unpooled) connection string from the Neon console, then run:

   ```sh
   CI=true DATABASE_URL='<preview branch direct connection string>' pnpm migrate
   ```

   - `CI=true` turns off Payload's dev schema push, so only the committed migration touches the branch, exactly as CI does.
   - Before pressing Enter, check that the host in the string is the preview branch from step 1 and not production.
   - Expect the output to list `links_and_cards` as applied.

3. Redeploy the preview in Vercel. If Neon re-creates or resets the preview branch on a later push, the tables are gone again: repeat step 2.
4. Only if needed: if saves in `/admin` fail on the preview, or the admin talks to `https://flowlyst.io`, set `NEXT_PUBLIC_SERVER_URL` in Vercel, **Settings**, **Environment Variables**, for **Preview, branch `feature/146-qr-links-cards` only**, to that branch's preview URL. Then redeploy.
5. After the merge, remove that variable (if you added it in step 4).

## Good to know

- On a preview, QR codes encode the site's `serverURL`. That is `https://flowlyst.io` unless you did step 4, so a preview code only scans through once merged.
- Never put the connection string in the repo, a PR or an issue.
