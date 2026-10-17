import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Shared on-demand revalidation for the content collections (issue #1 decision;
 * three near-identical per-collection hooks consolidated here in #67). Payload 3
 * runs in-process with Next, so a publish / edit / unpublish / delete calls Next's
 * `revalidatePath()` directly — no webhook, no token endpoint, no cron — and the
 * change appears (or disappears) without a redeploy.
 *
 * Never-throw, two layers:
 *  - `req.context.disableRevalidate` lets Local-API callers (test seeds/teardown,
 *    the scripted content port) skip revalidation entirely.
 *  - the try/catch swallows the throw `revalidatePath` raises when there is no Next
 *    request scope — scheduled publish (`schedulePublish: true`) and the integration
 *    tests that `payload.create` content both run these hooks outside a request. The
 *    DB write has already committed by afterChange/afterDelete, so a throw here would
 *    500 an otherwise-successful mutation; we log via the collection's payload logger
 *    (when available) and continue.
 *
 * Import style settled empirically (#67): `next/cache` is imported at module top
 * level, not lazily inside the guard. It resolves under the Playwright
 * `--import=tsx/esm` loader that boots the Payload config for the e2e suite —
 * BlogPosts and Testimonials already shipped top-level imports and that suite is
 * green; #65's lazy-in-guard workaround (claimed required under that loader) was not
 * reproducible.
 *
 * Falsy paths are skipped, so callers can pass conditional entries inline
 * (`slug && `/blog/${slug}``) without pre-filtering.
 */
type RevalidateReq = {
  context?: { disableRevalidate?: unknown }
  payload?: { logger?: { warn: (msg: string) => void } }
}

export function revalidatePaths(
  paths: Array<string | false | null | undefined>,
  req?: RevalidateReq,
): void {
  if (req?.context?.disableRevalidate) return
  try {
    for (const path of paths) {
      if (path) revalidatePath(path)
    }
  } catch (err) {
    req?.payload?.logger?.warn(`revalidatePath skipped (no Next request scope): ${String(err)}`)
  }
}

/** Tag on the cached Site Settings read (`getSiteSettings`). Lives here, not beside the loader, to keep the global -> revalidate -> payload config import chain acyclic. */
export const SITE_SETTINGS_TAG = 'site-settings'

/**
 * Site Settings feed the footer, Organization JSON-LD and /about on every page, so a
 * save expires both caches: the tag for the data cache, the root layout for the
 * route cache. `{ expire: 0 }` makes the first visit after a save fresh rather than
 * stale-while-revalidate. Same opt-out and never-throw rules as `revalidatePaths`.
 */
export function revalidateSiteSettings(req?: RevalidateReq): void {
  if (req?.context?.disableRevalidate) return
  try {
    revalidateTag(SITE_SETTINGS_TAG, { expire: 0 })
    revalidatePath('/', 'layout')
  } catch (err) {
    req?.payload?.logger?.warn(
      `Site Settings revalidation skipped (no Next request scope): ${String(err)}`,
    )
  }
}
