import type { SiteSetting } from '@/payload-types'

type Settings = Pick<SiteSetting, 'socialLinks' | 'founderLinkedIn'> | null | undefined

const clean = (url: string | null | undefined): string | undefined => url?.trim() || undefined

export function companyLinkedIn(settings: Settings): string | undefined {
  for (const link of settings?.socialLinks ?? []) {
    if (link.platform !== 'linkedin') continue
    const url = clean(link.url)
    if (url) return url
  }
  return undefined
}

export function companySameAs(settings: Settings): string[] {
  const urls = (settings?.socialLinks ?? []).map((link) => clean(link.url))
  return [...new Set(urls.filter((url): url is string => Boolean(url)))]
}

export function founderLinkedIn(settings: Settings): string | undefined {
  return clean(settings?.founderLinkedIn)
}
