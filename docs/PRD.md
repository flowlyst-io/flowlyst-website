# flowlyst Marketing Site — Product Requirements Document

**Version:** v1 (draft)
**Date:** 2026-05-02
**Status:** For review
**Author:** Generated via Scout/Tinker discovery against current `flowlyst.io` and the `flowlyst-landing` monorepo

---

## How to read this document

This is a **non-technical PRD** for rebuilding `flowlyst.io` from scratch in a new repository. It describes:

- What flowlyst is and who it serves
- What the new marketing website must communicate and enable
- A page inventory the designer can react to
- Side-notes on CMS needs and SEO/AI-discoverability that must be honored without being designed here

It does **not** cover: visual design, technical architecture, editorial/content strategy, marketing channels, paid acquisition, or post-launch growth experiments. Those are separate workstreams.

Open questions surfaced during PRD review have been resolved and rolled up in §13 ("Closed" table). No defaults were applied without explicit user input.

---

## 1. Why we're rewriting

The current `flowlyst.io` is a Next.js + React-Admin monorepo deployed on EC2/RDS. It works, but three problems compound:

1. **Operational drag.** EC2/RDS is painful for a small team. The team wants Vercel + Neon Postgres in the rewrite, decided in a separate technical-architecture session.
2. **CMS is hostile to content authors.** The React-Admin admin app has no rich-text editor, no image/media manager, no drafts, no scheduled publishing. Authors paste raw markdown and external image URLs. This bottlenecks any serious content effort.
3. **The site is invisible where it matters.** It's not surfacing in Google search results or AI-assistant recommendations (ChatGPT, Claude, Gemini, Copilot). That's a Phase-2 strategy problem, but the rebuilt site must not block solving it (server-rendered pages, structured data, AI crawler access, etc. — see §10).

The rewrite is a chance to fix all three at the foundation. This PRD scopes only what the new site **is**, not how it's built.

---

## 2. What flowlyst is

flowlyst is a US-focused company serving **K–12 public school districts** with three integrated offerings: budgeting software, AI training, and AI/automation consulting. Its differentiator is operator credibility — the founder and consultants are former school CFOs and admin leaders, not generalist ed-tech vendors.

**One-sentence positioning:**
> *flowlyst gives K–12 district leaders software, training, and consulting built and delivered by the people who used to do their jobs.*

**Anti-positioning** (what flowlyst is *not*):
- Not a bulky ERP module
- Not a generic AI training course
- Not a transactional vendor relationship — flowlyst frames itself as a partner that walks with each district from onboarding through long-term support
- Not industry-agnostic — flowlyst is K–12 first

> **Scope of the new site:** K–12 public school districts are the primary audience. Marketing copy stays K–12-first. The new site does **not** formally exclude adjacent segments where flowlyst already does business or could expand:
> - **Training:** ~10% of AI training clients today are non-K-12 organizations (private businesses, non-profits, etc.). The training page should not preclude these prospects.
> - **Budgeting software:** future expansion to non-school government entities doing public budgeting is plausible. The budget software page should not call out "schools-only" in a way that boxes out a future government pivot.
> - All other content (homepage, about, consulting, blog) remains K–12-led.

---

## 3. Audience

### 3.1 Primary — School Business Officials (SBOs)

The single most important persona. Goes by many titles in different states/districts:
- **CFO** (Chief Financial Officer)
- **Business Administrator** / **School Business Administrator**
- **School Business Official** (national term used by ASBO International)
- **Treasurer**, **Director of Finance / Business Services**
- Senior accountants reporting to the above

Their world: building and tracking the district budget, monthly/quarterly reporting to the school board, interacting with state finance agencies, managing payroll/HR finance, and now being asked to figure out AI without dedicated headcount.

What they care about:
- Replacing spreadsheet-driven budget cycles
- Producing board-ready reports without 3-day turnarounds
- Avoiding the cost and lock-in of bulky ERP modules
- Looking competent on AI to their superintendent and board

### 3.2 Secondary — Superintendent and District Leadership

Superintendents, assistant superintendents, technology directors, HR directors, curriculum directors, principals. They attend flowlyst's AI training events. They are not the buyer for the budget software, but they are buyers for training and consulting, and they influence the SBO's vendor choices.

