# Design

**The design lives in Claude Design, not in this repo.** Two projects:

| Source project | Project id | What it holds |
|---|---|---|
| **flowlyst Website** | `019def0e-4193-726b-88e0-6ce28b50ecab` | The site design: hi-fi page designs for the full PRD page inventory (`flowlyst-homepage-hifi.html`, `about.html`, `budget-software.html`, `ai-training.html`, `consulting.html`, `keynotes.html`, `blog.html`, `blog-post.html`, `contact.html`, `request-demo.html`, `testimonials.html`, `case-studies.html`, legal pages, `sitemap.html`, wireframes), the production stylesheet `site.css` ("Direction C, productionized"), `tokens.css`, and per-page screenshots. **The reference every page implementation is checked against.** |
| **Flowlyst Design System** | `019dea41-96e4-76c4-92d5-79a546ca7794` | The brand system: `colors_and_type.css` tokens, component previews (buttons, cards, badges, inputs, type, spacing, shadows, voice), brand SVG assets, and the `ui_kits/marketing/` component kit. **The only sanctioned source of color, type, and spacing.** |

The two are complementary: the design system says *what the brand looks like* (the sanctioned atoms); the website project says *what each page should look like* (the composed pages). A page implementation must use the design-system tokens **and** match its hi-fi page design.

## How agents use it

- **DesignSync — the tool that reads Claude Design projects — works in the lead session only; subagents cannot call it.** When a work item needs a design (e.g. building `/about`), the lead session pulls that item's file(s) via DesignSync `get_file` into `design/` first, commits them as the record of what was built against, then delegates.
- Pulled copies are reference snapshots: never hand-edit them; re-pull from the source project when the design changes upstream.
- **Never invent a color, font size, or spacing value.** If a needed value isn't in the design system, that's a gap to raise, not a value to improvise.
- The home page has exploration variants (`HomeA/B/C.jsx`) alongside the settled **`flowlyst-homepage-hifi.html`** — treat the hi-fi file as the working direction unless Tural says otherwise.
- **No public pricing anywhere on the site** (PRD §12) — the design system's `Pricing.jsx` is reference-only.
