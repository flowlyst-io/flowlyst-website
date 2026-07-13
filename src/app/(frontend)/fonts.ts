import { Nunito } from 'next/font/google'

/**
 * Nunito — the single brand typeface (design/tokens/colors_and_type.css).
 *
 * Loaded via next/font so the fonts are self-hosted and preloaded: no
 * fonts.googleapis.com request in the rendered HTML and no layout shift
 * (next/font emits `size-adjust` fallback metrics). The Google Fonts @import
 * that shipped in the design CSS is intentionally dropped.
 *
 * Weights + italics cover the display treatment in site.css, which mixes 300
 * (airy) with 800 italic (charged). Exposed as the `--font-nunito` CSS variable,
 * which `--font-sans` / `--font-display` reference in styles.css.
 */
export const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-nunito',
})
