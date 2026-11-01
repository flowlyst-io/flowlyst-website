import React from 'react'
import { FLOWLYST_MARK_PATH, FLOWLYST_MARK_VIEWBOX } from '@/utilities/flowlystMarkShared'

/**
 * flowlyst brand mark (design/assets/flowlyst-logo.svg).
 *
 * Rendered inline as SVG with `fill="currentColor"`, so its color is driven by
 * the CSS `color` property: pass `color` to override (brand green on the light
 * nav), or leave it unset to inherit — white in the forest footer — without a
 * separate white asset or a brightness/invert filter.
 *
 * The vector is non-square (viewBox 227.46 x 157.46). We size by height and let
 * width follow the intrinsic ratio to avoid distortion; the design's 26/24px
 * values are heights. The mark is decorative (the adjacent "flowlyst" wordmark
 * carries the accessible name), so it is aria-hidden.
 */
export function Mark({ size = 26, color }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox={FLOWLYST_MARK_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      style={{ height: size, width: 'auto', display: 'block', color }}
    >
      <path d={FLOWLYST_MARK_PATH} />
    </svg>
  )
}
