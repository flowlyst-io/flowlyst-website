import React from 'react'
import Image from 'next/image'

import type { Card, Media, SiteSetting } from '@/payload-types'
import { FLOWLYST_MARK_PATH, FLOWLYST_MARK_VIEWBOX } from '@/utilities/flowlystMarkShared'
import { mediaSrc } from '@/utilities/mediaSrc'
import { cardSocials, type CardSocialPlatform } from '@/utilities/cardSocials'

type Props = {
  card: Card
  settings: Pick<SiteSetting, 'socialLinks'> | null | undefined
}

const ICON_PROPS = {
  'aria-hidden': true,
  focusable: false,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const LINKEDIN_ICON = (
  <>
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <path d="M7 10v7M7 7v.01M11 17v-4a3 3 0 0 1 6 0v4M11 10v7" />
  </>
)

const SOCIAL_ICONS: Record<CardSocialPlatform, React.ReactNode> = {
  twitter: <path d="M4 4l16 16M20 4L4 20" />,
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5v.01" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  linkedin: LINKEDIN_ICON,
}

function WhiteMark({ className }: { className: string }) {
  return (
    <svg className={className} viewBox={FLOWLYST_MARK_VIEWBOX} aria-hidden="true" focusable="false">
      <path d={FLOWLYST_MARK_PATH} />
    </svg>
  )
}

export function ContactCard({ card, settings }: Props) {
  const headshot =
    card.headshot && typeof card.headshot === 'object' ? (card.headshot as Media) : null
  const phoneHref = card.phone ? `tel:${card.phone.replace(/[^\d+]/g, '')}` : null
  const tiles = [
    {
      key: 'call',
      label: 'Call',
      href: phoneHref,
      icon: (
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
      ),
    },
    {
      key: 'email',
      label: 'Email',
      href: card.email ? `mailto:${card.email}` : null,
      icon: (
        <>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 6-10 7L2 6" />
        </>
      ),
    },
    { key: 'linkedin', label: 'LinkedIn', href: card.linkedIn || null, icon: LINKEDIN_ICON },
    {
      key: 'website',
      label: 'Website',
      href: card.website || null,
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </>
      ),
    },
  ].filter((tile): tile is typeof tile & { href: string } => Boolean(tile.href))
  const socials = cardSocials(settings)

  return (
    <div className="contact-card">
      <header className="card__panel">
        <WhiteMark className="card__watermark" />
        <div className="card__brand">
          <WhiteMark className="card__brand-mark" />
          <span className="card__brand-name">flowlyst</span>
        </div>
      </header>
      <div className="card__diamond">
        <div className="card__diamond-box">
          {headshot?.url ? (
            <Image
              className="card__headshot"
              src={mediaSrc(headshot.url)}
              alt={headshot.alt}
              width={176}
              height={176}
              priority
            />
          ) : null}
        </div>
      </div>
      <main className="card__body">
        <div className="card__id">
          <h1 className="card__name">{card.name}</h1>
          {card.title ? <div className="card__title">{card.title}</div> : null}
        </div>
        <a className="card__add" href={`/card/${card.slug}/vcard`}>
          <svg {...ICON_PROPS} width="16" height="16">
            <circle cx="9" cy="8" r="4" />
            <path d="M2 21c0-4 3-7 7-7s7 3 7 7" />
            <path d="M19 8v6M16 11h6" />
          </svg>
          Add to contacts
        </a>
        {tiles.length > 0 ? (
          <div className="card__tiles">
            {tiles.map((tile) => (
              <a key={tile.key} className="card__tile" href={tile.href}>
                <svg {...ICON_PROPS} width="20" height="20">
                  {tile.icon}
                </svg>
                {tile.label}
              </a>
            ))}
          </div>
        ) : null}
        {socials.length > 0 ? (
          <div className="card__follow">
            <div className="card__follow-label">follow flowlyst</div>
            <div className="card__socials">
              {socials.map((social) => (
                <a
                  key={social.platform}
                  className="card__social"
                  href={social.url}
                  aria-label={social.label}
                >
                  <svg {...ICON_PROPS} width="18" height="18">
                    {SOCIAL_ICONS[social.platform]}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        <div className="card__tagline">
          Budgeting software, AI training and automation for{' '}
          <span className="card__nowrap">K-12</span> districts
        </div>
      </main>
    </div>
  )
}
