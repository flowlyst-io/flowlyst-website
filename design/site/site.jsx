// site.jsx — shared chrome for the flowlyst site (Direction C, Nunito)
// Exports: Nav, Footer, FinalCTA, Section, Container, Mark, MarkBig, ArrowRight

const Mark = ({ size = 26, white = false, style = {} }) => (
  <img
    src="assets/flowlyst-mark.png"
    alt=""
    style={{
      width: size, height: size, display: 'block',
      filter: white ? 'brightness(0) invert(1)' : 'none',
      ...style,
    }}
  />
);

// Hero-scale floating mark
const MarkBig = ({ size = 720, opacity = 0.06, style = {} }) => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      width: size, height: size,
      opacity, pointerEvents: 'none',
      ...style,
    }}
  >
    <Mark size={size} white />
  </div>
);

const ArrowRight = ({ style = {} }) => (
  <span className="arr" style={{ display: 'inline-block', ...style }}>→</span>
);

const NAV_ITEMS = [
  { id: 'budget',     label: 'Budget Software', href: 'budget-software.html' },
  { id: 'training',   label: 'AI Training',     href: 'ai-training.html' },
  { id: 'consulting', label: 'Consulting',      href: 'consulting.html' },
  { id: 'keynotes',   label: 'Keynotes',        href: 'keynotes.html' },
  { id: 'about',      label: 'About',           href: 'about.html' },
  { id: 'blog',       label: 'Blog',            href: 'blog.html' },
];

function Nav({ active = '', variant = 'light' }) {
  const isDark = variant === 'dark';
  const [open, setOpen] = React.useState(false);
  return (
    <nav className={'nav' + (isDark ? ' nav--dark' : '')}>
      <a href="index.html" className={'nav__brand' + (isDark ? ' nav__brand--dark' : '')}>
        <Mark size={26} white={isDark} />
        <span>flowlyst</span>
      </a>
      <button
        className="nav__burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? '✕' : '☰'}
      </button>
      <div className={'nav__drawer' + (open ? ' is-open' : '')}>
        <div className="nav__links">
          {NAV_ITEMS.map(it => (
            <a key={it.id} href={it.href} className={active === it.id ? 'active' : ''}>{it.label}</a>
          ))}
        </div>
        <div className="nav__cta">
          <a href="contact.html" className="nav__signin">Contact</a>
          <a href="request-demo.html" className="btn btn--primary btn--sm">Request a demo</a>
        </div>
      </div>
    </nav>
  );
}

function FinalCTA() {
  return (
    <section className="section--green" style={{ padding: '160px 56px', textAlign: 'center' }}>
      <div className="container">
        <h2 className="h1" style={{ color: '#fff', marginBottom: 32, maxWidth: 1080, margin: '0 auto 32px' }}>
          See it run on <span className="accent--yellow">your district's</span> data.
        </h2>
        <p style={{ fontSize: 22, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', margin: '0 auto 48px', maxWidth: '52ch' }}>
          A 30-minute walkthrough with someone who's done your job. No slide deck required.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="request-demo.html" className="btn btn--dark btn--lg">Request a demo <ArrowRight/></a>
          <a href="about.html" className="btn btn--ghost-light btn--lg">Talk to Aziz</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__cta">
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fl-green)' }}>
              Ready when you are
            </div>
            <h3>See flowlyst running on <span className="accent">your district's</span> budget.</h3>
            <p>A 30-minute walkthrough with someone who's done your job. No slide deck required.</p>
          </div>
          <div className="footer__cta-actions">
            <a href="request-demo.html" className="btn btn--primary btn--lg">Request a demo</a>
            <a href="contact.html" className="btn btn--ghost-light btn--lg">Talk to Aziz</a>
          </div>
        </div>

        <div className="footer__cols">
          <div>
            <a href="index.html" className="footer__brand">
              <Mark size={24} white />
              <span>flowlyst</span>
            </a>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: '32ch', color: 'rgba(244,241,232,0.6)' }}>
              Built and delivered by the people who used to do your job.
            </p>
            <div style={{ marginTop: 18, fontSize: 13, color: 'rgba(244,241,232,0.5)' }}>info@flowlyst.io</div>
          </div>
          <div>
            <h5>Solutions</h5>
            <ul>
              <li><a href="budget-software.html">Budget Software</a></li>
              <li><a href="ai-training.html">AI Training</a></li>
              <li><a href="consulting.html">Consulting</a></li>
              <li><a href="keynotes.html">Keynotes</a></li>
            </ul>
          </div>
          <div>
            <h5>Proof</h5>
            <ul>
              <li><a href="testimonials.html">Testimonials</a></li>
              <li><a href="case-studies.html">Case studies</a></li>
              <li><a href="blog.html">Blog</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="about.html">About</a></li>
              <li><a href="about.html">Meet Aziz</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="request-demo.html">Request a demo</a></li>
            </ul>
          </div>
          <div>
            <h5>Legal</h5>
            <ul>
              <li><a href="privacy.html">Privacy</a></li>
              <li><a href="terms.html">Terms</a></li>
              <li><a href="cookies.html">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© 2026 flowlyst, Inc.</span>
          <span>flowlyst.io · K-12 first</span>
        </div>
      </div>
    </footer>
  );
}

