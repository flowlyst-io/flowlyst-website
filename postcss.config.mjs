/**
 * PostCSS config for the Next.js frontend.
 *
 * Tailwind v4 utilities/preflight are emitted only into stylesheets that
 * `@import "tailwindcss"` — currently just src/app/(frontend)/styles.css. The
 * Payload admin ((payload) route group) imports its own CSS and does not pull in
 * Tailwind, so the preflight reset never reaches the admin UI.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
