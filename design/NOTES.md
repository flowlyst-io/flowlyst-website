# Design reference snapshots — provenance

Pulled via DesignSync by the lead session on 2026-07-13, for issues #3 (design foundation) and #6 (homepage).

| Local path | Source project | Source path |
|---|---|---|
| tokens/colors_and_type.css | Flowlyst Design System (019dea41-96e4-76c4-92d5-79a546ca7794) | colors_and_type.css |
| site/tokens.css | flowlyst Website (019def0e-4193-726b-88e0-6ce28b50ecab) | tokens.css — byte-identical to colors_and_type.css; single token contract, no divergence |
| site/site.css | flowlyst Website | site.css — "Direction C, productionized"; the production stylesheet every page composes with |
| site/site.jsx | flowlyst Website | site.jsx — settled shared chrome: Nav, Footer, FinalCTA, PageHero, SectionHead, Marquee |
| site/shell.jsx | flowlyst Website | shell.jsx — wireframe-stage shared shell; IA reference only (nav items, footer column structure) |
| assets/flowlyst-logo.svg | Flowlyst Design System | assets/flowlyst-logo.svg — the brand mark as vector; white variant = same path, white fill (design uses a CSS invert filter on the PNG mark for dark surfaces) |
| site/home.jsx | flowlyst Website | home.jsx — the settled homepage composition (Direction C productionized); `flowlyst-homepage-hifi.html` upstream is only the A/B/C exploration canvas, NOT the settled page — `index.html` + `home.jsx` + `site.jsx` + `site.css` is the real reference (pulled 2026-07-13 for #6) |
| site/index.html | flowlyst Website | index.html — thin render harness for home.jsx (CDN React + Babel); open locally to render the reference for pixel comparison |
| site/pages.jsx | flowlyst Website | pages.jsx — settled Direction C compositions for About, Blog index/post, Testimonials, Case studies, Request demo, Contact, Legal; the standalone `about.html` etc. upstream are earlier exploration, this is the reference (pulled 2026-07-13 for #7) |
| site/about-preview.html | — (local glue, not an upstream snapshot) | thin render harness for AboutPage, modeled on index.html; loads site.jsx + home.jsx + pages.jsx |

Findings recorded at pull time:
- **Light theme only.** The token contract defines no dark-mode tokens, and site.css declares "Surface strategy: LIGHT-FIRST" (dark exists only as the forest footer + one manifesto band). UI verification checks light theme at both viewports; a site-wide dark mode does not exist by design.
- **Binary assets** (flowlyst-mark.png, favicon.ico) can't be reliably transferred through the sync channel; the vector logo above covers mark + favicon (SVG favicon) needs. If a raster mark is ever required, re-export from the design project.
- Never hand-edit these snapshots; re-pull from the source project when the design changes upstream (design/README.md).