// ---- Shared section heads ----
function SectionHead({ eyebrow, title, kicker, align = 'left', onDark = false, onGreen = false, accentText, maxWidth = '20ch' }) {
  const eyebrowClass = 'eyebrow' + (onDark ? ' eyebrow--on-dark' : '') + (onGreen ? ' eyebrow--on-green' : '');
  return (
    <div style={{ textAlign: align, marginBottom: 56 }}>
      {eyebrow && <div className={eyebrowClass} style={{ marginBottom: 32 }}>{eyebrow}</div>}
      <h2 className="h2" style={{ maxWidth, margin: align === 'center' ? '0 auto' : 0, color: onDark ? '#fff' : onGreen ? '#fff' : 'inherit' }}>
        {title}
      </h2>
      {kicker && (
        <p className="lead" style={{ marginTop: 24, maxWidth: align === 'center' ? '52ch' : '54ch', margin: align === 'center' ? '24px auto 0' : '24px 0 0', color: onDark || onGreen ? 'rgba(255,255,255,0.7)' : undefined }}>
          {kicker}
        </p>
      )}
    </div>
  );
}

// ---- Page hero shell — light by default, with a soft warm wash.
// Every page top uses this so the hero treatment is consistent.
function PageHero({ eyebrow, title, lead, ctas, badges, side, tint = 'cream' }) {
  const bg = tint === 'sage' ? 'var(--c-sage)' : tint === 'paper' ? 'var(--c-paper)' : 'var(--c-cream)';
  const border = tint === 'sage' ? 'var(--c-sage-2)' : 'var(--c-cream-2)';
  return (
    <section style={{
      position: 'relative',
      padding: '64px 56px 96px',
      background: bg,
      color: 'var(--c-ink)',
      overflow: 'hidden',
      borderBottom: '1px solid ' + border,
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 85% -10%, rgba(0,165,104,0.10) 0%, transparent 55%)',
      }}/>
      <div className="container" style={{ position: 'relative', paddingTop: 64 }}>
        <div style={{ display: 'grid', gridTemplateColumns: side ? '1.15fr 1fr' : '1fr', gap: 64, alignItems: 'center' }}>
          <div style={{ maxWidth: side ? 'none' : 1080 }}>
            {eyebrow && <div className="eyebrow" style={{ marginBottom: 32 }}>{eyebrow}</div>}
            <h1 className="h1" style={{ marginBottom: 32 }}>{title}</h1>
            {lead && <p className="lead" style={{ fontSize: 22, marginBottom: 36, maxWidth: '54ch' }}>{lead}</p>}
            {ctas && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>{ctas}</div>}
            {badges && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {badges.map((b, i) => <span key={i} className="chip">{b}</span>)}
              </div>
            )}
          </div>
          {side && <div>{side}</div>}
        </div>
      </div>
    </section>
  );
}

// ---- Marquee (venues / districts list) ----
function Marquee({ items, onDark = false }) {
  // duplicate for seamless loop
  const looped = [...items, ...items];
  return (
    <div className={'marquee' + (onDark ? ' marquee--dark' : '')}>
      <div className="marquee__track">
        {looped.map((it, i) => (
          <React.Fragment key={i}>
            <span>{it}</span>
            <span className="marquee__star">✦</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  Mark, MarkBig, ArrowRight, Nav, Footer, FinalCTA, SectionHead, Marquee, PageHero, NAV_ITEMS,
});
