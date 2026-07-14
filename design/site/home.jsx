// home.jsx — flowlyst homepage
// Direction C, productionized: Nunito only, light-first, weight-stratified.
// Display headings mix Nunito 300 (airy) + 800 italic (charged green) for personality.
// Green is used as PUNCTUATION (one full-bleed band, accent words inline).
// Forest dark used sparingly (footer + product mock chrome).

function HomePage() {
  return (
    <div className="page">
      <Nav active="" />

      {/* HERO — light, type-led, side product mock */}
      <section style={{
        position: 'relative',
        padding: '40px 56px 64px',
        background: 'var(--c-paper)',
        overflow: 'hidden',
      }}>
        {/* very soft warm wash on the right */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 95% 0%, rgba(0,165,104,0.08) 0%, transparent 50%)',
        }}/>
        <MarkBig size={680} opacity={0.025} style={{ right: -160, top: 40 }} />

        <div className="container" style={{ position: 'relative', paddingTop: 64 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 32 }}>K-12 budget software · since day one</div>
              <h1 className="h1" style={{ marginBottom: 36 }}>
                Many tools.<br/>
                <em>One platform.</em><br/>
                <strong>Built by operators.</strong>
              </h1>
              <p className="lead" style={{ fontSize: 22, maxWidth: '48ch', marginBottom: 40 }}>
                flowlyst replaces three apps and five spreadsheets with one platform —
                designed by former school CFOs, supplementary to your ERP.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="request-demo.html" className="btn btn--primary btn--lg">Request a demo <ArrowRight/></a>
                <a href="about.html" className="btn btn--ghost btn--lg">Read the manifesto</a>
              </div>
            </div>

            <ProductMock />
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <Marquee items={['ASBO International', 'NJASBO', 'CPS', 'AASA', 'WSPS', 'BSD']} />
        </div>
      </section>

      {/* FLAGSHIP — Budget Software on cream */}
      <section className="section section--cream">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 32 }}>Flagship · Budget Software</div>
              <h2 className="h2" style={{ marginBottom: 32 }}>
                The platform we <em>wished existed</em> when we ran the budget.
              </h2>
              <p className="lead" style={{ fontSize: 19, marginBottom: 32 }}>
                Department entry. Real-time tracking. Salary projections. Board-ready reports.
                One source of truth that sits alongside the ERP you've already paid for.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 40 }}>
                {[
                  'Department entry & approvals',
                  'Real-time GL actuals',
                  'Salary projections',
                  'Board-ready reports',
                  'Pre-built dashboards',
                  'Grants tracking',
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 15, fontWeight: 700 }}>
                    <span className="accent" style={{ fontWeight: 800 }}>✦</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
              <a href="budget-software.html" className="btn btn--primary btn--lg">
                Tour the software <ArrowRight/>
              </a>
            </div>

            <BigNumberBlock
              num="$84.2M"
              label="District budget · FY 2025–26"
              sub="On flowlyst, the whole budget lives in one place. Drill from total to department to line item without leaving the page."
            />
          </div>
        </div>
      </section>

      {/* MANIFESTO STAT BAND — green punctuation */}
      <section className="section--green" style={{ padding: '140px 56px' }}>
        <div className="container" style={{ maxWidth: 1080 }}>
          <h2 className="h2" style={{ color: '#fff', marginBottom: 56 }}>
            <span className="accent--yellow">100%</span> workshop satisfaction.<br/>
            <span className="accent--yellow">2,000+</span> leaders trained.<br/>
            <span className="accent--yellow">500+</span> hours saved.
          </h2>
          <p style={{ fontSize: 20, lineHeight: 1.55, maxWidth: '54ch', color: 'rgba(255,255,255,0.9)', margin: 0 }}>
            Every number is a district leader who got their evening back, a board meeting
            that ran clean, or a budget that closed on time.
          </p>
        </div>
      </section>

      {/* OFFERINGS — tabular, light */}
      <section className="section">
        <div className="container">
          <div style={{ marginBottom: 64 }}>
            <div className="eyebrow" style={{ marginBottom: 32 }}>What we offer</div>
            <h2 className="h2" style={{ maxWidth: '22ch' }}>
              One vendor. <em>Four ways</em> to work with us.
            </h2>
          </div>

          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {[
              { num: '01', tag: 'Software',   title: 'Budget Software', copy: 'Department entry, real-time tracking, salary projections, board-ready reports — supplementary to your ERP.', cta: 'Request a demo', href: 'budget-software.html' },
              { num: '02', tag: 'Workshop',   title: 'AI Training',     copy: 'District-specific workshops for leadership and staff. 100% satisfaction across 2,000+ leaders.', cta: 'Book a discussion', href: 'ai-training.html' },
              { num: '03', tag: 'Engagement', title: 'Consulting',      copy: 'Targeted automation projects or full McKinsey-style roadmaps with embedded engineers. 500+ admin hours saved.', cta: 'Free assessment', href: 'consulting.html' },
              { num: '04', tag: 'Speaking',   title: 'Keynotes',        copy: 'Aziz Aghayev on AI, school finance, and the future of district operations. ASBO International, NJASBO, CPS.', cta: 'Submit a request', href: 'keynotes.html' },
            ].map((o) => (
              <div key={o.num} className="t-row t-row--light">
                <div className="t-row__num">{o.num}</div>
                <div className="t-row__tag">{o.tag}</div>
                <div>
                  <h3 className="t-row__title">{o.title}</h3>
                  <p className="t-row__copy">{o.copy}</p>
                </div>
                <a href={o.href} className="t-row__cta">{o.cta} <ArrowRight/></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER PULL QUOTE — sage tint, big italic */}
      <section className="section section--sage" style={{ padding: '160px 56px' }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <div className="eyebrow" style={{ marginBottom: 48 }}>Aziz Aghayev · Founder</div>
          <blockquote className="pull" style={{ color: 'var(--c-ink)', margin: 0 }}>
            "I sat in <em>your seat</em> for fifteen years. flowlyst is the partner
            I wished I'd had — built without the vendor distance."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 56 }}>
            <FounderAvatar size={64} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Aziz Aghayev</div>
              <div style={{ fontSize: 14, color: 'var(--c-ink-3)', marginTop: 4 }}>
                Founder &amp; Lead Consultant · former school CFO · 15+ years
              </div>
            </div>
            <a href="about.html" className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }}>
              Read the full story <ArrowRight/>
            </a>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — cream, white cards */}
      <section className="section section--cream" style={{ padding: '140px 56px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64, marginBottom: 56, alignItems: 'flex-end' }}>
            <h2 className="h2">In their <em>own words.</em></h2>
            <p style={{ fontSize: 18, color: 'var(--c-ink-2)', maxWidth: '54ch', margin: 0, lineHeight: 1.55 }}>
              District leaders we've worked with — operators, not personas. Names redacted on request.
            </p>
          </div>

          <div className="grid-3">
            {[
              { q: 'Monthly close went from three days to three hours. The board noticed.', who: 'Director of Business Services · WSPS' },
              { q: 'Our HR team stopped re-keying forms. That alone bought back a week per month.', who: 'HR Director · BSD' },
              { q: 'The first AI session that gave my staff something they actually used the next day.', who: 'Superintendent · CPS' },
            ].map((t, i) => (
              <div key={i} className="card">
                <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 0.4, color: 'var(--fl-green)', marginBottom: 24 }}>"</div>
                <p style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.35, margin: '0 0 32px', color: 'var(--c-ink)' }}>{t.q}</p>
                <div style={{ fontSize: 12, color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>{t.who}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <a href="testimonials.html" className="btn btn--ghost">All testimonials <ArrowRight/></a>
          </div>
        </div>
      </section>

      {/* BLOG TEASER — paper */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 32 }}>From the blog</div>
              <h2 className="h2" style={{ maxWidth: '20ch' }}>
                Notes from the office that <em>runs the district.</em>
              </h2>
            </div>
            <a href="blog.html" className="btn btn--ghost">All posts <ArrowRight/></a>
          </div>

          <div className="grid-3">
            {[
              { tag: 'AI · 6 min',      title: 'AI tools for school business officials in 2026',     date: 'Apr 22, 2026' },
              { tag: 'Budget · 8 min',  title: 'AI &amp; multi-year forecasting in school budgeting',  date: 'Apr 8, 2026' },
              { tag: 'Ops · 5 min',     title: 'AI predictive analytics for staff productivity',     date: 'Mar 28, 2026' },
            ].map((p, i) => (
              <a key={i} href="blog-post.html" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <BlogTileArt index={i} />
                  <div style={{ padding: 28 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fl-green-700)', marginBottom: 14 }}>{p.tag}</div>
                    <h3 className="h4" style={{ marginBottom: 14, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: p.title }}/>
                    <div style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>by Aziz Aghayev · {p.date}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
      <Footer />
    </div>
  );
}

// ---------------- supporting elements ----------------

// Editorial big-number "block" — replaces some inline product visuals.
// Uses scale and weight contrast to feel like an editorial layout.
function BigNumberBlock({ num, label, sub }) {
  return (
    <div style={{ position: 'relative' }}>
      <ProductMock />
    </div>
  );
}

// Product mock — light UI, matching the real product (no dark mode).
// Sits on a light section as a crisp product screenshot in its own frame.
function ProductMock() {
  return (
    <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--c-paper)', border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 32px 80px -16px rgba(14,20,16,0.18)' }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-line-2)', display: 'flex', gap: 6, alignItems: 'center', background: 'var(--c-cream)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}/>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}/>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(26,26,27,0.18)' }}/>
          <span style={{ marginLeft: 12, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--c-ink-3)' }}>flowlyst · FY26 budget</span>
        </div>
        <div style={{ padding: 24, flex: 1, color: 'var(--c-ink)' }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 4 }}>$84.2M</div>
          <div style={{ fontSize: 11, color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 28, fontWeight: 800 }}>
            Total district budget · FY 2025–26
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            {[['Encumbered', '$61.7M', '73% of plan'], ['Variance', '−$240K', 'Under budget']].map(([l, n, d], i) => (
              <div key={i} style={{ padding: '14px 16px', border: '1px solid var(--c-line)', borderRadius: 4, background: 'var(--c-sage)' }}>
                <div style={{ fontSize: 10, color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>{l}</div>
                <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 2px', letterSpacing: '-0.02em' }}>{n}</div>
                <div style={{ fontSize: 11, color: 'var(--fl-green-700)', fontWeight: 800 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
            {[40, 65, 50, 78, 55, 92, 72, 68, 85, 60, 75, 88].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h + '%', background: i === 5 ? 'var(--fl-green)' : 'rgba(0,165,104,0.22)', borderRadius: '2px 2px 0 0' }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FounderAvatar({ size = 64 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: 'linear-gradient(135deg, #3a4a40, #1a2520)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <svg viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="32" cy="26" r="11" fill="rgba(255,210,170,0.4)"/>
        <path d="M 10 64 Q 10 44 32 42 Q 54 44 54 64 Z" fill="rgba(20,30,25,0.7)"/>
      </svg>
    </div>
  );
}

// Geometric blog tile placeholders — distinct per index, light-theme-friendly.
function BlogTileArt({ index = 0 }) {
  const variants = [
    // Sage bars
    <svg key="a" viewBox="0 0 400 160" style={{ width: '100%', height: 160, display: 'block', background: 'var(--c-sage)' }}>
      <rect x="20" y="60" width="40" height="80" fill="rgba(0,165,104,0.35)"/>
      <rect x="80" y="40" width="40" height="100" fill="rgba(0,165,104,0.55)"/>
      <rect x="140" y="20" width="40" height="120" fill="var(--fl-green)"/>
      <rect x="200" y="50" width="40" height="90" fill="rgba(0,165,104,0.45)"/>
      <rect x="260" y="70" width="40" height="70" fill="rgba(0,165,104,0.3)"/>
      <rect x="320" y="30" width="40" height="110" fill="rgba(0,165,104,0.5)"/>
    </svg>,
    // Green curve
    <svg key="b" viewBox="0 0 400 160" style={{ width: '100%', height: 160, display: 'block', background: 'var(--fl-green)' }}>
      <path d="M 20 130 Q 100 130 140 90 T 280 60 T 380 30" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 20 130 Q 100 130 140 90 T 280 60 T 380 30 L 380 160 L 20 160 Z" fill="rgba(255,255,255,0.15)"/>
      <circle cx="280" cy="60" r="6" fill="#fff"/>
      <circle cx="380" cy="30" r="6" fill="#FFE9A0"/>
    </svg>,
    // Cream dot grid
    <svg key="c" viewBox="0 0 400 160" style={{ width: '100%', height: 160, display: 'block', background: 'var(--c-cream)' }}>
      {Array(8).fill(0).map((_, x) =>
        Array(4).fill(0).map((_, y) => (
          <circle
            key={x + '-' + y}
            cx={30 + x * 48}
            cy={30 + y * 35}
            r={x === 5 && y === 1 ? 12 : 5}
            fill={x === 5 && y === 1 ? 'var(--fl-green)' : 'rgba(14,20,16,0.35)'}
          />
        ))
      )}
    </svg>,
  ];
  return variants[index % variants.length];
}

Object.assign(window, { HomePage, ProductMock, FounderAvatar, BlogTileArt, BigNumberBlock });
