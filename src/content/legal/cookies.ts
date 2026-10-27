import type { LegalDoc } from './types'

/**
 * Cookie policy (issue #22). Documents the cookies/storage the site ACTUALLY
 * uses today: the strictly-necessary consent cookie (`fl_cookie_consent`), the Payload
 * staff-session cookie, plus the optional Google Analytics cookies (`_ga`, `_ga_<ID>`) set
 * only after Accept (ADR 0005). The site also runs cookieless Vercel Web Analytics and Speed
 * Insights; Google reCAPTCHA v3 protects the forms and is treated as strictly necessary
 * (ADR 0002). Unknowns are `flag` blocks. Signed off by Tural 2026-10-11; the Speed Insights
 * sentences were added by #10 (2026-10-16) and the Google Analytics wording by #139
 * (2026-10-27), both after that sign-off.
 */
export const cookiesDoc: LegalDoc = {
  doc: 'cookies',
  title: 'Cookie policy',
  sub: 'How we use cookies and similar technologies.',
  lastUpdated: 'October 27, 2026',
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
          text: 'We keep the site light on cookies. Strictly necessary features work by default because the site cannot function properly without them. Any non-essential cookie runs only after you accept it in the cookie banner; Google Analytics is the only optional one (see Analytics below). You can decline, and you can change your mind later by clearing your cookies for this site, which brings the banner back.',
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
          text: 'Analytics (optional)',
        },
        {
          kind: 'list',
          items: [
            '_ga — first-party — Google Analytics — tells visits apart so we can count them — kept about 2 years — set only after you accept.',
            '_ga_<ID> — first-party — Google Analytics — keeps the state of your current session — kept about 2 years — set only after you accept.',
          ],
        },
        {
          kind: 'subheading',
          text: 'Analytics',
        },
        {
          kind: 'p',
          text: 'The site uses Vercel Web Analytics, which is cookieless and collects aggregated, anonymized page-view data (no cookies, no cross-site tracking), and Vercel Speed Insights, which is also cookieless and measures aggregated page-load performance. The site uses no advertising cookies. Google Analytics loads only after you accept in the cookie banner. It measures visits and form completions in aggregate, and Google acts as our service provider for it. Google’s use of this information is governed by the Google Privacy Policy (https://policies.google.com/privacy).',
        },
        {
          kind: 'subheading',
          text: 'Spam protection',
        },
        {
          kind: 'p',
          text: 'Our forms use Google reCAPTCHA v3, together with a hidden field, to block automated spam. reCAPTCHA is a security service that we treat as strictly necessary: it loads only when you start filling in a form, and it runs whether or not you accept optional cookies, because without it the forms could not be protected from abuse. Google acts as our service provider for this check; it may set or read cookies and receives your IP address, browser and device information, and how you interact with the page. Google’s use of this information is governed by the Google Privacy Policy (https://policies.google.com/privacy) and Terms of Service (https://policies.google.com/terms).',
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
