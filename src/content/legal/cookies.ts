import type { LegalDoc } from './types'

/**
 * Cookie policy — DRAFT (issue #22). Documents the cookies/storage the site ACTUALLY
 * uses today: the strictly-necessary consent cookie (`fl_cookie_consent`), the Payload
 * staff-session cookie on /admin, and the Corpowid accessibility widget's storage. The
 * site runs no analytics; reCAPTCHA is planned (PRD §10.4), not live. Unknowns —
 * chiefly Corpowid's exact cookie behavior — are `flag` blocks. Sign-off is Tural's.
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
          text: 'We keep the site light on cookies. Strictly necessary and accessibility features work by default because the site cannot function properly without them. Any non-essential cookie — such as analytics, if we ever add it — runs only after you accept it in the cookie banner. You can decline, and you can change your mind later by clearing your cookies for this site, which brings the banner back.',
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
            'Staff login session — first-party — set only if you log in to the content admin at /admin; it keeps you signed in and is not set for ordinary visitors.',
          ],
        },
        {
          kind: 'subheading',
          text: 'Accessibility (essential)',
        },
        {
          kind: 'p',
          text: 'The site includes the Corpowid accessibility toolbar, which lets visitors adjust the experience (for example, text size or contrast). Because it is an accessibility accommodation, it loads before the consent banner under our legitimate interest in keeping the site accessible to everyone who needs it — gating it behind consent would withhold accessibility features from the people who rely on them. It may store your accessibility preferences on your device so your settings persist between visits.',
        },
        {
          kind: 'flag',
          text: 'Confirm the Corpowid account (0dad393b-e1f0-4586-aa19-31eedcf20a06, carried from the legacy site) is still active, and confirm the widget sets ONLY accessibility-preference storage and no tracking/analytics cookies. If it does track, it must move behind the consent banner and this section must change.',
        },
        {
          kind: 'subheading',
          text: 'Analytics',
        },
        {
          kind: 'p',
          text: 'The site uses no analytics or advertising cookies at this time. If we add analytics later, we will list it here and it will run only after you accept.',
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
