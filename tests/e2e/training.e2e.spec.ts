import { test, expect } from '@playwright/test'
import {
  fetchHtml,
  getTitle,
  getMetaContent,
  getMetaProperty,
  getCanonicals,
  collectJsonLdNodes,
  typeMatches,
} from '../helpers/rawHtml'

/**
 * AI Training solution page (`/solutions/ai-training`, issue #9) — server-rendering,
 * SEO surface, structured data, the "door-open-without-leading" non-K-12 guard
 * (PRD §3.4), and accessibility smoke.
 *
 * Modelled on tests/e2e/budget.e2e.spec.ts. The SSR / SEO / JSON-LD / copy
 * assertions read the *raw* server HTML over HTTP (no browser, no JS) via the shared
 * helpers in tests/helpers/rawHtml.ts — if a crawlable string only appears after
 * hydration these fail, which is the PRD §10.1 requirement that public pages are
 * server-rendered (review invariant a). The page is fully static (no CMS query,
 * adjudicated), so there is no omitted-testimonial / no-leak case here. The layout,
 * focus, and hero-scoped assertions need a real browser (computed layout, tab order,
 * visible text), so those go through the `page` fixture.
 *
 * String-match care: the H1 splits across an <em>, the hero eyebrow uses a middot,
 * and the body copy uses curly apostrophes and en/em-dashes. Assertions key on clean,
 * distinctive substrings inside a single text node — never a phrase that spans markup.
 */

const PATH = '/solutions/ai-training'

// ------------------------------- SEO metadata -------------------------------

test.describe('AI Training page — SEO metadata (raw HTML, no JS)', () => {
  test('has a distinct, training-branded <title>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const title = getTitle(html)
    expect(title, '<title> must be present').toBeTruthy()
    expect(title!.length).toBeGreaterThan(0)
    expect(title!, 'title names the page subject').toMatch(/AI Training/i)
    expect(title!, 'title is flowlyst-branded').toMatch(/flowlyst/i)
  })

  test('has a non-empty <meta description> distinct from the title', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const description = getMetaContent(html, 'description')
    const title = getTitle(html)
    expect(description, '<meta name="description"> must be present').toBeTruthy()
    expect(
      description!.length,
      'description is a usable length, not a stub',
    ).toBeGreaterThanOrEqual(50)
    expect(description, 'description and title serve different roles').not.toBe(title)
    expect(description!, 'description is on-topic').toMatch(/AI workshops|AI training|toolkit/i)
  })

  test('title and description are UNIQUE vs the homepage', async ({ request }) => {
    // PRD §10.1 / §11: every public page needs its OWN title + description. Prove the
    // training page did not inherit the site defaults by diffing against "/".
    const [homeHtml, trainingHtml] = [await fetchHtml(request, '/'), await fetchHtml(request, PATH)]
    expect(getTitle(trainingHtml), 'training title must differ from homepage title').not.toBe(
      getTitle(homeHtml),
    )
    expect(
      getMetaContent(trainingHtml, 'description'),
      'training description must differ from homepage description',
    ).not.toBe(getMetaContent(homeHtml, 'description'))
  })

  test('exactly one canonical, absolute, pointing at the training path', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const canonicals = getCanonicals(html)
    expect(canonicals.length, 'exactly one <link rel="canonical">').toBe(1)
    const canonical = canonicals[0]
    // A missing/misconfigured metadataBase renders canonical as a relative path — this
    // fails loudly on that: it must be a full scheme+host URL.
    expect(canonical, 'canonical must be absolute (scheme + host)').toMatch(/^https?:\/\/[^/]+/i)
    expect(canonical.startsWith('/'), 'canonical must not be a relative path').toBe(false)
    expect(new URL(canonical).pathname, 'canonical path must be the training path').toBe(PATH)
  })

  test('OpenGraph title, description, and url are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const ogTitle = getMetaProperty(html, 'og:title')
    const ogDesc = getMetaProperty(html, 'og:description')
    const ogUrl = getMetaProperty(html, 'og:url')
    expect(ogTitle, 'og:title present and non-empty').toBeTruthy()
    expect(ogDesc, 'og:description present and non-empty').toBeTruthy()
    expect(ogUrl, 'og:url present').toBeTruthy()
    // og:url resolves to the training page (absolute via metadataBase).
    expect(new URL(ogUrl!).pathname, 'og:url points at the training path').toBe(PATH)
  })
})

// --------------------------- Structured data (JSON-LD) ----------------------

