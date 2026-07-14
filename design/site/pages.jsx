// pages.jsx — About, Blog index, Blog post, Testimonials, Case studies,
// Request demo, Contact, Legal. All Direction C, Nunito.

// =====================================================
// ABOUT
// =====================================================
function AboutPage() {
  return (
    <div className="page">
      <Nav active="about" />

      {/* HERO */}
      <section style={{ position: 'relative', padding: '64px 56px 96px', background: 'var(--c-cream)', color: 'var(--c-ink)', overflow: 'hidden', borderBottom: '1px solid var(--c-cream-2)' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 60%, rgba(0,165,104,0.16) 0%, transparent 55%)'
        }}/>
        <MarkBig size={680} opacity={0.05} style={{ left: -160, top: 40 }} />
        <div className="container" style={{ position: 'relative', paddingTop: 64 }}>
          <div className="eyebrow mb-32">About flowlyst</div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            We sat in <em>your seat.</em><br/>
            Now we build for it.
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '54ch' }}>
            flowlyst is K-12 first. The founder and consultants are former school CFOs and admin leaders — not generalist ed-tech vendors. Everything we ship runs through that lens.
          </p>
        </div>
      </section>

      {/* MEET AZIZ */}
      <section className="section section--cream">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'center' }}>
            <FounderPortrait/>
            <div>
              <div className="eyebrow mb-32">Founder &amp; Lead Consultant</div>
              <h2 className="h2" style={{ marginBottom: 32 }}>Aziz Aghayev</h2>
              <p style={{ fontSize: 22, lineHeight: 1.45, marginBottom: 24, color: 'var(--c-ink)', fontWeight: 600, maxWidth: '50ch' }}>
                15+ years in K-12 finance and leadership. Former school CFO. National speaker.
              </p>
              <p className="p" style={{ fontSize: 17, marginBottom: 32, maxWidth: '54ch' }}>
                Aziz built flowlyst because the tools and partners he wished he had as a CFO didn't exist. Today he leads the consulting practice, delivers most keynotes, and writes most of the blog.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
                {['Former school CFO', 'ASBO International speaker', 'NJASBO · CPS', 'AASA'].map((c, i) => <span key={i} className="chip chip--green">{c}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <a href="#" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)', textDecoration: 'none', borderBottom: '1.5px solid var(--fl-green)', paddingBottom: 3 }}>LinkedIn <ArrowRight/></a>
                <a href="keynotes.html" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)', textDecoration: 'none', borderBottom: '1.5px solid var(--fl-green)', paddingBottom: 3 }}>Speaking reel <ArrowRight/></a>
                <a href="contact.html" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)', textDecoration: 'none', borderBottom: '1.5px solid var(--fl-green)', paddingBottom: 3 }}>Email Aziz <ArrowRight/></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION + PILLARS */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Our mission"
            title={<>Equip K-12 districts with the tools and partners <em>we wished we'd had.</em></>}
            maxWidth="22ch"
          />
          <div className="grid-3">
            {[
              { num: '01', t: 'Operator credibility', c: 'We ran districts. We know which problems are real and which are vendor-invented.' },
              { num: '02', t: 'Partner, not vendor', c: 'We walk with each district from onboarding through long-term support.' },
              { num: '03', t: 'K-12 first', c: 'Every product, training, and engagement starts from K-12 — not adapted from elsewhere.' },
            ].map((p) => (
              <div key={p.num} className="card">
                <div style={{ fontSize: 40, fontWeight: 300, color: 'rgba(0,0,0,0.18)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 16 }}>{p.num}</div>
                <h3 className="h3" style={{ marginBottom: 12, fontSize: 24 }}>{p.t}</h3>
                <p className="p">{p.c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO QUOTE — green band */}
      <section className="section--green" style={{ padding: '140px 56px' }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-yellow)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 40 }}>
            ─── Aziz on flowlyst
          </div>
          <blockquote className="h1" style={{ color: '#fff', margin: 0, fontSize: 'clamp(40px, 5vw, 72px)' }}>
            "I sat in <span className="accent--yellow">your seat</span> for fifteen years. flowlyst is the partner I wished I'd had — built without the vendor distance."
          </blockquote>
        </div>
      </section>

      {/* WHAT WE OFFER — quick cross-link grid */}
      <section className="section section--cream">
        <div className="container">
          <SectionHead eyebrow="What we offer" title={<>Four ways to <em>work with us.</em></>} />
          <div className="grid-4">
            {[
              { t: 'Budget Software', href: 'budget-software.html' },
              { t: 'AI Training',     href: 'ai-training.html' },
              { t: 'Consulting',      href: 'consulting.html' },
              { t: 'Keynotes',        href: 'keynotes.html' },
            ].map((o) => (
              <a key={o.t} href={o.href} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <h4 className="h4" style={{ marginBottom: 16 }}>{o.t}</h4>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fl-green-700)' }}>Learn more <ArrowRight/></span>
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

function FounderPortrait() {
  return (
    <div style={{ aspectRatio: '4/5', borderRadius: 4, overflow: 'hidden', position: 'relative', background: 'linear-gradient(160deg, #3a4a40 0%, #1a2520 100%)' }}>
      <svg viewBox="0 0 400 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="rim2" cx="35%" cy="40%" r="65%">
            <stop offset="0%" stopColor="rgba(255,220,180,0.5)"/>
            <stop offset="100%" stopColor="rgba(255,220,180,0)"/>
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="200" rx="82" ry="96" fill="rgba(255,210,170,0.35)"/>
        <path d="M 75 500 Q 75 340 200 320 Q 325 340 325 500 Z" fill="rgba(20,30,25,0.85)"/>
        <ellipse cx="200" cy="200" rx="82" ry="96" fill="url(#rim2)"/>
      </svg>
      <div style={{ position: 'absolute', left: 24, bottom: 24, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Portrait placeholder
      </div>
    </div>
  );
}

// =====================================================
// BLOG INDEX
// =====================================================
function BlogIndexPage() {
  const posts = [
    { tag: 'AI · 6 min',      title: 'AI tools for school business officials in 2026',     date: 'Apr 22, 2026', feat: true },
    { tag: 'Budget · 8 min',  title: 'AI &amp; multi-year forecasting in school budgeting',  date: 'Apr 8, 2026' },
    { tag: 'Ops · 5 min',     title: 'AI predictive analytics for staff productivity',     date: 'Mar 28, 2026' },
    { tag: 'AI · 7 min',      title: 'AI, SIS, and ERP automation in schools',             date: 'Mar 14, 2026' },
    { tag: 'Admin · 5 min',   title: 'AI tools for school administration',                 date: 'Feb 28, 2026' },
    { tag: 'HR · 6 min',      title: 'AI tools for HR &amp; purchasing',                     date: 'Feb 14, 2026' },
    { tag: 'Finance · 5 min', title: 'AI tools for the school finance department',        date: 'Jan 30, 2026' },
  ];
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="page">
      <Nav active="blog" />

      {/* HERO */}
      <section style={{ position: 'relative', padding: '64px 56px 96px', background: 'var(--c-cream)', color: 'var(--c-ink)', overflow: 'hidden', borderBottom: '1px solid var(--c-cream-2)' }}>
        <div className="container" style={{ paddingTop: 32 }}>
          <div className="eyebrow mb-32">flowlyst writing</div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            Notes from the office that <em>runs the district.</em>
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '52ch', marginBottom: 40 }}>
            Practical posts on AI, school finance, and modernization. By Aziz and the flowlyst team.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['All', 'AI Training', 'Budget Software', 'Consulting', 'General'].map((c, i) => (
              <span key={i} className={i === 0 ? 'chip chip--green' : 'chip'}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section">
        <div className="container">
          <a href="blog-post.html" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56, alignItems: 'center' }}>
              <div style={{ aspectRatio: '16/10', overflow: 'hidden', borderRadius: 4 }}>
                <BlogTileArt index={0}/>
              </div>
              <div>
                <span className="chip chip--green" style={{ marginBottom: 24 }}>Featured</span>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fl-green-700)', marginBottom: 20 }}>{featured.tag}</div>
                <h2 className="h2" style={{ marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: featured.title }}/>
                <p className="p" style={{ marginBottom: 24, fontSize: 17 }}>
                  What's actually useful, what's hype, and the three workflows we'd automate first if we were back in your office tomorrow.
                </p>
                <div style={{ fontSize: 14, color: 'var(--c-ink-3)', marginBottom: 24 }}>by Aziz Aghayev · {featured.date}</div>
                <span className="btn btn--primary">Read post <ArrowRight/></span>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* GRID */}
      <section className="section section--cream">
        <div className="container">
          <SectionHead eyebrow="More writing" title={<>The <em>full archive.</em></>} maxWidth="20ch"/>
          <div className="grid-3">
            {rest.map((p, i) => (
              <a key={i} href="blog-post.html" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ background: '#fff', padding: 0, overflow: 'hidden' }}>
                  <BlogTileArt index={i + 1}/>
                  <div style={{ padding: 28 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fl-green-700)', marginBottom: 14 }}>{p.tag}</div>
                    <h3 className="h4" style={{ marginBottom: 14, fontSize: 18, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: p.title }}/>
                    <div style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>{p.date}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="section section--sage" style={{ padding: '120px 56px' }}>
        <div className="container" style={{ maxWidth: 720, textAlign: 'center' }}>
          <div className="eyebrow mb-32" style={{ justifyContent: 'center' }}>Newsletter</div>
          <h2 className="h2" style={{ marginBottom: 20 }}>Get our writing <em>in your inbox.</em></h2>
          <p className="lead" style={{ marginBottom: 32 }}>One email a month. AI in K-12, no fluff.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', maxWidth: 480, margin: '0 auto' }}>
            <input className="input" placeholder="you@district.k12.us" style={{ flex: 1 }}/>
            <button className="btn btn--primary">Subscribe</button>
          </div>
        </div>
      </section>

      <FinalCTA/>
      <Footer/>
    </div>
  );
}

// =====================================================
// BLOG POST
// =====================================================
function BlogPostPage() {
  return (
    <div className="page">
      <Nav active="blog" variant="light"/>

      {/* HEADER */}
      <article style={{ padding: '64px 56px 0' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, fontSize: 13, color: 'var(--c-ink-3)' }}>
            <a href="blog.html" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>← Blog</a>
            <span>·</span>
            <span style={{ color: 'var(--fl-green-700)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 11 }}>AI · 6 min read</span>
          </div>
          <h1 className="h1" style={{ marginBottom: 32, fontSize: 'clamp(40px, 5vw, 64px)' }}>
            AI tools for school business officials in <em>2026.</em>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <FounderAvatar size={48}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Aziz Aghayev</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>Founder &amp; Lead Consultant · Apr 22, 2026</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <span className="chip">Share</span>
              <span className="chip">LinkedIn</span>
            </div>
          </div>
          <div style={{ aspectRatio: '16/9', borderRadius: 4, overflow: 'hidden', marginBottom: 56 }}>
            <BlogTileArt index={0}/>
          </div>
        </div>
      </article>

      {/* BODY */}
      <section style={{ padding: '0 56px 80px' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.5, color: 'var(--c-ink)', marginBottom: 32 }}>
            What's actually useful, what's hype, and the three workflows we'd automate first if we were back in your office tomorrow.
          </p>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 24 }}>
            I spent fifteen years as a school business official. Every fall, a new wave of tools landed on my desk, each one promising to fix something I'd worked around with a spreadsheet. Most didn't.
          </p>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 24 }}>
            AI is different — but only if you start in the right place. Here are the three workflows I'd automate first if I were back in your office Monday morning.
          </p>
          <h2 className="h3" style={{ marginTop: 48, marginBottom: 20 }}>1. The board memo draft</h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 24 }}>
            This is the lowest-hanging fruit, and the one most CFOs I talk to are sleeping on. Feed your last three months of minutes, your variance report, and your current cash position into a structured prompt. You get a first-draft board memo in under a minute.
          </p>
          <div style={{ aspectRatio: '16/10', borderRadius: 4, overflow: 'hidden', marginBottom: 32 }}>
            <BlogTileArt index={1}/>
          </div>
          <h2 className="h3" style={{ marginTop: 32, marginBottom: 20 }}>2. The monthly variance summary</h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 24 }}>
            Your ERP probably gives you a variance table. It does not give you the sentence that goes in your email to the superintendent. AI bridges that gap reliably.
          </p>
          <h2 className="h3" style={{ marginTop: 32, marginBottom: 20 }}>3. AP triage</h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 24 }}>
            Vendor inboxes are full of routine questions that don't need a human first-touch. A simple classifier turns "every email needs review" into "review the 18% that actually matter."
          </p>
        </div>
      </section>

      {/* AUTHOR BIO */}
      <section className="section section--cream">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="card" style={{ background: '#fff', display: 'grid', gridTemplateColumns: '88px 1fr auto', gap: 24, alignItems: 'center', padding: 32 }}>
            <FounderAvatar size={88}/>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Aziz Aghayev</div>
              <div style={{ fontSize: 14, color: 'var(--c-ink-2)' }}>Former school CFO. Founder of flowlyst. Writes mostly about the things he wishes he'd known when he was running a district budget.</div>
            </div>
            <a href="#" className="btn btn--ghost btn--sm">All posts by Aziz <ArrowRight/></a>
          </div>
        </div>
      </section>

      {/* RELATED */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Keep reading" title={<>More <em>from the blog.</em></>} maxWidth="20ch"/>
          <div className="grid-3">
            {[1, 2, 0].map((idx, i) => (
              <a key={i} href="blog-post.html" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <BlogTileArt index={idx}/>
                  <div style={{ padding: 24 }}>
                    <h4 className="h4" style={{ marginBottom: 12, fontSize: 18 }}>Another flowlyst post · 0{i + 1}</h4>
                    <div style={{ fontSize: 12, color: 'var(--c-ink-3)' }}>Apr 2026 · 6 min read</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA/>
      <Footer/>
    </div>
  );
}

// =====================================================
// TESTIMONIALS
// =====================================================
function TestimonialsPage() {
  const cells = [
    { q: 'Monthly close went from three days to three hours. The board noticed in the next meeting.', who: 'Director of Business Services', dist: 'WSPS', tag: 'Budget Software' },
    { q: 'The first AI session that gave my staff something they actually used the next day.', who: 'Superintendent', dist: 'CPS', tag: 'AI Training' },
    { q: 'Our HR team stopped re-keying forms. That alone bought back a week per month.', who: 'HR Director', dist: 'BSD', tag: 'Consulting' },
    { q: 'They built what we asked for, then taught us how to maintain it.', who: 'Asst. Superintendent', dist: 'Regional district', tag: 'Consulting', video: true },
    { q: 'flowlyst feels like a colleague, not a vendor.', who: 'CFO', dist: 'WSPS', tag: 'Budget Software' },
    { q: 'Our staff used to dread budget season. They don\'t anymore.', who: 'Business Manager', dist: 'BSD', tag: 'Budget Software' },
    { q: 'The toolkit they left us is still in active rotation eight months later.', who: 'Technology Director', dist: 'CPS', tag: 'AI Training' },
    { q: 'Aziz\'s keynote re-set how our board thinks about AI.', who: 'Board Chair', dist: 'Regional district', tag: 'Keynotes' },
    { q: 'We replaced five spreadsheets and two web apps in the first month.', who: 'Director of Finance', dist: 'WSPS', tag: 'Budget Software' },
  ];

  return (
    <div className="page">
      <Nav/>
      <section style={{ position: 'relative', padding: '64px 56px 96px', background: 'var(--c-cream)', color: 'var(--c-ink)', overflow: 'hidden', borderBottom: '1px solid var(--c-cream-2)' }}>
        <div className="container" style={{ paddingTop: 32 }}>
          <div className="eyebrow mb-32">In their own words</div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            What districts say <em>about flowlyst.</em>
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '54ch', marginBottom: 40 }}>
            Filterable by service and role. CMS-driven — new testimonials appear without a redeploy.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="chip chip--green">All</span>
            {['Budget Software', 'AI Training', 'Consulting', 'Keynotes'].map((c, i) => <span key={i} className="chip">{c}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--c-ink-3)', alignSelf: 'center', fontWeight: 700 }}>By role:</span>
            {['Superintendent', 'CFO / Business Manager', 'HR Director', 'Tech Director'].map((c, i) => <span key={i} className="chip">{c}</span>)}
          </div>
        </div>
      </section>

      <section className="section section--cream">
        <div className="container">
          <div className="grid-3">
            {cells.map((t, i) => (
              <div key={i} className="card" style={{ padding: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fl-green-700)', marginBottom: 20 }}>{t.tag}</div>
                {t.video && (
                  <div style={{ aspectRatio: '16/10', background: 'var(--c-forest)', borderRadius: 4, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--fl-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>▶</div>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 0.5, color: 'var(--fl-green)', marginBottom: 16 }}>"</div>
                <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.45, margin: '0 0 24px', color: 'var(--c-ink)' }}>{t.q}</p>
                <div style={{ paddingTop: 16, borderTop: '1px solid var(--c-cream-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: 'linear-gradient(135deg, #3a4a40, #1a2520)', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{t.who}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-ink-3)' }}>{t.dist}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA/>
      <Footer/>
    </div>
  );
}

// =====================================================
// CASE STUDIES
// =====================================================
function CaseStudiesPage() {
  const cases = [
    { dist: 'WSPS', tag: 'Consulting · Finance', t: 'Monthly report automation', stat: '3 days → 3 hours', summary: 'End-to-end automation of monthly financial report assembly cut a 3-day workflow to 3 hours, freeing the business office for forecasting work.', impl: '6 weeks', size: '~12,000 students' },
    { dist: 'BSD', tag: 'Consulting · HR', t: 'HR form review redesign', stat: '70% reduction', summary: 'Reclassified routine form submissions through an AI triage layer; HR review queue dropped 70% in eight weeks.', impl: '8 weeks', size: '~8,000 students' },
    { dist: 'CPS', tag: 'AI Training', t: 'District-wide AI literacy rollout', stat: '2,000+ trained', summary: 'Three-month rolling training program took the entire district central office and school leadership through hands-on AI workflows.', impl: '12 weeks', size: '~22,000 students' },
  ];
  return (
    <div className="page">
      <Nav/>
      <section style={{ position: 'relative', padding: '64px 56px 96px', background: 'var(--c-cream)', color: 'var(--c-ink)', overflow: 'hidden', borderBottom: '1px solid var(--c-cream-2)' }}>
        <div className="container" style={{ paddingTop: 32 }}>
          <div className="eyebrow mb-32">Long-form district stories</div>
          <h1 className="h1" style={{ marginBottom: 32, maxWidth: 1100 }}>
            How districts ship <em>faster</em> with flowlyst.
          </h1>
          <p className="lead" style={{ fontSize: 22, maxWidth: '54ch' }}>
            Challenge → solution → results, with the metrics and the names of the people who lived it.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gap: 24 }}>
            {cases.map((cs, i) => (
              <a key={i} href="#" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, padding: 0, overflow: 'hidden' }}>
                  <div style={{ background: i % 3 === 0 ? 'var(--fl-green)' : i % 3 === 1 ? 'var(--c-forest)' : 'var(--c-cream)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 40, color: i % 3 === 1 ? '#fff' : i % 3 === 0 ? '#fff' : 'var(--c-ink)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>{cs.dist}</div>
                    <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 24 }}>{cs.stat}</div>
                  </div>
                  <div style={{ padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="eyebrow mb-16" style={{ marginBottom: 16 }}>{cs.tag}</div>
                    <h3 className="h3" style={{ marginBottom: 16 }}>{cs.t}</h3>
                    <p className="p" style={{ marginBottom: 24, fontSize: 16 }}>{cs.summary}</p>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                      <span className="chip">Implementation: {cs.impl}</span>
                      <span className="chip">{cs.size}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fl-green-700)' }}>Read the full case <ArrowRight/></span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA/>
      <Footer/>
    </div>
  );
}

// =====================================================
// REQUEST A DEMO
// =====================================================
function RequestDemoPage() {
  return (
    <div className="page">
      <Nav variant="light"/>
      <section style={{ padding: '64px 56px 96px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 80, alignItems: 'flex-start' }}>
            <div style={{ position: 'sticky', top: 100 }}>
              <div className="eyebrow mb-32">30-minute walkthrough</div>
              <h1 className="h1" style={{ marginBottom: 24, fontSize: 'clamp(44px, 5vw, 72px)' }}>
                See flowlyst on <em>your district's</em> data.
              </h1>
              <p className="lead" style={{ marginBottom: 40 }}>
                A 30-minute walkthrough with someone who's done your job. Personalized, not a generic vendor demo.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16, marginBottom: 40 }}>
                {[
                  'No slide deck — we open the product and show you',
                  'Tailored to your district size and priorities',
                  "Aziz or a senior consultant on the call",
                  '1-week typical implementation if it\'s a fit',
                ].map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: 17 }}>
                    <span style={{ color: 'var(--fl-green)', fontWeight: 800, fontSize: 20 }}>✦</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div style={{ padding: 24, background: 'var(--c-cream)', borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--fl-green-700)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Average response</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Same business day, from Aziz or a senior consultant.</div>
              </div>
            </div>

            <form className="card" style={{ padding: 40 }}>
              <div className="form-row form-row--2">
                <div className="field"><label className="field__label">Full name *</label><input className="input"/></div>
                <div className="field"><label className="field__label">Title *</label><input className="input"/></div>
              </div>
              <div className="form-row form-row--2">
                <div className="field"><label className="field__label">District / org *</label><input className="input"/></div>
                <div className="field"><label className="field__label">Work email *</label><input className="input" type="email"/></div>
              </div>
              <div className="form-row form-row--2">
                <div className="field"><label className="field__label">Phone *</label><input className="input" type="tel"/></div>
                <div className="field"><label className="field__label">Date preference *</label><input className="input" type="date"/></div>
              </div>
              <div className="field" style={{ marginBottom: 24 }}>
                <label className="field__label">Interests · multi-select</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {['AI Training', 'Budget Software', 'Consulting', 'Keynotes'].map((c, i) => (
                    <label key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <input type="checkbox" style={{ accentColor: 'var(--fl-green)' }}/>
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ padding: 20, background: 'var(--c-cream)', borderRadius: 4, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Optional — helps us tailor the call</div>
                <div className="form-row form-row--2">
                  <div className="field"><label className="field__label">District size</label><input className="input" placeholder="Students or schools"/></div>
                  <div className="field">
                    <label className="field__label">How did you hear?</label>
                    <select className="select">
                      <option>—</option>
                      <option>Google search</option>
                      <option>AI assistant (ChatGPT, Claude, etc.)</option>
                      <option>Referral</option>
                      <option>Event or conference</option>
                      <option>LinkedIn / social</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label className="field__label">Anything else?</label>
                  <textarea className="textarea"/>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, fontSize: 13, color: 'var(--c-ink-2)' }}>
                <input type="checkbox" style={{ marginTop: 2, accentColor: 'var(--fl-green)' }}/>
                <span>I agree to flowlyst's privacy policy and to be contacted about my demo request.</span>
              </label>
              <div style={{ padding: 16, border: '1.5px dashed rgba(0,0,0,0.18)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--c-ink-3)', marginBottom: 20 }}>reCAPTCHA</div>
              <button type="button" className="btn btn--primary btn--lg" style={{ width: '100%' }}>Request demo <ArrowRight/></button>
            </form>
          </div>
        </div>
      </section>
      <Footer/>
    </div>
  );
}

// =====================================================
// CONTACT
// =====================================================
function ContactPage() {
  return (
    <div className="page">
      <Nav variant="light"/>
      <section style={{ padding: '64px 56px 120px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
            <div>
              <div className="eyebrow mb-32">Get in touch</div>
              <h1 className="h1" style={{ marginBottom: 24, fontSize: 'clamp(44px, 5vw, 72px)' }}>
                Not ready for a demo? <em>Drop us a line.</em>
              </h1>
              <p className="lead" style={{ marginBottom: 48 }}>
                For press, partnerships, training questions, support, or anything else that doesn't fit a demo form.
              </p>
              <div style={{ display: 'grid', gap: 24 }}>
                {[
                  ['Email',             'info@flowlyst.io'],
                  ['Demo requests',     'request-demo.html'],
                  ['Speaking inquiries', 'keynotes.html'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <form className="card" style={{ padding: 40 }}>
              <div className="form-row"><div className="field"><label className="field__label">Name</label><input className="input"/></div></div>
              <div className="form-row"><div className="field"><label className="field__label">Work email</label><input className="input" type="email"/></div></div>
              <div className="form-row">
                <div className="field">
                  <label className="field__label">Reason</label>
                  <select className="select">
                    <option>Choose…</option>
                    <option>Press</option>
                    <option>Partnership</option>
                    <option>Training question</option>
                    <option>Support</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row"><div className="field"><label className="field__label">Message</label><textarea className="textarea" style={{ minHeight: 140 }}/></div></div>
              <div style={{ padding: 16, border: '1.5px dashed rgba(0,0,0,0.18)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--c-ink-3)', marginBottom: 20 }}>reCAPTCHA</div>
              <button type="button" className="btn btn--primary btn--lg" style={{ width: '100%' }}>Send message</button>
            </form>
          </div>
        </div>
      </section>
      <Footer/>
    </div>
  );
}

// =====================================================
// LEGAL (Privacy / Terms / Cookies template)
// =====================================================
function LegalPage({ doc = 'privacy' }) {
  const docs = {
    privacy: { title: 'Privacy policy', sub: "How we collect, use, and protect data from people who use flowlyst's site and services." },
    terms:   { title: 'Terms of service', sub: 'The rules that govern your use of flowlyst.' },
    cookies: { title: 'Cookie policy', sub: 'How we use cookies and similar technologies.' },
  };
  const cur = docs[doc] || docs.privacy;
  return (
    <div className="page">
      <Nav variant="light"/>
      <section style={{ padding: '56px 56px 120px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 80, alignItems: 'flex-start' }}>
            <aside style={{ position: 'sticky', top: 100 }}>
              <div className="eyebrow mb-24">Legal</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, fontSize: 14, fontWeight: 700 }}>
                {[
                  ['privacy', 'Privacy policy', 'privacy.html'],
                  ['terms',   'Terms of service', 'terms.html'],
                  ['cookies', 'Cookie policy', 'cookies.html'],
                ].map(([k, n, href]) => (
                  <li key={k}>
                    <a href={href} style={{ display: 'block', paddingLeft: 12, borderLeft: '2px solid ' + (doc === k ? 'var(--fl-green)' : 'var(--c-cream-2)'), color: doc === k ? 'var(--c-ink)' : 'var(--c-ink-3)', textDecoration: 'none' }}>
                      {n}
                    </a>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 32, fontSize: 12, color: 'var(--c-ink-3)' }}>Last updated · May 2026</div>
            </aside>
            <div style={{ maxWidth: 720 }}>
              <h1 className="h1" style={{ marginBottom: 24, fontSize: 'clamp(40px, 5vw, 64px)' }}>{cur.title}</h1>
              <p className="lead" style={{ marginBottom: 48 }}>{cur.sub}</p>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 40 }}>
                  <h2 className="h3" style={{ marginBottom: 16 }}>{['Overview', 'What we collect', 'How we use it', 'Sharing', 'Your rights'][i]}</h2>
                  {[1, 2].map((p) => (
                    <p key={p} style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--c-ink)', marginBottom: 14 }}>
                      Body paragraph {p}. Each legal section is several paragraphs of plain-English copy. Headings styled like the rest of the site — no heavy "legalese" presentation. Long-form copy owned by legal counsel.
                    </p>
                  ))}
                </div>
              ))}
              <div style={{ padding: 24, background: 'var(--c-cream)', borderRadius: 4, fontSize: 14, color: 'var(--c-ink-2)' }}>
                Questions about this policy? Email <strong>info@flowlyst.io</strong>.
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer/>
    </div>
  );
}

Object.assign(window, {
  AboutPage, BlogIndexPage, BlogPostPage, TestimonialsPage, CaseStudiesPage,
  RequestDemoPage, ContactPage, LegalPage, FounderPortrait,
});