What they care about:
- Modernizing district operations broadly
- Demonstrating AI literacy to their boards and communities
- Helping their teams save time on administrative work
- Avoiding embarrassing AI policy missteps

### 3.3 Tertiary — Department admins and teachers

Touch the budget software (department-level entry) or attend training. Not buyers; do influence renewal/satisfaction.

### 3.4 Adjacent — non-K-12 training clients

About 10% of AI training clients are non-K-12 organizations (private businesses, non-profits, anyone wanting AI training for their staff). They should not lead messaging — flowlyst is K-12-first — but the AI training page must not actively exclude them. Practical implication for copy: avoid "schools-only" framing on the training page; broader phrasing like "designed for K-12 leaders, adaptable to other organizations" leaves the door open.

### 3.5 Audience implications for the site

- **Hero must speak to both SBOs and superintendents** — the current site already does this ("superintendents, business managers, and staff").
- **Each solution page should call out role-specific value** so a tech director or teacher can see themselves in the offering.
- **Founder's CFO background is a primary trust lever** for SBOs and should be visible above the fold or one click away.
- **Industry vocabulary must be authentic** — "school business officials," "PD days," "ASBO," "K–12," "district," not "education sector" or "educational institutions."

---

## 4. Offerings

The site communicates four core offerings. The order in which they're presented below does not imply visual hierarchy on the site itself — that's a design/positioning decision.

### 4.1 Budgeting Software (product)

A web-based budgeting platform for K–12 districts. **flowlyst is supplementary to the district's existing ERP — it does not replace it.** flowlyst fills the gaps that ERP modules leave open: collaborative budget entry, faster reporting, intuitive workflows that don't require ERP training, and analytics built specifically for school finance.

> **Product naming:** The software will eventually have its own standalone brand name, distinct from "flowlyst" (the company brand). The brand name has not been decided yet. For this PRD and v1 site copy, refer to it as **"flowlyst Software"** or simply **"Budgeting Software"** — the new product brand will be swapped in via CMS when chosen.

**Core message — many tools, one platform:** Districts today buy three different web applications, run five different spreadsheets, and stitch them together to handle their budgeting workflow. flowlyst centralizes those tools into one platform. The exact module list keeps growing and is intentionally **not** enumerated in this PRD — that's a content/copy decision handled during site copy work. For the designer's purposes, assume the platform covers a broad and expanding set of budgeting and analysis tools.

**Illustrative examples** (not exhaustive — for the designer to grasp the surface area):
- Department-level budget development with a guided, menu-free interface
- Real-time budget tracking and actuals-vs-budget visibility
- Color-coded, segmented department reports
- Cross-department supervisor rollup
- Pre-built dashboards (built by data analysts and former school business officials), available to every district
- Fast table export for any dataset
- Coming soon: AI-driven budget analysis ("talk to your data")

**Custom dashboards (additional paid service):** flowlyst no longer ships per-district custom dashboards as a default. Pre-built dashboards apply to every customer. If a district wants a tailored dashboard — for example, salary projection scenarios with multiple inputs — flowlyst can build it on request as an additional service.

**Service promises** (differentiators that must appear on the page):
- 1-week average implementation
- Personalized onboarding sessions
- Support from school finance experts (not generic SaaS support)
- No IT staff required, no hidden fees

**Page goal:** Visitor requests a demo.

### 4.2 AI Training for District Leadership and Staff (service)

Interactive, district-specific workshops for the **leadership and staff of K–12 school districts** — the office that runs the district, plus its school-level staff. Training is **not aimed at students**; the audience is administrators, leaders, and operational staff. Districts may choose to bring school-level staff (e.g., principals, teachers) into sessions when relevant, but the training is designed for the office, not the classroom.

**Audiences within the offering:** superintendents, assistant superintendents, business managers, principals, technology directors, HR teams, business-office staff, instructional leaders, and the broader administrative staff at the district central office and at individual schools.

**Delivery formats:**
- Half-day or full-day workshop
- Multi-session webinar series
- Custom summer/fall institute packages
- In-person, virtual, or hybrid

