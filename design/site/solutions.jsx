// solutions.jsx — 4 solution pages in Direction C style
// Components: BudgetPage, TrainingPage, ConsultingPage, KeynotesPage

// =====================================================
// Shared solution-page hero
// =====================================================
function SolutionHero({ eyebrow, title, lead, primaryCta, primaryHref, secondaryCta, secondaryHref, badges = [], visual }) {
  return (
    <section style={{
      position: 'relative',
      padding: '64px 56px 96px',
      background: 'var(--c-cream)',
      color: 'var(--c-ink)',
      overflow: 'hidden',
      borderBottom: '1px solid var(--c-cream-2)',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 85% -10%, rgba(0,165,104,0.10) 0%, transparent 55%)'
      }}/>
      <MarkBig size={620} opacity={0.025} style={{ right: -120, top: 60 }} />
      <div className="container" style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 64, alignItems: 'center', paddingTop: 48 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 32 }}>{eyebrow}</div>
            <h1 className="h1" style={{ marginBottom: 32, fontSize: 'clamp(48px, 5.5vw, 88px)' }}>{title}</h1>
            <p className="lead" style={{ fontSize: 21, marginBottom: 36 }}>{lead}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <a href={primaryHref} className="btn btn--primary btn--lg">{primaryCta} <ArrowRight/></a>
              {secondaryCta && <a href={secondaryHref} className="btn btn--ghost btn--lg">{secondaryCta}</a>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {badges.map((b, i) => <span key={i} className="chip">{b}</span>)}
            </div>
          </div>
          <div>{visual}</div>
        </div>
      </div>
    </section>
  );
}

