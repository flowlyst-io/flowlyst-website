import React from 'react'
import Image from 'next/image'

import type { Media } from '@/payload-types'

/**
 * Blog presentational atoms, ported from the design (`design/site/home.jsx`
 * BlogTileArt + FounderAvatar). Server components — pure/decorative SVG, no client
 * JS. Inline styles reference brand tokens only (var(--c-sage), var(--fl-green),
 * var(--c-cream)); no invented colours.
 *
 * These render TODAY, while the collection has no featured images: the geometric
 * tiles stand in for post artwork until real imagery arrives with the content seed
 * (#20). `PostThumb` / `AuthorAvatar` swap in the uploaded Media the moment a post
 * carries one.
 */

// Geometric placeholder tile — distinct per index, light-theme-friendly. `fill`
// stretches the SVG to its wrapper (used inside the design's aspect-ratio boxes);
// the default fixed 160px height matches the design's grid/related cards.
export function BlogTileArt({ index = 0, fill = false }: { index?: number; fill?: boolean }) {
  const height: number | string = fill ? '100%' : 160
  const variants = [
    // Sage bars
    <svg
      key="a"
      viewBox="0 0 400 160"
      aria-hidden="true"
      style={{ width: '100%', height, display: 'block', background: 'var(--c-sage)' }}
    >
      <rect x="20" y="60" width="40" height="80" fill="rgba(0,165,104,0.35)" />
      <rect x="80" y="40" width="40" height="100" fill="rgba(0,165,104,0.55)" />
      <rect x="140" y="20" width="40" height="120" fill="var(--fl-green)" />
      <rect x="200" y="50" width="40" height="90" fill="rgba(0,165,104,0.45)" />
      <rect x="260" y="70" width="40" height="70" fill="rgba(0,165,104,0.3)" />
      <rect x="320" y="30" width="40" height="110" fill="rgba(0,165,104,0.5)" />
    </svg>,
    // Green curve
    <svg
      key="b"
      viewBox="0 0 400 160"
      aria-hidden="true"
      style={{ width: '100%', height, display: 'block', background: 'var(--fl-green)' }}
    >
      <path
        d="M 20 130 Q 100 130 140 90 T 280 60 T 380 30"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 20 130 Q 100 130 140 90 T 280 60 T 380 30 L 380 160 L 20 160 Z"
        fill="rgba(255,255,255,0.15)"
      />
      <circle cx="280" cy="60" r="6" fill="#fff" />
      <circle cx="380" cy="30" r="6" fill="#FFE9A0" />
    </svg>,
    // Cream dot grid
    <svg
      key="c"
      viewBox="0 0 400 160"
      aria-hidden="true"
      style={{ width: '100%', height, display: 'block', background: 'var(--c-cream)' }}
    >
      {Array(8)
        .fill(0)
        .map((_, x) =>
          Array(4)
            .fill(0)
            .map((_, y) => (
              <circle
                key={`${x}-${y}`}
                cx={30 + x * 48}
                cy={30 + y * 35}
                r={x === 5 && y === 1 ? 12 : 5}
                fill={x === 5 && y === 1 ? 'var(--fl-green)' : 'rgba(14,20,16,0.35)'}
              />
            )),
        )}
    </svg>,
  ]
  return variants[index % variants.length]
}

/**
 * A post thumbnail: the uploaded featured image when present, else the geometric
 * placeholder. `fill` (aspect-ratio boxes) stretches to the wrapper; without it the
 * image takes the placeholder's fixed 160px card height. `priority` marks the LCP
 * image (a post's hero) so it is eagerly fetched rather than lazy-loaded.
 */
export function PostThumb({
  image,
  index,
  fill = false,
  priority = false,
  sizes,
}: {
  image?: Media | null
  index: number
  fill?: boolean
  priority?: boolean
  sizes?: string
}) {
  if (image?.url) {
    // next/image optimizes the uploaded featured image (AVIF/WebP + a right-sized
    // srcset) and, with `priority`, preloads it — so the article hero paints as a
    // lightweight LCP element (#69). Sources are configured in next.config: local
    // Payload media (`/api/media/file/**`, localPatterns) and production Vercel Blob
    // (`*.public.blob.vercel-storage.com`, remotePatterns). `fill` makes the image
    // absolutely fill this relative box, so it occupies the wrapper's reserved
    // aspect-ratio (or fixed-160) space exactly — no CLS. `sizes` defaults to the
    // grid-card responsive steps (1 col ≤680, 2 col ≤960, else ~360px); the hero
    // call sites pass their own to match the reading column.
    return (
      <div style={{ position: 'relative', width: '100%', height: fill ? '100%' : 160 }}>
        <Image
          src={image.url}
          alt={image.alt ?? ''}
          fill
          sizes={sizes ?? '(max-width: 680px) 100vw, (max-width: 960px) 50vw, 360px'}
          priority={priority}
          style={{ objectFit: 'cover' }}
        />
      </div>
    )
  }
  return <BlogTileArt index={index} fill={fill} />
}

/**
 * Round author avatar: the uploaded photo when present, else the design's gradient
 * silhouette placeholder (FounderAvatar). Used at 48px in the byline and 88px in the
 * bio block.
 */
export function AuthorAvatar({ size = 64, photo }: { size?: number; photo?: Media | null }) {
  if (photo?.url) {
    // Plain <img> for the same reason as PostThumb (runtime-variable media origin).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo.url}
        alt={photo.alt ?? ''}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: 'cover',
          display: 'block',
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: 'linear-gradient(135deg, #3a4a40, #1a2520)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <circle cx="32" cy="26" r="11" fill="rgba(255,210,170,0.4)" />
        <path d="M 10 64 Q 10 44 32 42 Q 54 44 54 64 Z" fill="rgba(20,30,25,0.7)" />
      </svg>
    </div>
  )
}
