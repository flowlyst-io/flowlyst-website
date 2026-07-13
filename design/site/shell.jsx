// shell.jsx — shared wireframe components: nav, footer, section helpers
// All artboards reuse these so the IA stays consistent across pages.
// NOTE (pull-time): wireframe-stage reference — use for IA (nav items, footer
// columns, CTA placement). Visual truth is site.jsx + site.css (Direction C).

const Mark = ({ size = 24, white = false }) => (
  <img
    src="assets/flowlyst-mark.png"
    alt=""
    style={{
      width: size, height: size,
      filter: white ? 'brightness(0) invert(1)' : 'none',
      display: 'block'
    }}
  />
);

// Top nav — same on every marketing page
function WfNav({ active = '', sticky = false }) {
  const items = [
    { id: 'budget',     label: 'Budget Software' },
    { id: 'training',   label: 'AI Training' },
    { id: 'consulting', label: 'Consulting' },
    { id: 'keynotes',   label: 'Keynotes' },
    { id: 'about',      label: 'About' },
    { id: 'blog',       label: 'Blog' },
  ];
  return (
    <div className="wf-nav" style={sticky ? { position: 'sticky', top: 0, zIndex: 2 } : null}>
      <a href="#" className="wf-nav__brand">
        <Mark size={26} />
        <span>flowlyst</span>
      </a>
      <nav className="wf-nav__links">
        {items.map(it => (
          <a
            key={it.id}
            href="#"
            style={{
              fontWeight: active === it.id ? 700 : 500,
              borderBottom: active === it.id ? '2px solid var(--wf-accent)' : '2px solid transparent',
              paddingBottom: 2,
            }}
          >
            {it.label}
          </a>
        ))}
      </nav>
      <div className="wf-nav__cta">
        <a href="#" className="wf-link" style={{ borderBottom: 'none', fontSize: 13 }}>Contact</a>
        <button className="wf-btn wf-btn--primary wf-btn--sm">Request a demo</button>
      </div>
    </div>
  );
}

// Footer — same on every page; tall, dark, grouped link columns + final CTA
function WfFooter() {
  return (
    <footer className="wf-footer">
      <div className="wf-secLabel" style={{ background: '#2A2A2B', borderColor: '#3A3A3B', color: '#888' }}>FOOTER · same on every page</div>

      {/* Final CTA band */}
      <div style={{
        border: '1px solid #3A3A3B', borderRadius: 16, padding: 32,
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24,
        marginBottom: 56, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: 12 }}>Ready when you are</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.015em' }}>
            See flowlyst running on your district's budget.
          </div>
          <div style={{ fontSize: 14, color: '#A8A8A9', marginTop: 12, maxWidth: '52ch' }}>
            A 30-minute walkthrough with someone who's done your job. No slide deck required.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="wf-btn wf-btn--primary wf-btn--lg">Request a demo</button>
          <button className="wf-btn wf-btn--lg" style={{ borderColor: '#5A5A5B', color: '#E5E5E6' }}>Talk to Aziz</button>
        </div>
      </div>

      {/* Link columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Mark size={22} white />
            <span style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>flowlyst</span>
          </div>
          <p style={{ fontSize: 13, color: '#A8A8A9', margin: 0, maxWidth: '32ch', lineHeight: 1.6 }}>
            Built and delivered by the people who used to do your job.
          </p>
          <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>info@flowlyst.io</div>
        </div>
        <div>
          <h5>Solutions</h5>
          <ul>
            <li>Budget Software</li>
            <li>AI Training</li>
            <li>AI &amp; Automation Consulting</li>
            <li>Keynotes</li>
          </ul>
        </div>
        <div>
          <h5>Proof</h5>
          <ul>
            <li>Case studies</li>
            <li>Testimonials</li>
            <li>Blog</li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li>About</li>
            <li>Meet Aziz</li>
            <li>Contact</li>
            <li>Request a demo</li>
          </ul>
        </div>
        <div>
          <h5>Legal</h5>
          <ul>
            <li>Privacy</li>
            <li>Terms</li>
            <li>Cookies</li>
            <li>Accessibility</li>
          </ul>
        </div>
      </div>

      <div className="wf-footer__bottom">
        <span>© 2026 flowlyst, Inc.</span>
        <span>flowlyst.io · K-12 first</span>
      </div>
    </footer>
  );
}

// Common "trust signals" data (reused on home + various pages)
const TRUST_STATS = [
  { num: '100%',     lbl: 'workshop satisfaction across 2,000+ leaders trained' },
  { num: '500+',     lbl: 'admin hours saved through automation' },
  { num: '3 hrs',    lbl: 'monthly reports — down from 3 days at one district' },
  { num: '1 week',   lbl: 'average implementation, no IT lift' },
];
