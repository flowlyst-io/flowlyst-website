import type { LegalDoc } from './types'

/**
 * Cookie policy — DRAFT (issue #22). Documents the cookies/storage the site ACTUALLY
 * uses today: the strictly-necessary consent cookie (`fl_cookie_consent`), the Payload
 * staff-session cookie. The site runs cookieless Vercel Web Analytics only; reCAPTCHA
 * is planned (PRD §10.4), not live. Unknowns are `flag` blocks. Sign-off is Tural's.
 */
export const cookiesDoc: LegalDoc = {
  doc: 'cookies',
  title: 'Cookie policy',
  sub: 'How we use cookies and similar technologies.',
  lastUpdated: 'Draft — pending review',
  sections: [
    {
      id: 'overview',
      heading: 'Overview',
      blocks: [
        {
          kind: 'p',
          text: 'Cookies are small files a website stores on your device; "similar technologies" include things like your browser’s local storage. This policy explains what this site uses them for and how you can control them. It works together with our privacy policy.',
        },
      ],
    },
    {
      id: 'consent',
      heading: 'Your choice',
      blocks: [
        {
          kind: 'p',
          text: 'We keep the site light on cookies. Strictly necessary features work by default because the site cannot function properly without them. Any non-essential cookie runs only after you accept it in the cookie banner; our analytics is cookieless (see Analytics below). You can decline, and you can change your mind later by clearing your cookies for this site, which brings the banner back.',
        },
        {
          kind: 'p',
          text: 'To remember your accept-or-decline choice, we set one strictly necessary cookie (named below). It stores only your choice, so it is exempt from consent.',
        },
      ],
    },
    {
      id: 'cookies-we-use',
      heading: 'Cookies we use',
      blocks: [
        {
          kind: 'subheading',
          text: 'Strictly necessary',
        },
        {
          kind: 'list',
          items: [
            'fl_cookie_consent — first-party — remembers whether you accepted or declined optional cookies — kept about 6 months.',
            'Staff sign-in session — first-party — set only when flowlyst staff sign in to manage site content; never set for visitors.',
          ],
        },
        {
          kind: 'subheading',
          text: 'Analytics',
        },
        {
          kind: 'p',
          text: 'The site uses Vercel Web Analytics, which is cookieless and collects aggregated, anonymized page-view data (no cookies, no cross-site tracking). The site uses no advertising cookies. If we add any cookie-based analytics later, we will list it here and it will run only after you accept.',
        },
        {
          kind: 'subheading',
          text: 'Spam protection',
        },
        {
          kind: 'p',
          text: 'Our forms currently use a hidden field to catch automated spam, which does not set a cookie. We plan to add Google reCAPTCHA to the demo and contact forms; when we do, it may set cookies, and we will document them here first.',
        },
        {
          kind: 'flag',
          text: 'When reCAPTCHA is enabled, add its cookies to this list and reflect Google as a processor in the privacy policy.',
        },
      ],
    },
    {
      id: 'managing-cookies',
      heading: 'Managing cookies',
      blocks: [
        {
          kind: 'p',
          text: 'You can accept or decline optional cookies in the banner, and you can control cookies through your browser settings — most browsers let you block or delete them. Blocking strictly necessary cookies may stop parts of the site from working as intended.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          kind: 'p',
          text: 'We may update this policy as our use of cookies changes. When we do, we will update the "last updated" date above.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact us',
      blocks: [
        {
          kind: 'p',
          text: 'Questions about our use of cookies? Email us at info@flowlyst.io.',
        },
      ],
    },
  ],
}
