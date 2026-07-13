import React from 'react'

/**
 * flowlyst brand mark (design/assets/flowlyst-logo.svg).
 *
 * Rendered inline as SVG with `fill="currentColor"` so it inherits the
 * surrounding text color — ink on the light nav, white in the forest footer —
 * without needing a separate white asset or a brightness/invert filter.
 *
 * The vector is non-square (viewBox 227.46 x 157.46). We size by height and let
 * width follow the intrinsic ratio to avoid distortion; the design's 26/24px
 * values are heights. The mark is decorative (the adjacent "flowlyst" wordmark
 * carries the accessible name), so it is aria-hidden.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 227.46 157.46"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      style={{ height: size, width: 'auto', display: 'block' }}
    >
      <path d="m165.82,7.06l54.58,54.58c4.7,4.7,7.06,10.9,7.06,17.1s-2.36,12.37-7.06,17.07l-54.58,54.59c-4.71,4.7-10.9,7.06-17.1,7.06s-12.37-2.36-17.07-7.06l-6.49-6.49,1.78-2.31c13.18-17.17,19.38-35.37,20.71-52.89.68-8.89.11-17.6-1.44-25.92l3.76-.85c3.59-1.01,6.05-6.85,2.78-9.88l-9.95-10.61-10.16-10.84c-2.67-2.6-9-1.78-10,2.55l-4.29,13.85-4.39,14.15c-.92,3.6,2.96,8.63,7.22,7.32l4.57-1.03c1.28,5.15,2.1,10.5,2.22,16.12.14,5.8-.44,11.85-1.96,18.21-1.51,6.31-3.95,12.99-7.52,20.11-6.02,11.97-11.05,16.94-19.21,25l-3.52,3.51c-4.71,4.7-10.9,7.06-17.1,7.06s-12.39-2.36-17.09-7.06L6.98,95.82c-4.23-4.22-6.56-9.66-6.98-15.22v-3.74c.42-5.55,2.75-10.99,6.99-15.22L61.56,7.06c4.71-4.7,10.9-7.06,17.09-7.06s12.4,2.36,17.1,7.06l5.73,5.73-2.1,2.36c-15.93,17.78-23.77,36.98-26.02,55.57-1.08,8.91-.87,17.69.37,26.11l-4.4,1c-3.6,1.01-6.05,6.85-2.77,9.87l9.94,10.61,10.16,10.85c2.67,2.59,9,1.77,10-2.55l4.3-13.86,4.39-14.15c.92-3.59-2.95-8.63-7.23-7.32l-4.14.94c-.66-3.36-1.11-6.8-1.27-10.33-.32-6.43.25-13.2,2-20.41,1.74-7.15,4.66-14.74,9.03-22.84,5.8-10.75,11.92-16.46,19.68-23.69,2.46-2.3,5.11-4.77,8.23-7.89,4.71-4.7,10.9-7.06,17.09-7.06s12.4,2.36,17.1,7.06" />
    </svg>
  )
}
