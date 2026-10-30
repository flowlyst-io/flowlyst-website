import type { SiteSetting } from '@/payload-types'

type Settings = Pick<SiteSetting, 'socialLinks'> | null | undefined

export type CardSocialPlatform = 'twitter' | 'instagram' | 'facebook' | 'linkedin'

export type CardSocial = { platform: CardSocialPlatform; label: string; url: string }

// Fixed display order; Site Settings order and other platforms (youtube) do not matter here.
const ORDER: { platform: CardSocialPlatform; label: string }[] = [
  { platform: 'twitter', label: 'flowlyst on X' },
  { platform: 'instagram', label: 'flowlyst on Instagram' },
  { platform: 'facebook', label: 'flowlyst on Facebook' },
  { platform: 'linkedin', label: 'flowlyst on LinkedIn' },
]

export function cardSocials(settings: Settings): CardSocial[] {
  const links = settings?.socialLinks ?? []
  const out: CardSocial[] = []
  for (const { platform, label } of ORDER) {
    const url = links.find((link) => link.platform === platform && link.url?.trim())?.url?.trim()
    if (url) out.push({ platform, label, url })
  }
  return out
}
