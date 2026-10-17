import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { getPayload } from 'payload'

import config from '@payload-config'
import { SITE_SETTINGS_TAG } from '@/utilities/revalidate'

async function load() {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'site-settings' })
}

// A failed load must throw through here: unstable_cache stores whatever the
// callback resolves, so returning null from inside would pin "no links" until the
// next Site Settings save. The hourly revalidate is only a safety net.
const cachedLoad = unstable_cache(load, ['site-settings'], {
  tags: [SITE_SETTINGS_TAG],
  revalidate: 3600,
})

/** Site Settings for the chrome and /about; null when the read fails so no page goes down. */
export const getSiteSettings = cache(async () => {
  try {
    return await cachedLoad()
  } catch (err) {
    console.error('Site Settings read failed; rendering without social links', err)
    return null
  }
})