test.describe('AI Training page — JSON-LD structured data', () => {
  test('Organization (site-wide) and Service (page) nodes both parse', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // collectJsonLdNodes throws on malformed JSON, so this asserts every block parses.
    const nodes = collectJsonLdNodes(html)
    expect(nodes.length, 'at least one application/ld+json block').toBeGreaterThan(0)

    // Organization comes from the root layout (review invariant a).
    const org = nodes.find(({ node }) => typeMatches(node, 'Organization'))
    expect(org, 'an Organization node must be present').toBeTruthy()
    expect(typeof org!.node.name, 'Organization.name is a string').toBe('string')
    expect((org!.node.name as string).length).toBeGreaterThan(0)
    expect(org!.node.url as string, 'Organization.url is absolute').toMatch(/^https?:\/\/[^/]+/i)
  })

  test('there is EXACTLY ONE top-level Service node', async ({ request }) => {
    // The brief requires a single Service node (the provider Organization nested inside
    // it is not a top-level node, so it does not double-count). A duplicated Service —
    // e.g. if the shared hero ever emitted one too — would confuse crawlers.
    const html = await fetchHtml(request, PATH)
    const services = collectJsonLdNodes(html).filter(({ node }) => typeMatches(node, 'Service'))
    expect(services.length, 'exactly one Service JSON-LD node on the solution page').toBe(1)
  })

  test('Service node has schema.org context, a training name, and a provider Organization', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const service = nodes.find(({ node }) => typeMatches(node, 'Service'))
    expect(service, 'a Service JSON-LD node must be present on the solution page').toBeTruthy()

    const context = service!.context
    const contextStr = Array.isArray(context) ? context.join(' ') : String(context ?? '')
    expect(contextStr, '@context references schema.org').toMatch(/schema\.org/i)

    const node = service!.node
    expect(typeof node.name, 'Service.name is a string').toBe('string')
    expect((node.name as string).length, 'Service.name non-empty').toBeGreaterThan(0)
    expect(node.name as string, 'Service.name names the training offering').toMatch(/training/i)
    expect(typeof node.url, 'Service.url is a string').toBe('string')
    expect(node.url as string, 'Service.url absolute').toMatch(/^https?:\/\/[^/]+/i)

    // provider is a schema.org Organization with a name.
    const provider = node.provider as Record<string, unknown> | undefined
    expect(provider, 'Service.provider present').toBeTruthy()
    expect(provider!['@type'], 'provider is an Organization').toBe('Organization')
    expect(typeof provider!.name, 'provider.name is a string').toBe('string')
    expect((provider!.name as string).length).toBeGreaterThan(0)
  })

  test('Service node carries NO price / offers fields (public pricing is banned)', async ({
    request,
  }) => {
    // PRD §12 / brand rule: no public pricing anywhere. The Service node must not smuggle
    // price data via schema.org offer fields.
    const html = await fetchHtml(request, PATH)
    const nodes = collectJsonLdNodes(html)
    const service = nodes.find(({ node }) => typeMatches(node, 'Service'))!
    const node = service.node
    for (const banned of ['offers', 'price', 'priceSpecification', 'priceCurrency', 'priceRange']) {
      expect(node[banned], `Service must not carry a "${banned}" field`).toBeUndefined()
    }
    // Belt-and-suspenders: no offer/price key anywhere in the node's JSON (e.g. nested).
    expect(JSON.stringify(node), 'no offer/price fields anywhere in the Service node').not.toMatch(
      /"(offers|price|priceCurrency|priceSpecification|priceRange)"\s*:/i,
    )
  })
})

// --------------------------- Server-rendered content ------------------------