// =====================================================
// BUDGET SOFTWARE
// =====================================================
function BudgetPage() {
  return (
    <div className="page">
      <Nav active="budget" />
      <SolutionHero
        eyebrow="Budget Software · K-12"
        title={<>Many tools. <em>One platform.</em></>}
        lead="Centralize your district's budgeting workflow without ripping out your ERP. flowlyst Software fills the gaps your ERP leaves open."
        primaryCta="Request a demo"
        primaryHref="request-demo.html"
        secondaryCta="See pricing on a call"
        secondaryHref="contact.html"
        badges={['1-week implementation', 'No IT lift', 'Built by former school CFOs']}
        visual={<ProductMock />}
      />

      {/* SUPPLEMENTARY MESSAGE — flagship positioning */}
      <section className="section section--cream">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="eyebrow mb-32">Built to add, not replace</div>
              <h2 className="h2" style={{ marginBottom: 32 }}>flowlyst <em>adds</em> to your stack. It doesn't fight it.</h2>
              <p className="lead" style={{ marginBottom: 20 }}>We don't ask you to migrate, retrain, or fight procurement. flowlyst is supplementary to your ERP — it fills the budgeting gap your ERP was never going to give you.</p>
              <p className="p" style={{ fontSize: 17 }}>Sync to your GL. Keep your ERP. Add real budgeting on top.</p>
            </div>
            <ERPDiagram />
          </div>
        </div>
      </section>

      {/* MODULES — tabular grid */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="What's in the platform"
            title={<>Eight workflows. <em>One source of truth.</em></>}
            kicker="Illustrative — the platform keeps growing. Module list is CMS-driven and updated as we ship."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, border: '1px solid var(--c-cream-2)' }}>
            {[
              ['01', 'Department-level entry', 'Guided, menu-free interface. Anyone in your district can build a budget without ERP training.'],
              ['02', 'Real-time tracking', 'Actuals vs. budget, by department, by line, with the variance the board will ask about.'],
              ['03', 'Color-coded reports', 'Board-ready, no Excel surgery. Export in seconds.'],
              ['04', 'Supervisor rollup', 'Roll department budgets into one supervisor view.'],
              ['05', 'Pre-built dashboards', 'Built by analysts and former school business officials. Available to every district.'],
              ['06', 'Fast table export', 'Any dataset, any time, in a format the auditor will accept.'],
              ['07', 'Salary projections', 'Multi-input scenarios for the question that always lands in your lap.'],
              ['08', 'AI budget analysis', 'Talk to your data. Ask the questions you currently dig through spreadsheets to answer. — Coming soon.'],
            ].map(([n, t, c], i) => (
              <div key={n} style={{
                padding: 36,
                borderRight: i % 2 === 0 ? '1px solid var(--c-cream-2)' : 'none',
                borderBottom: i < 6 ? '1px solid var(--c-cream-2)' : 'none',
                background: '#fff',
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fl-green-700)', marginBottom: 16, letterSpacing: '0.06em' }}>{n}</div>
                <h3 className="h4" style={{ marginBottom: 12, fontSize: 22 }}>{t}</h3>
                <p className="p" style={{ fontSize: 15 }}>{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE PROMISES — green band */}
      <section className="section--green" style={{ padding: '120px 56px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
            {[
              ['1 wk',  'Average implementation. We mean it.'],
              ['1:1',   'Personalized onboarding sessions.'],
              ['CFOs',  'Support from school finance experts.'],
              ['$0',    'IT staff required. No hidden fees.'],
            ].map(([n, l], i) => (
              <div key={i} style={{ borderLeft: '2px solid rgba(255,255,255,0.4)', paddingLeft: 24 }}>
                <div style={{ fontSize: 64, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em' }}>{n}</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 16, lineHeight: 1.5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TESTIMONIAL */}
      <section className="section section--sage">
        <div className="container" style={{ maxWidth: 980, textAlign: 'center' }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 0.5, color: 'var(--fl-green)', marginBottom: 32 }}>"</div>
          <blockquote className="pull" style={{ margin: '0 auto 40px', maxWidth: '24ch' }}>
            We replaced five spreadsheets and two web apps in our first month. The board got their reports a day earlier than expected.
          </blockquote>
          <div style={{ fontSize: 13, color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 800 }}>
            Director of Business Services · WSPS
          </div>
        </div>
      </section>

      <FinalCTA />
      <Footer />
    </div>
  );
}

// "ERP + flowlyst" diagram
function ERPDiagram() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--c-cream-2)', borderRadius: 4, padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, padding: '20px 16px', background: 'var(--c-cream)', border: '1.5px dashed rgba(0,0,0,0.18)', borderRadius: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Your stack</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-ink)' }}>ERP</div>
        </div>
        <div style={{ fontSize: 24, color: 'var(--fl-green)', fontWeight: 800 }}>+</div>
        <div style={{ flex: 1, padding: '20px 16px', background: 'var(--fl-green)', borderRadius: 4, textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6, opacity: 0.85 }}>Add</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>flowlyst</div>
        </div>
      </div>
      <div style={{ borderTop: '1px dashed var(--c-cream-2)', paddingTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>flowlyst adds</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {['Department-level budget entry', 'Real-time variance tracking', 'Board-ready reports', 'Salary projection scenarios'].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, fontWeight: 600 }}>
              <span className="accent" style={{ fontWeight: 800 }}>✦</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// AI TRAINING
// =====================================================
function TrainingPage() {
  return (
    <div className="page">
      <Nav active="training" />
      <SolutionHero
        eyebrow="AI Training · for District Leadership and Staff"
        title={<>AI training that <em>sticks the next day.</em></>}
        lead="Customized workshops for the office that runs the district. Designed for K-12 leaders — adaptable to other organizations."
        primaryCta="Book a 15-min discussion"
        primaryHref="contact.html"
        secondaryCta="See sample agenda"
        secondaryHref="#agenda"
        badges={['100% satisfaction', '2,000+ leaders trained', '500+ hours saved']}
        visual={<TrainingHeroArt />}
      />

      {/* AUDIENCES */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Who's in the room"
            title={<>For the office that <em>runs the district</em> — not for students.</>}
            kicker="Training is for administrators, leaders, and operational staff. Districts can bring school-level staff (principals, teachers) when relevant."
          />
          <div className="grid-4">
            {[
              { t: 'Superintendents', s: 'Asst. supts & chiefs of staff' },
              { t: 'Business managers', s: 'CFOs and finance teams' },
              { t: 'HR & IT', s: 'Directors and operational leads' },
              { t: 'Principals', s: 'School-level instructional leaders' },
            ].map((a, i) => (
              <div key={i} className="card">
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fl-green-700)', marginBottom: 12, letterSpacing: '0.08em' }}>0{i + 1}</div>
                <h3 className="h4" style={{ marginBottom: 8 }}>{a.t}</h3>
                <p className="p" style={{ fontSize: 14 }}>{a.s}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: 24, background: 'var(--c-cream)', borderRadius: 4, fontSize: 14, color: 'var(--c-ink-2)' }}>
            <strong>Adjacent:</strong> roughly 10% of training clients are non-K-12 organizations. We adapt the curriculum without changing the depth.
          </div>
        </div>
      </section>

      {/* FORMATS — tabular */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Delivery formats"
            title={<>How training <em>runs.</em></>}
          />
          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {[
              { num: '01', tag: 'Half / full day', title: 'Single workshop', copy: 'One workshop, deep on one theme. Best for a half-day PD slot.' },
              { num: '02', tag: 'Webinar series', title: 'Multi-session paced',  copy: 'Sessions paced over weeks. Better retention; works around district calendars.' },
              { num: '03', tag: 'Institute',      title: 'Summer/fall institute', copy: 'Custom multi-day packages. Departmental tracks, optional certification.' },
              { num: '04', tag: 'In-person · virtual · hybrid', title: 'Whatever your district needs', copy: 'We meet you where the district is. Hybrid is increasingly the default.' },
            ].map((o) => (
              <div key={o.num} className="t-row t-row--light">
                <div className="t-row__num">{o.num}</div>
                <div className="t-row__tag">{o.tag}</div>
                <div>
                  <h3 className="t-row__title">{o.title}</h3>
                  <p className="t-row__copy">{o.copy}</p>
                </div>
                <div/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="section section--cream">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="eyebrow mb-32">Every session ships with</div>
              <h2 className="h2" style={{ marginBottom: 40 }}>Hands-on. <em>No fluff.</em></h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 20 }}>
                {[
                  ['Customized content', 'Finance, HR, IT, leadership — district picks the focus.'],
                  ['Real-world use cases', 'Automating reports. Writing AI prompts. Analyzing data your staff actually has.'],
                  ['Hands-on delivery', 'Laptops out. We build things together; you leave with completed work.'],
                  ['Post-training toolkit', 'Printable guides + prompt templates licensed for the whole district.'],
                ].map(([t, c], i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--fl-green)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>✓</span>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{t}</div>
                      <div className="p" style={{ fontSize: 15 }}>{c}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <TrainingToolkitArt />
          </div>
        </div>
      </section>

      {/* SAMPLE AGENDA */}
      <section id="agenda" className="section">
        <div className="container">
          <SectionHead
            eyebrow="Sample · half-day"
            title={<>What <em>four hours</em> looks like.</>}
          />
          <div style={{ display: 'grid', gap: 0, maxWidth: 900, margin: '0 auto', borderTop: '1px solid var(--c-cream-2)' }}>
            {[
              ['9:00 – 9:30',  'AI in K-12', 'Where it is, where it isn\'t — without the marketing.'],
              ['9:30 – 10:30', 'Hands-on prompt building', 'Write a prompt that drafts a board memo from your last set of minutes.'],
              ['10:30 – 10:45', 'Break', 'Coffee. We tell you the one thing we changed last week.'],
              ['10:45 – 12:00', 'Use case clinic', 'Bring a problem from your office. We map automation paths together.'],
              ['12:00 – 12:30', 'Toolkit handoff + 30-day plan', 'Prompt cards, follow-up calendar, your district\'s next three moves.'],
            ].map(([time, title, desc], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 32, padding: '28px 0', borderBottom: '1px solid var(--c-cream-2)' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--c-ink-3)', fontWeight: 700, paddingTop: 4 }}>{time}</div>
                <div>
                  <h4 className="h4" style={{ marginBottom: 6 }}>{title}</h4>
                  <p className="p" style={{ fontSize: 15 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
      <Footer />
    </div>
  );
}

function TrainingHeroArt() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--c-cream-2)', borderRadius: 4, padding: 32, boxShadow: '0 24px 60px -16px rgba(14,20,16,0.10)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fl-green-700)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 24 }}>Workshop · live</div>
      {[
        { name: 'Superintendent', task: 'Drafting a 3-month AI rollout', dur: '12 min', done: true },
        { name: 'CFO', task: 'Prompt: monthly variance summary', dur: '18 min', done: true },
        { name: 'HR Director', task: 'Auto-classifying form submissions', dur: 'In progress', done: false },
        { name: 'IT Director', task: 'Setting up the prompt library', dur: 'Up next', done: false },
      ].map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: i === 0 ? '1px solid var(--c-line-2)' : 'none', borderBottom: '1px solid var(--c-line-2)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-ink)' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--c-ink-2)', marginTop: 2 }}>{p.task}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: p.done ? 'var(--fl-green-700)' : 'var(--c-ink-3)' }}>{p.dur}</div>
        </div>
      ))}
    </div>
  );
}

function TrainingToolkitArt() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--c-cream-2)', borderRadius: 4, padding: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fl-green-700)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 24 }}>Post-training toolkit</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { t: 'Board memo prompt', tag: 'Finance' },
          { t: 'Meeting summary', tag: 'Admin' },
          { t: 'Policy redline', tag: 'HR' },
          { t: 'Data Q&A starter', tag: 'Ops' },
          { t: 'Vendor email triage', tag: 'AP' },
          { t: 'Grant narrative draft', tag: 'Grants' },
        ].map((c, i) => (
          <div key={i} style={{ padding: 16, background: 'var(--c-cream)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--fl-green-700)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{c.tag}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// CONSULTING
// =====================================================
function ConsultingPage() {
  return (
    <div className="page">
      <Nav active="consulting" />
      <SolutionHero
        eyebrow="AI &amp; Automation Consulting"
        title={<>Peer-to-peer consulting from <em>former school CFOs.</em></>}
        lead="Hands-on engagements that map and automate routine work across district operations. Not generalist ed-tech — operators who used to run your office."
        primaryCta="Free 30-min assessment"
        primaryHref="contact.html"
        secondaryCta="See case studies"
        secondaryHref="case-studies.html"
        badges={['98% rollout satisfaction', 'Embedded engineers', 'McKinsey-style depth']}
        visual={<ConsultingHeroArt />}
      />

      {/* TWO ENGAGEMENT MODES */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Two ways to engage"
            title={<>Pick one. Or <em>start small</em> and grow into the other.</>}
          />
          <div className="grid-2" style={{ gap: 24 }}>
            {[
              {
                num: '01', tag: 'Mode 1', title: 'Targeted automation projects',
                copy: 'A specific routine task or workflow gets automated end-to-end. We design, implement, and train your team. Best for districts with one or two clear pain points.',
                points: ['Scoped engagement', 'Implementation + training', 'Hand-off to your team']
              },
              {
                num: '02', tag: 'Mode 2', title: 'Full automation consulting',
                copy: 'McKinsey-style depth. We map routine tasks across departments, design the long-term roadmap, and embed an engineer who delivers and maintains. For districts that want systematic transformation.',
                points: ['Cross-department mapping', 'Multi-year roadmap', 'Embedded engineer']
              },
            ].map((m) => (
              <div key={m.num} className="card" style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                  <div className="eyebrow">{m.tag}</div>
                  <div style={{ fontSize: 40, fontWeight: 300, color: 'rgba(0,0,0,0.18)', lineHeight: 1, letterSpacing: '-0.03em' }}>{m.num}</div>
                </div>
                <h3 className="h3" style={{ marginBottom: 16 }}>{m.title}</h3>
                <p className="p" style={{ marginBottom: 28, fontSize: 16 }}>{m.copy}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10, borderTop: '1px solid var(--c-cream-2)', paddingTop: 24 }}>
                  {m.points.map((p, j) => (
                    <li key={j} style={{ display: 'flex', gap: 12, fontSize: 14, fontWeight: 600 }}>
                      <span className="accent" style={{ fontWeight: 800 }}>→</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTMENTS SERVED */}
      <section className="section section--cream">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="eyebrow mb-32">Departments served</div>
              <h2 className="h2" style={{ marginBottom: 32 }}>If it's <em>routine and repeatable,</em> it's in scope.</h2>
              <p className="lead">Every central office function and its school-level extensions. We target the pattern of routine work — not a particular department.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, background: '#fff', borderRadius: 4, border: '1px solid var(--c-cream-2)' }}>
              {[
                'HR', 'Business Office',
                "Superintendent's Office", 'Instructional leaders',
                'Accounts Payable', 'Accounts Receivable',
                'Payroll · Benefits', 'And the rest of the office',
              ].map((d, i) => (
                <div key={i} style={{
                  padding: '22px 24px',
                  fontSize: 16, fontWeight: 700,
                  borderRight: i % 2 === 0 ? '1px solid var(--c-cream-2)' : 'none',
                  borderBottom: i < 6 ? '1px solid var(--c-cream-2)' : 'none',
                }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* USE-CASE PROOF — stat-led cards */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="What we've shipped"
            title={<>The numbers <em>districts report back</em> to us.</>}
          />
          <div className="grid-3">
            {[
              { num: '3 days → 3 hrs', t: 'Monthly report prep', c: 'End-to-end automation of financial report assembly at one district.' },
              { num: '70%',           t: 'HR form review',      c: 'Redundant review cut at a regional district through workflow redesign.' },
              { num: '98%',           t: 'Rollout satisfaction', c: 'AI consulting engagements rated across districts and departments.' },
            ].map((u, i) => (
              <div key={i} className="card">
                <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--fl-green)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 24 }}>{u.num}</div>
                <h3 className="h4" style={{ marginBottom: 12, fontSize: 20 }}>{u.t}</h3>
                <p className="p" style={{ fontSize: 14 }}>{u.c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS — numbered horizontal */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Process"
            title={<>How an <em>engagement</em> runs.</>}
          />
          <div className="grid-4">
            {[
              ['Assess', '30-min free intro call. We listen, you sketch the pain.'],
              ['Map',    'We sit with your team. Document the current workflow.'],
              ['Build',  'Design and implement the automation. Iterate weekly.'],
              ['Embed',  'Hand-off (Mode 1) or embedded engineer (Mode 2).'],
            ].map(([t, c], i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ fontSize: 64, fontWeight: 300, color: 'var(--c-cream-2)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 12 }}>0{i + 1}</div>
                <h3 className="h4" style={{ marginBottom: 12, fontSize: 22 }}>{t}</h3>
                <p className="p" style={{ fontSize: 15 }}>{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
      <Footer />
    </div>
  );
}

function ConsultingHeroArt() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--c-cream-2)', borderRadius: 4, padding: 32, boxShadow: '0 24px 60px -16px rgba(14,20,16,0.10)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fl-green-700)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 24 }}>Automation map · sample</div>
      {[
        ['HR onboarding',      85, 'Live'],
        ['AP invoice triage',  62, 'Building'],
        ['Monthly close',     100, 'Live'],
        ['Grant reporting',    30, 'Mapping'],
        ['Board memo draft',   45, 'Designing'],
      ].map(([t, pct, status], i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-ink)' }}>{t}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: status === 'Live' ? 'var(--fl-green-700)' : 'var(--c-ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{status}</span>
          </div>
          <div style={{ height: 6, background: 'var(--c-cream)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--fl-green)', borderRadius: 2 }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// KEYNOTES
// =====================================================
function KeynotesPage() {
  return (
    <div className="page">
      <Nav active="keynotes" />
      <SolutionHero
        eyebrow="Keynotes &amp; conference sessions"
        title={<>A keynote on AI in K-12, <em>from someone who's rolled it out.</em></>}
        lead="Aziz Aghayev speaks at state and national association events on AI for K-12 administrators, school finance modernization, and district operations."
        primaryCta="Submit a speaking request"
        primaryHref="#request"
        secondaryCta="See sample reel"
        secondaryHref="#"
        badges={['ASBO International', 'NJASBO · CPS', '3-day response']}
        visual={<KeynoteHeroArt />}
      />

      {/* PAST VENUES */}
      <section className="section section--cream">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ justifyContent: 'center' }}>Past venues</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, border: '1px solid var(--c-cream-2)' }}>
            {[
              'ASBO International',
              'NJASBO',
              'CPS Annual',
              'AASA',
              'Regional PD',
            ].map((v, i) => (
              <div key={i} style={{
                padding: '40px 16px',
                textAlign: 'center',
                background: '#fff',
                borderRight: i < 4 ? '1px solid var(--c-cream-2)' : 'none',
                fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em',
              }}>
                {v}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOPICS — tabular */}
      <section className="section section--cream">
        <div className="container">
          <SectionHead
            eyebrow="Topics"
            title={<>What Aziz <em>speaks on.</em></>}
          />
          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {[
              { num: '01', tag: '45–60 min', title: 'AI for K-12 school business officials', copy: 'Practical AI for the office that runs the district — without the marketing.' },
              { num: '02', tag: 'Keynote',  title: 'Automating district finance & ops', copy: 'What to automate first, what to leave alone, what comes next.' },
              { num: '03', tag: 'Workshop track', title: 'AI adoption for school leaders', copy: 'Policy, change management, and getting your team on board — from someone who has.' },
            ].map((o) => (
              <div key={o.num} className="t-row t-row--light">
                <div className="t-row__num">{o.num}</div>
                <div className="t-row__tag">{o.tag}</div>
                <div>
                  <h3 className="t-row__title">{o.title}</h3>
                  <p className="t-row__copy">{o.copy}</p>
                </div>
                <div/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="Who books these"
            title={<>Audiences we <em>speak to.</em></>}
          />
          <div className="grid-4">
            {[
              ['State & national associations', 'ASBO International, AASA, NSBA.'],
              ['District-hosted summits',     'Internal leadership convenings.'],
              ['Regional service-agency PD',  'County offices, ESCs, BOCES.'],
              ['School finance conferences',  'CPS, NJASBO, others.'],
            ].map(([t, c], i) => (
              <div key={i} className="card">
                <h3 className="h4" style={{ marginBottom: 8 }}>{t}</h3>
                <p className="p" style={{ fontSize: 14 }}>{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST FORM */}
      <section id="request" className="section section--cream">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow mb-32">Request a keynote</div>
              <h2 className="h2" style={{ marginBottom: 24 }}>Tell us about <em>your event.</em></h2>
              <p className="lead">We'll come back within 3 business days with availability and topic-fit. Aziz responds personally to event organizers.</p>
            </div>
            <form className="card" style={{ padding: 40 }}>
              <div className="form-row form-row--2">
                <div className="field"><label className="field__label">Event name *</label><input className="input"/></div>
                <div className="field"><label className="field__label">Event date *</label><input className="input"/></div>
              </div>
              <div className="form-row form-row--2">
                <div className="field"><label className="field__label">Audience size</label><input className="input"/></div>
                <div className="field"><label className="field__label">Budget range</label><input className="input"/></div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label className="field__label">Topic interest</label>
                <select className="select">
                  <option>AI for school business officials</option>
                  <option>Automating finance & ops</option>
                  <option>AI adoption for school leaders</option>
                  <option>Custom topic</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 24 }}>
                <label className="field__label">Anything else?</label>
                <textarea className="textarea"/>
              </div>
              <button type="button" className="btn btn--primary btn--lg" style={{ width: '100%' }}>Submit speaking request</button>
            </form>
          </div>
        </div>
      </section>

      <FinalCTA />
      <Footer />
    </div>
  );
}

function KeynoteHeroArt() {
  return (
    <div style={{ background: 'var(--c-forest-2)', border: '1px solid var(--c-forest-3)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ aspectRatio: '16/10', position: 'relative', background: 'linear-gradient(160deg, #1a221c 0%, #0e1410 100%)' }}>
        <svg viewBox="0 0 400 250" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <rect x="0" y="180" width="400" height="70" fill="rgba(0,165,104,0.08)"/>
          <rect x="60" y="160" width="280" height="20" fill="rgba(0,165,104,0.18)"/>
          <ellipse cx="200" cy="100" rx="55" ry="64" fill="rgba(255,210,170,0.25)"/>
          <path d="M 130 250 Q 130 170 200 162 Q 270 170 270 250 Z" fill="rgba(20,30,25,0.85)"/>
          <rect x="0" y="0" width="400" height="80" fill="url(#spotlight)"/>
          <defs>
            <radialGradient id="spotlight" cx="50%" cy="0" r="60%">
              <stop offset="0%" stopColor="rgba(255,233,160,0.35)"/>
              <stop offset="100%" stopColor="rgba(255,233,160,0)"/>
            </radialGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', bottom: 16, left: 20, color: 'rgba(244,241,232,0.55)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800 }}>
          ASBO International · Keynote
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  BudgetPage, TrainingPage, ConsultingPage, KeynotesPage,
  SolutionHero, ERPDiagram, TrainingHeroArt, TrainingToolkitArt,
  ConsultingHeroArt, KeynoteHeroArt,
});