(Keynotes are a separate offering — see §4.4.)

**What's included in every session:**
- Customized content for the audience (finance, HR, admin, IT, leadership — district picks)
- Real-world use cases (automating reports, writing AI prompts, analyzing data)
- Hands-on, no-fluff delivery
- Post-training AI toolkit (guides + prompt templates)

**Proof points:**
- 100% workshop satisfaction rating
- 500+ hours saved
- 2,000+ leaders trained

**Page goal:** Visitor books a 15-minute introductory Zoom discussion to explore bringing AI training to their district or organization. Booking is *not* a self-serve transaction — pricing and engagement details are handled in conversation, not on the site.

### 4.3 AI & Automation Consulting (service)

Hands-on engagements where flowlyst designs and implements automation across district operations. The team is positioned as former school CFOs and admin leaders — peer-to-peer, not consultant-to-client.

**Departments served — every central office function plus its school-level extensions:**
- HR
- Business Office
- Superintendent's Office
- Instructional leaders
- Accounts Payable
- Accounts Receivable
- ...and other central office departments

The pattern, not the department, is what flowlyst targets: any routine, repeatable task with an automation opportunity is in scope.

**Two engagement modes:**

1. **Targeted automation projects.** A specific routine task or workflow gets automated end-to-end. flowlyst designs the solution, implements it, and trains the team. Suitable for districts with one or two clear pain points to solve.

2. **Full automation consulting (McKinsey-style).** flowlyst goes deep into the organization, maps routine tasks across departments, designs the long-term automation roadmap, and **embeds an engineer with the district** who delivers the system *and* maintains it over time. Suitable for districts that want to systematically transform operations.

**Engagement opener:** A free 30-minute AI & automation assessment, one-time and by exception. flowlyst doesn't routinely give free assessments — this is offered as an introductory engagement to the consulting offering, not a recurring service.

**Proof points (use cases with facts):** the items below are placeholders carried over from the current site; the rewrite team should validate which districts and metrics are still publicly attributable, and add others as new cases land.
- A district cut financial report prep from 3 days to 3 hours via automation
- A district reduced redundant HR form review by 70%
- 98% AI rollout satisfaction rate across consulting engagements

**Page goal:** Visitor schedules a 30-minute assessment.

### 4.4 Keynotes (service)

Aziz Aghayev delivers keynotes and conference sessions on AI in K–12 administration, school finance modernization, and the future of district operations. Past venues include ASBO International, NJASBO, and CPS.

Keynotes are positioned **distinct from AI training (§4.2)**: different audience (broader event attendees, not internal district staff), different format (a single talk, not a multi-session workshop), and different booking process (event organizer engagement, not training scheduling).

**Audiences:** state and national association events (e.g., ASBO International, AASA), district-hosted summits, regional service-agency PD days, school finance conferences, and other industry gatherings.

**Topics flowlyst speaks on:** AI for K–12 school business officials, automating district finance and operations, practical AI adoption for school district leaders. (The detailed topic list is part of content work, not this PRD.)

**Page goal:** Event organizer submits a speaking request.

---

## 5. Trust signals to feature

Across the site, these are the proof points already validated in the existing copy:

| Signal | Source | Where to use |
|---|---|---|
| 100% workshop satisfaction rating | AI training | Homepage stat strip + AI training page |
| 2,000+ leaders trained | AI training | AI training page |
| 500+ hours saved | AI training | AI training page |
| 3 hrs vs 3 days monthly reporting | Consulting case | Consulting page + homepage |
| 70% HR form review reduction | Consulting case | Consulting page |
| 98% AI rollout satisfaction | Consulting | Consulting page |
| 1-week implementation | Budget software | Budget software page |
| Speaks at ASBO International, NJASBO, CPS | Founder | About page + Keynotes page |
| Testimonials from real districts (WSPS, BSD, CPS) | Live site | Per-page testimonial sections |

**Positioning message (not a stat — central to copy):** *"Many tools, one platform."* Districts today buy three different web applications and run five different spreadsheets to handle their budgeting workflow. flowlyst centralizes those into one platform. This is the leading message for the budgeting software offering — homepage and budget software page must convey it prominently.