test.describe('AI Training page — server-rendered content (raw HTML, no JS)', () => {
  test('hero headline and CTAs are in the server HTML', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // H1 splits across an <em> ("AI training that <em>sticks the next day.</em>"), so key
    // on the clean fragment inside the <em>, not the phrase that spans the tag.
    expect(html, 'hero H1 fragment "sticks the next day"').toMatch(/sticks the next day/i)
    expect(html, 'hero primary CTA').toContain('Book a 15-min discussion')
    expect(html, 'hero secondary CTA').toContain('See sample agenda')
  })

  test('the three hero proof chips are server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Literal % / + / comma — matched as plain substrings, not regex.
    expect(html, 'chip — satisfaction').toContain('100% satisfaction')
    expect(html, 'chip — leaders trained').toContain('2,000+ leaders trained')
    expect(html, 'chip — hours saved').toContain('500+ hours saved')
  })

  test('the four section data-testids are present', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    for (const testid of [
      'training-audiences',
      'training-formats',
      'training-included',
      'training-agenda',
    ]) {
      expect(html, `section "${testid}" must be in the server HTML`).toContain(
        `data-testid="${testid}"`,
      )
    }
  })

  test('the audiences section names its audiences and states "not for students"', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // PRD §4.2: training is for the office that runs the district, explicitly not students.
    // "not for students" is contiguous after the </em> in the section title.
    expect(html, 'audiences: not-for-students framing').toMatch(/not for students/i)
    for (const audience of ['Superintendents', 'Business managers', 'Principals']) {
      expect(html, `audience "${audience}"`).toContain(audience)
    }
    // "HR & IT" renders with the ampersand HTML-escaped (`HR &amp; IT`); match either form.
    expect(html, 'audience "HR & IT"').toMatch(/HR &(?:amp;)? IT/)
  })

  test('all four delivery formats are server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // PRD §4.2 fixed list — clean title substrings (tags carry middots).
    for (const format of [
      'Single workshop',
      'Multi-session paced',
      'Summer/fall institute',
      'Whatever your district needs',
    ]) {
      expect(html, `format "${format}"`).toContain(format)
    }
  })

  test("the what's-included checklist and toolkit are server-rendered", async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // PRD §4.2 — every session ships with these; the toolkit is licensed district-wide.
    for (const item of [
      'Customized content',
      'Real-world use cases',
      'Hands-on delivery',
      'Post-training toolkit',
    ]) {
      expect(html, `included item "${item}"`).toContain(item)
    }
    expect(html, 'toolkit is licensed for the whole district').toMatch(/whole district/i)
  })

  test('the sample half-day agenda rows are server-rendered', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    // Agenda times carry en-dashes; key on the clean row titles instead.
    for (const row of [
      'AI in K-12',
      'Hands-on prompt building',
      'Use case clinic',
      'Toolkit handoff',
    ]) {
      expect(html, `agenda row "${row}"`).toContain(row)
    }
    // The section is labelled a *sample* (illustrative, PRD §4.2) — four-hour framing.
    expect(html, 'agenda "four hours" framing (inside <em>)').toMatch(/four hours/i)
  })

  test('the server HTML has exactly one <h1>', async ({ request }) => {
    const html = await fetchHtml(request, PATH)
    const h1s = html.match(/<h1\b/gi) ?? []
    expect(h1s.length, 'exactly one <h1> in the server HTML').toBe(1)
  })
})

// -------- Door-open-without-leading: the non-K-12 note (PRD §3.4) -----------

test.describe('AI Training page — non-K-12 note present but not leading', () => {
  test('the adjacent non-K-12 note IS server-rendered somewhere on the page', async ({
    request,
  }) => {
    const html = await fetchHtml(request, PATH)
    // PRD §3.4: the door is open to non-K-12 orgs — the note must exist and be crawlable.
    expect(html, 'non-K-12 note present').toMatch(/non-K-12/i)
    expect(html, 'the "roughly 10%" framing is present').toMatch(/roughly 10%/i)
  })

  test('the non-K-12 note does NOT appear in the hero (K-12 leads)', async ({ page }) => {
    await page.goto(PATH)
    // The hero leads with K-12; the adjacent-clients note lives down in the audiences
    // section, never in the hero. Assert on the hero's rendered text so we can't be
    // fooled by the note happening to sit elsewhere in the raw HTML.
    const heroText = await page.locator('[data-testid="solution-hero"]').innerText()
    expect(heroText, 'hero must not surface the non-K-12 note').not.toMatch(/non-K-12/i)
    expect(heroText, 'hero must not surface the "Adjacent:" label').not.toMatch(/Adjacent:/i)
    expect(heroText, 'hero must not surface the "roughly 10%" framing').not.toMatch(/roughly 10%/i)
    // Sanity: the hero DOES carry the K-12 leadership framing (proves we scoped the hero,
    // not an empty node).
    expect(heroText, 'hero carries the K-12 leadership framing').toMatch(
      /District Leadership and Staff/i,
    )
  })
})

// ------------------------- #agenda anchor (secondary CTA) -------------------

