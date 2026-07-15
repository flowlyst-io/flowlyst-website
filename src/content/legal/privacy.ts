import type { LegalDoc } from './types'

/**
 * Privacy policy — DRAFT (issue #22). Grounded in what this codebase ACTUALLY collects
 * and the processors it uses (verified against the form components, the Payload
 * collections, and the deploy stack): the demo, contact, newsletter, and speaking
 * forms; Vercel hosting; Neon Postgres; Resend email; the Corpowid accessibility
 * widget. Unknowns that only Tural/counsel can settle are `flag` blocks, not guesses.
 * Final legal sign-off is Tural's (issue #70).
 */
export const privacyDoc: LegalDoc = {
  doc: 'privacy',
  title: 'Privacy policy',
  sub: "How we collect, use, and protect data from people who use flowlyst's site and services.",
  lastUpdated: 'Draft — pending review',
  sections: [
    {
      id: 'overview',
      heading: 'Overview',
      blocks: [
        {
          kind: 'p',
          text: 'This policy explains how flowlyst, Inc. ("flowlyst", "we", "us") handles personal information collected through this marketing website. It covers the information you give us when you request a demo, contact us, subscribe to our newsletter, or ask us to speak at an event, along with information collected automatically as you browse.',
        },
        {
          kind: 'p',
          text: 'It does not cover the data districts process inside the flowlyst budgeting product or through a consulting or training engagement. That data — including any student records governed by FERPA — is handled under the separate agreement (and data processing terms) for that service, not this website.',
        },
        {
          kind: 'flag',
          text: 'Confirm the legal entity name and whether this policy should reference any parent/affiliate. The site-wide structured data uses "flowlyst, Inc." — confirm that is the registered entity.',
        },
      ],
    },
    {
      id: 'what-we-collect',
      heading: 'Information we collect',
      blocks: [
        {
          kind: 'subheading',
          text: 'Information you give us',
        },
        {
          kind: 'p',
          text: 'When you submit one of our forms, we collect the information in that form. Specifically:',
        },
        {
          kind: 'list',
          items: [
            'Request a demo: your name, job title, district or organization, work email, phone number, areas of interest, preferred demo date, district size, how you heard about us, any message you add, and your consent to be contacted.',
            'Contact us: your name, work email, the reason for reaching out, and your message.',
            'Newsletter: your email address (and which page you subscribed from).',
            'Speaking / keynote inquiries: your name, email, organization, event name and date, audience size, budget range, topic interest, and any message.',
          ],
        },
        {
          kind: 'subheading',
          text: 'Information collected automatically',
        },
        {
          kind: 'p',
          text: 'When you visit the site, our hosting provider records standard server and request information — such as your IP address, browser and device type, the pages you request, and the date and time — for security, diagnostics, and reliable operation. We also use a small number of cookies and similar technologies, described in our cookie policy.',
        },
        {
          kind: 'p',
          text: 'The site does not use analytics or advertising trackers at this time. If that changes, any non-essential cookie will run only after you accept it in the cookie banner, and this policy and the cookie policy will be updated first.',
        },
      ],
    },
    {
      id: 'how-we-use-it',
      heading: 'How we use your information',
      blocks: [
        {
          kind: 'p',
          text: 'We use the information you provide to:',
        },
        {
          kind: 'list',
          items: [
            'Respond to your demo, contact, and speaking requests and follow up about them.',
            'Send you the newsletter you subscribed to (you can unsubscribe at any time).',
            'Operate, secure, and improve the website and prevent spam and abuse.',
            'Comply with our legal obligations.',
          ],
        },
        {
          kind: 'p',
          text: 'We rely on your consent (which our forms ask for explicitly) and on our legitimate interest in responding to inquiries and running the site. We do not use your information to make automated decisions that produce legal or similarly significant effects about you.',
        },
      ],
    },
    {
      id: 'sharing',
      heading: 'How we share your information',
      blocks: [
        {
          kind: 'p',
          text: 'We do not sell your personal information. We share it only with the service providers who process it on our behalf so the site can function, and where the law requires. Our current service providers are:',
        },
        {
          kind: 'list',
          items: [
            'Vercel — website hosting and content delivery (United States).',
            'Neon — the database that stores your form submissions.',
            'Resend — sends the email notifications that tell our team about your request.',
            'Corpowid — provides the accessibility toolbar available on the site.',
          ],
        },
        {
          kind: 'p',
          text: 'We may also disclose information if required by law, to enforce our terms, or to protect the rights, safety, and security of flowlyst, our users, or the public.',
        },
        {
          kind: 'flag',
          text: 'Confirm "we do not sell your personal information" is accurate for CCPA/CPRA. Confirm this processor list is complete — add any CRM, scheduling, analytics, or email-marketing tool in actual use, and note Google reCAPTCHA here once it is enabled (PRD §10.4). Each processor should have a data processing agreement on file.',
        },
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      blocks: [
        {
          kind: 'p',
          text: 'We keep the information you submit for as long as needed to respond to you and for the purpose it was collected, and then delete or de-identify it, unless a longer period is required by law.',
        },
        {
          kind: 'flag',
          text: 'Set concrete retention periods for each form type (e.g., how long demo/contact submissions and newsletter records are kept). This paragraph is a placeholder until those are decided.',
        },
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your rights and choices',
      blocks: [
        {
          kind: 'p',
          text: 'You can unsubscribe from the newsletter at any time using the link in any email, and you can ask us to access, correct, or delete the personal information you have given us.',
        },
        {
          kind: 'p',
          text: 'Depending on where you live, you may have additional rights. Residents of the EU/UK may have the right to access, rectify, erase, restrict, or object to our processing, and to data portability. California residents may have the right to know what we collect, to delete it, to correct it, to opt out of any sale or sharing, and not to be discriminated against for exercising those rights.',
        },
        {
          kind: 'p',
          text: 'To exercise any of these rights, email us at info@flowlyst.io. We will verify your request and respond as required by applicable law.',
        },
        {
          kind: 'flag',
          text: 'Confirm which privacy laws apply (GDPR/UK GDPR, CCPA/CPRA, others) and whether a dedicated privacy contact or Data Protection Officer should be named instead of info@flowlyst.io. Confirm whether the site actually serves EU/UK visitors, which drives the GDPR obligations above.',
        },
      ],
    },
    {
      id: 'international',
      heading: 'International visitors',
      blocks: [
        {
          kind: 'p',
          text: 'flowlyst is based in the United States and the site is hosted in the United States. If you access the site from outside the US, your information will be transferred to and processed in the US, which may have different data-protection rules than your country.',
        },
        {
          kind: 'flag',
          text: 'If the site serves EU/UK users, state the transfer mechanism (e.g., Standard Contractual Clauses) and confirm the hosting/processing regions with counsel.',
        },
      ],
    },
    {
      id: 'children',
      heading: "Children's privacy",
      blocks: [
        {
          kind: 'p',
          text: 'This website is intended for school district professionals and other adults, not for children. We do not knowingly collect personal information from children through this site. Student data is never collected through this marketing website; where flowlyst processes student records as part of a district engagement, that is governed by the agreement for that service, consistent with FERPA and applicable state law.',
        },
      ],
    },
    {
      id: 'security',
      heading: 'How we protect your information',
      blocks: [
        {
          kind: 'p',
          text: 'The site is served over HTTPS, and we use reasonable administrative and technical safeguards to protect the information you submit. Our forms use spam-prevention measures to keep out automated abuse. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          kind: 'p',
          text: 'We may update this policy from time to time. When we do, we will change the "last updated" date above, and we will provide additional notice for material changes where required.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact us',
      blocks: [
        {
          kind: 'p',
          text: 'Questions about this policy or your information? Email us at info@flowlyst.io.',
        },
        {
          kind: 'flag',
          text: 'Add a postal mailing address for the entity if one is required by the applicable privacy laws (the legacy site had only a placeholder address).',
        },
      ],
    },
  ],
}