**Note for the designer/copy team:** the testimonial system on the current site uses initials only (e.g., "WSPS", "BSD", "CK"). This is weaker proof than full district names + named contacts. The rewrite should aim to upgrade testimonials to **full district names with named, titled quotes** wherever flowlyst can get permission. Specific districts to approach are TBD; because testimonials are CMS-driven (§9), they can be added or upgraded any time post-launch without a code change.

---

## 6. Founder positioning

Aziz Aghayev is a load-bearing trust signal. The about page must communicate, prominently:

- **Former school CFO** with 15+ years in K–12 finance and leadership
- **National speaker** — has led sessions at ASBO International, CPS, NJASBO, and others
- **Title on this site:** Founder & Lead Consultant
- **Personal brand integration:** social profiles (LinkedIn), photo, video clips of speaking engagements (if available)

Implications:
- About page should have a dedicated "Meet Aziz" section, not just a generic team grid
- Founder photo and credentials should appear on at least one solution page (Consulting is the natural home — "consultants are former school CFOs")
- The blog should support author bios so Aziz's name appears on his posts

**Confirmed:** Aziz is the sole site-visible team member at launch. Other operational/CMS users (founder + co-operator currently, with room for 4–6 over the next 12 months) work behind the scenes managing content; they are not featured on the public site.

---

## 7. Page inventory (rough sitemap)

This is a **flat list with one-line purposes**, not a final IA. The designer is expected to challenge, reorganize, and propose nav structure.

### Marketing pages (public, indexed)

| Path | Purpose | Notes |
|---|---|---|
| `/` | Hero + offerings overview + trust signals + testimonials + final CTA | Four offerings; relative weighting/order is a design decision |
| `/about` | Founder story, mission, value pillars, featured expert (Aziz), team testimonials | Founder-led narrative |
| `/solutions/budget-software` | Product page: "many tools, one platform" message, illustrative modules, custom dashboards as paid add-on, support promise, demo CTA | Highest-intent commercial page; positions flowlyst as **supplementary to ERP**, not a replacement |
| `/solutions/ai-training` | Service page: audiences, delivery formats, what's included, success metrics, 15-min Zoom discussion CTA | Page title is "AI Training for District Leadership and Staff" — *not* for students |
| `/solutions/consulting` | Service page: departments served, two engagement modes (targeted + full McKinsey-style), use-case proof points, 30-min assessment CTA | |
| `/solutions/keynotes` | Service page: speaker bio, past venues, topics, request-a-keynote CTA | New offering split off from AI training (§4.4) |
| `/blog` | Article index with category/service filtering, newsletter signup | Currently 7 stale posts, June 2025 |
| `/blog/[slug]` | Article reader with author, reading time, share | Markdown content |
| `/contact` | Contact form (general inquiries) + alternative contact info | |
| `/request-demo` | Demo request form with district/role/interests/date capture | Primary lead-gen form |

### Pages to add (currently linked-but-broken on existing site)

| Path | Purpose | Notes |
|---|---|---|
| `/testimonials` | Filterable index of all published testimonials (by service, by industry/role) | Linked from About page CTA but doesn't exist |
| `/case-studies` *(or `/resources/case-studies`)* | Long-form district success stories with metrics | Linked from homepage but doesn't exist |

**Confirmed:** Both pages ship in v1 (current broken links become real pages).

### Pages explicitly removed from the rewrite

| Path | Reason |
|---|---|
| `/agents` | AI Agents capability removed from product offering. Page does not carry over. |
| `/ai-chat` | Public AI chat removed. Page does not carry over. |

The supporting Prisma models, API routes, OpenAI integration, and React-Admin resources for these features can also be dropped from the rewrite scope (chat-related models, `/api/ai-chat`, agent embedding components).

### Legal (required, low-priority for design)