test.describe('AI Training page — #agenda anchor target', () => {
  test('the secondary CTA links to #agenda and a matching #agenda element exists', async ({
    page,
  }) => {
    await page.goto(PATH)
    // The "See sample agenda" secondary CTA is an in-page anchor (href="#agenda").
    const anchorLink = page.locator('a[href="#agenda"]')
    expect(await anchorLink.count(), 'at least one link targets #agenda').toBeGreaterThanOrEqual(1)

    // The target element must actually exist with id="agenda" — a broken anchor scrolls
    // nowhere. It is the agenda section itself (data-testid="training-agenda").
    const target = page.locator('#agenda')
    await expect(target, 'exactly one #agenda target element').toHaveCount(1)
    await expect(target, 'the #agenda target is the sample-agenda section').toHaveAttribute(
      'data-testid',
      'training-agenda',
    )
  })
})

// ------------------- Responsive nav & reflow (WCAG 1.4.10) ------------------

test.describe('AI Training page — nav folds to the hamburger before it wraps', () => {
  // Shared-chrome guard mirrored from home.e2e.spec.ts (issues #45/#58): the full
  // desktop nav has no nowrap, so below its ~908px single-line fit point the labels
  // wrap to two lines. styles.css folds the nav to the burger at <=959px. This pins
  // that on the training page: at 768 the page must not scroll horizontally and the
  // burger — not the desktop link row — is the nav control. (home.e2e pins the full
  // 768/900/960 behaviour.)
  test('at 768px width there is no horizontal overflow and the burger is the nav control', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(PATH)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'documentElement.scrollWidth must equal the 768px viewport').toBe(768)

    await expect(page.locator('.nav__burger')).toBeVisible()
    await expect(page.locator('.nav__links a').first()).toBeHidden()
  })

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    // WCAG 1.4.10 reflow: the document must not scroll horizontally on a phone. The hero's
    // oversized faded mark is absolutely positioned inside an overflow:hidden section; if
    // any section pushes the document past the viewport, this fails.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, 'no horizontal overflow at 390px').toBeLessThanOrEqual(390)
  })
})

// ------------------------- Accessibility smoke ------------------------------

test.describe('AI Training page — accessibility smoke', () => {
  test('has exactly one H1', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('heading levels within the page never skip', async ({ page }) => {
    await page.goto(PATH)
    // Scope to the page's own <main> — the footer chrome is not this page's content. The
    // agenda titles and audience cards are <h3> after the #9 a11y fix (b530424); a
    // regression back to <h4> under the section <h2> would reintroduce a level skip and
    // fail here.
    const levels = await page.$$eval('#main-content :is(h1,h2,h3,h4,h5,h6)', (els) =>
      els.map((el) => Number(el.tagName.slice(1))),
    )
    expect(levels.length, 'main has headings').toBeGreaterThan(0)
    expect(levels[0], 'the first heading in main is the H1').toBe(1)
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i] - levels[i - 1],
        `heading level must not jump down more than one (…h${levels[i - 1]} → h${levels[i]})`,
      ).toBeLessThanOrEqual(1)
    }
  })

  test('every <img> carries an alt attribute', async ({ page }) => {
    await page.goto(PATH)
    // This page's visuals are divs + an inline-SVG Mark (aria-hidden), so there may be no
    // <img> at all — the loop is a regression guard for if imagery is added later.
    const imgs = page.locator('img')
    const count = await imgs.count()
    for (let i = 0; i < count; i++) {
      // alt may be "" for decorative images — the attribute must be PRESENT.
      const alt = await imgs.nth(i).getAttribute('alt')
      expect(alt, `img[${i}] must have an alt attribute (present, may be empty)`).not.toBeNull()
    }
  })

  test('the hero primary CTA is keyboard-reachable', async ({ page }) => {
    await page.goto(PATH)
    const cta = page
      .locator('[data-testid="solution-hero"]')
      .getByRole('link', { name: /Book a 15-min discussion/i })
    // Prove it's a real anchor in the tab order (a tabindex=-1 element would pass .focus()
    // alone), then confirm it can take focus.
    const tabindex = await cta.getAttribute('tabindex')
    expect(
      tabindex === null || Number(tabindex) >= 0,
      'hero CTA must not have a negative tabindex',
    ).toBe(true)
    await cta.focus()
    await expect(cta).toBeFocused()
  })

  test('the hero secondary CTA (#agenda) is keyboard-reachable', async ({ page }) => {
    await page.goto(PATH)
    const cta = page
      .locator('[data-testid="solution-hero"]')
      .getByRole('link', { name: /See sample agenda/i })
    await expect(cta, 'secondary CTA present in the hero').toHaveCount(1)
    await expect(cta, 'secondary CTA targets the #agenda anchor').toHaveAttribute('href', '#agenda')
    await cta.focus()
    await expect(cta).toBeFocused()
  })
})