| Path | Purpose |
|---|---|
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/cookies` | Cookie policy |

### Page count summary

- **Core marketing pages:** 6 (home + about + 4 solutions)
- **Lead capture / utility:** 4 (contact, demo, blog index, dynamic blog post template)
- **Trust pages:** 2 (`/testimonials`, `/case-studies`)
- **Legal:** 3 (privacy, terms, cookies)

**Total: 15 page templates** for the designer to address.

---

## 8. Lead capture and forms

The site's commercial purpose is generating qualified leads. Three forms must work day one:

### 8.1 Demo request (primary)

Highest-intent lead. Captures everything sales needs to triage and book.

**Fields to keep (as-is from current site):** Full Name, Title, District, Work Email, Phone, Interests (multi-select: AI Training / Budget Software / Consulting), Date Preference, Message, Consent checkbox, reCAPTCHA.

**Confirmed additions for v1 (all optional — no new required fields, to keep the form short):**
- **"How did you hear about us?"** — attribution field with quick-pick options (Google search / AI assistant like ChatGPT or Claude / referral / event or conference / LinkedIn or social / other). Optional. Important for the marketing team to understand acquisition channels — *especially* whether AI assistants are surfacing flowlyst — but kept optional to avoid form friction.
- **District size** — student count or number of schools. Optional. Helps flowlyst tailor the demo to the district's scale.
- **"Anything else we should know?"** — free-text catch-all. Optional.

Fields **not** added in v1 (sales can ask on the call): current ERP / finance system in use, implementation timeline.

**On submit:** create demo request record, send notification email to sales, show success state.

### 8.2 Contact form (secondary)

For non-demo inquiries (press, partnerships, training questions, support).

**Fields (current):** Name, Email, Message, Reason (dropdown), reCAPTCHA.

**On submit:** send email via SMTP to `info@flowlyst.io`. (Defer technical mail-routing to architecture phase.)

### 8.3 Newsletter signup

Single-field email capture, primarily on `/blog`. Subscriber goes into a list usable for future email marketing.

**On submit:** upsert subscriber record, send confirmation (currently does not — improve in rewrite).

---

## 9. Content management requirements (CMS side-note)

**This PRD does not design the CMS. It states what content authors must be able to do.** The architecture session picks the actual CMS (Sanity, Contentful, Payload, Strapi, custom, etc.).

**Dynamic content principle:** Testimonials, case studies, blog posts, training program details, and similar marketing content are **all CMS-driven**, not hardcoded into the site. Adding a new testimonial does **not** require a code change or redeploy — the marketing team adds it in the CMS and it appears on the site within minutes (via ISR / on-demand revalidation, exact mechanism is an architecture decision). This is how the current site already works for blog and testimonials; the rewrite preserves and extends this pattern. This is industry-standard practice for marketing sites.

**CMS users:** 2 known users at launch (founder + co-operator); plan for expandability to 4–6 over the next 12 months. Roles needed: Admin and Editor at minimum (per the hard requirements below).

### Content types the new CMS must manage

| Type | Notes |
|---|---|
| Blog posts | Title, slug, body, excerpt, featured image, OG image, SEO meta, reading time, tags, service category (AI Training / Budget Software / General), author, publish status, scheduled publish date |
| Testimonials | Quote, client name, role/title, district/organization, industry, service category, optional video URL, photo, featured flag, publish status |
| Case studies | Long-form structured content with intro, challenge, solution, results, metrics, district info, hero image. Distinct from blog posts. |
| Training programs / modules | Hierarchical (program > modules), titles, descriptions, duration, level, format. Used for the training landing page detail. |
| Demo requests inbox | Read-only review of submissions; status workflow (pending → scheduled → completed/canceled); notes; export. |
| Newsletter subscribers | Email list with status, subscribe/unsubscribe, export to CSV/external mail tool. |
| Site-wide settings | Footer copy, social links, contact email, hero copy A/B tests (later). |

### Hard requirements for content authors

The current admin's gaps are non-negotiable to fix:

- ✅ **Rich-text editor** for blog post bodies and case-study sections (markdown export OK; raw markdown editing alone is not OK)
- ✅ **Image upload and media library** — drag-and-drop, automatic resizing, alt-text capture; no more pasting external URLs
- ✅ **Drafts** that don't go live until published
- ✅ **Scheduled publishing** (set a future publish date)
- ✅ **Author profiles** with bio, photo, links — referenced by blog posts
- ✅ **Preview** — see the rendered page before publishing
- ✅ **Roles** — at minimum: Admin (everything) and Editor (content only). The current admin has roles defined in code but unenforced; the new admin must enforce them.

**CMS choice:** belongs in the architecture session. The only stated requirement from the user is that it must be **easy** for non-technical authors to use (rich text, image upload, drafts, scheduled publish — see hard requirements above). Specific tech (Sanity, Contentful, Payload, Strapi, custom, etc.) is decided downstream.

---

## 10. Non-functional requirements

These are not optional and not negotiable. They block SEO/AI-discoverability if missed.

### 10.1 Search and AI discoverability foundation

- **Server-rendered HTML** for every public page (no client-only content). Both Google and AI crawlers (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, etc.) need crawlable HTML.
- **Unique `<title>` and `<meta description>`** per page. Already present today; carry over the discipline.
- **Schema.org structured data** on every page where it applies: `Organization` site-wide, `Person` (Aziz) on About, `Service` on each solution page, `Article` on each blog post, `FAQPage` if FAQs are added.
- **Canonical URLs** to prevent www/non-www and trailing-slash duplication.
- **Open Graph + Twitter Card metadata** on every page (already present).
- **`sitemap.xml`** that is auto-regenerated when content changes (current site has it; preserve).
- **`robots.txt`** that explicitly **allows** AI crawlers — do not block GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc. The current `robots.txt` already disallows `/api/` and `/admin/` only, which is correct.
- **Content as text, not images.** No headlines or value props rendered as images.
- **Stable URLs** — preserve current paths where possible to keep any existing inbound links and search equity. (List below.)

### 10.2 Performance

- Lighthouse Performance ≥ 90 on the homepage and each solution page (mobile)
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1

### 10.3 Accessibility

- WCAG 2.1 AA conformance target
- Keyboard-navigable nav and forms
- Alt text on all imagery (enforced by CMS)
- Visible focus indicators
- Proper heading hierarchy (one H1 per page)

The current site uses a Corpowid accessibility widget — **keep it** in the rewrite (in addition to native a11y best practices listed above).

### 10.4 Security and privacy

- HTTPS only
- reCAPTCHA on demo and contact forms
- No customer data exposed in client bundles
- GDPR/CCPA-ready cookie consent
- Privacy policy must reflect actual data collection

### 10.5 Internationalization

**English only** for v1. The new site does not need to preserve the existing `useTranslations` i18n architecture as a hard requirement. Future internationalization is not a near-term goal.

---

## 11. URLs to preserve

Inbound links and any existing search equity live at these paths. The rewrite should preserve them (or 301-redirect aggressively):

```
/
/about
/contact
/request-demo
/blog
/blog/ai-predictive-analytics-staff-productivity
/blog/ai-sis-erp-automation-schools
/blog/ai-multi-year-forecasting-school-budgeting
/blog/ai-tools-school-admin-operations
/blog/ai-tools-school-hr-purchasing
/blog/ai-tools-school-finance-department
/blog/ai-tools-school-business-officials
/solutions/ai-training
/solutions/budget-software
/solutions/consulting
```

If any path changes (e.g., `/solutions/budget-software` → `/budget-software`), implement a 301 redirect.

---

## 12. Out of scope for this PRD

These are real workstreams but explicitly **not** decided here:

- **Visual design** — the designer takes this PRD and proposes visual direction.
- **Technical architecture** — Next.js on Vercel + Neon Postgres is the user's intended stack; specific framework choices, CMS choice, hosting topology, integrations, and migrations are decided in the architecture session.
- **SEO + GEO (AI discoverability) strategy** — Phase 2. Includes keyword research, content topic strategy, AI-citation tactics, structured-data depth, link building, off-page presence (LinkedIn, ASBO, etc.).
- **Editorial / content strategy** — Phase 3. Includes blog cadence, topic clusters, content calendar, repurposing strategy, video/podcast.
- **Engagement features for broader leadership audience** — Phase 2. Calculators, ROI tools, AI-readiness assessments, community features.
- **Pricing strategy** — confirmed: **no public pricing** on the new site. Continue lead-gen-only. Pricing is handled in sales conversations after demo request.
- **Brand identity** — confirmed: **preserve flowlyst's brand identity** (name, logo, color system, typography). Site copy will be substantially refreshed (the team plans to add and update content significantly). The budgeting software's product name will eventually be a standalone brand distinct from "flowlyst" (TBD); for v1 copy, use **"flowlyst Software"** or **"Budgeting Software"** as placeholders, swappable via CMS.
- **Sales process and lead handoff** — out of scope; site only commits to capturing the lead and notifying sales.

---

## 13. Open questions for user (consolidated)

### Closed (resolved during PRD review)

| Question | Resolution |
|---|---|
| Industry scope (§2) | K–12 primary; do not formally exclude non-K-12 training (~10% of training clients) or future government public-budgeting expansion |
| AI Agents productization | Removed entirely from offerings, page inventory, and supporting infrastructure |
| Testimonials hardcoded vs dynamic | Dynamic — CMS-driven, updates without redeploy (industry standard) |
| Site-visible team members | Aziz only on the public site; CMS users may be more (currently 2, expandable) |
| Trust pages | `/testimonials` and `/case-studies` ship in v1 (replacing current broken links) |
| `/ai-chat` page | Removed |
| CMS preferences | "Easy" is the requirement; specific tech is an architecture decision |
| Accessibility widget | Keep Corpowid |
| Internationalization | English only; no i18n architecture requirement |
| Pricing | Lead-gen only; no public pricing |
| Brand | Preserve flowlyst identity; content will be refreshed substantially |

| Demo form — attribution field (§8.1) | Add as **optional** quick-pick (Google / AI assistant / referral / event / LinkedIn / other) |
| Demo form — additional fields (§8.1) | Add **district size** + **free-text catch-all** (both optional). Skip current-systems and timeline — sales can ask on the call. |
| Testimonial collection (§5) | Deferred — no specific districts identified yet. Dynamic system means new or upgraded testimonials can be added any time post-launch without code change. |
| Budget software product naming (§12) | Standalone product brand TBD. For v1 copy, use placeholder "flowlyst Software" or "Budgeting Software." Product brand will be swapped in via CMS once chosen. |

### Still open

*All open questions resolved during PRD review. PRD is ready to lock pending final user review.*

---

## 14. Acceptance criteria for this PRD

This PRD is "done" when:

- [x] All open questions in §13 are answered
- [ ] User has reviewed and approved the page inventory in §7
- [ ] User has reviewed and approved the audience segmentation in §3
- [ ] User has reviewed and approved the offering descriptions in §4

Once approved, this document is ready to hand to the designer. Technical architecture and editorial strategy are downstream.

---

## Appendix A — Source copy reference

Canonical marketing copy (homepage hero, solution descriptions, value props) currently lives in `apps/web/src/translations/*.ts` of the existing repo. The rewrite team should treat that file as the v0 copy starting point. Specific files:

- `homepage.ts` — homepage hero + services + trust signals + final CTA
- `about.ts` — about hero + story + value pillars + service overview + CTA
- `ai-training.ts` — AI training page (hero, formats, what's included, metrics)
- `budget-software.ts` — budget software page (hero, feature cards, feature table, support, CTA)
- `consulting.ts` — consulting page (hero, value prop, services, process, results)
- `request-demo.ts`, `contact.ts`, `blog.ts`, `navigation.ts`, `footer.ts`, `common.ts`, `social-links.ts`, `ai-chat.ts`

A separate `featured-expert.tsx` component holds the founder bio and is **not** in translations — copy as-is for the rewrite.

---

## Appendix B — Current site stats (May 2026 snapshot)

- 16 URLs in `sitemap.xml`
- 7 blog posts published; oldest June 2025; **last published June 26, 2025** (~11 months stale at time of PRD)
- 12 React-Admin resources in current admin app
- 11 Prisma models
- 26 admin API routes
- Hosting: EC2 + RDS (current); Vercel + Neon Postgres (intended)
- Tech stack: Next.js 14.1.3, Prisma 6.8.2, Firebase Auth, OpenAI 5.6, React 18 (web) / 19 (admin)

---

*End of PRD v1*
