import type { LegalDoc } from './types'

/**
 * Terms of service — DRAFT (issue #22). Governs use of the marketing website only.
 * Standard, conservative, plain-English sections; every place that needs a real legal
 * decision (entity, governing law, liability terms) is a `flag`, not an invented claim.
 * The design itself notes "long-form copy owned by legal counsel" — this is the draft
 * counsel reviews, and final sign-off is Tural's (issue #70).
 */
export const termsDoc: LegalDoc = {
  doc: 'terms',
  title: 'Terms of service',
  sub: 'The rules that govern your use of flowlyst.',
  lastUpdated: 'Draft — pending review',
  sections: [
    {
      id: 'overview',
      heading: 'Agreement to these terms',
      blocks: [
        {
          kind: 'p',
          text: 'These terms govern your use of the flowlyst marketing website. By using the site, you agree to them. If you do not agree, please do not use the site.',
        },
        {
          kind: 'p',
          text: 'These terms apply to this website only. Use of the flowlyst budgeting product or any consulting, training, or speaking engagement is governed by the separate agreement for that service.',
        },
        {
          kind: 'flag',
          text: 'Confirm scope: should these terms remain website-only, or also cover the SaaS product? If the product has its own agreement, keep this website-only and link the product terms.',
        },
      ],
    },
    {
      id: 'who-we-are',
      heading: 'Who we are',
      blocks: [
        {
          kind: 'p',
          text: 'This site is operated by flowlyst, Inc. You can reach us at info@flowlyst.io.',
        },
        {
          kind: 'flag',
          text: 'Confirm the registered entity name, state of incorporation, and business address to name here.',
        },
      ],
    },
    {
      id: 'use-of-site',
      heading: 'Using the site',
      blocks: [
        {
          kind: 'p',
          text: 'You may use the site for lawful purposes and in line with these terms. You agree not to:',
        },
        {
          kind: 'list',
          items: [
            'Use the site in any way that breaks the law or infringes anyone’s rights.',
            'Interfere with, disrupt, or place undue load on the site or its infrastructure.',
            'Attempt to gain unauthorized access to any part of the site, its systems, or accounts.',
            'Scrape, harvest, or collect data from the site by automated means without our permission.',
            'Submit false information or another person’s information without their authorization, or use our forms to send spam.',
          ],
        },
      ],
    },
    {
      id: 'intellectual-property',
      heading: 'Intellectual property',
      blocks: [
        {
          kind: 'p',
          text: 'The site and its content — including text, graphics, logos, the flowlyst name and marks, and the design — are owned by flowlyst or its licensors and are protected by intellectual-property laws. We grant you a limited, personal, non-exclusive license to view the site for its intended purpose. You may not copy, reproduce, republish, or create derivative works from our content without our prior written permission, except as allowed by law.',
        },
      ],
    },
    {
      id: 'submissions',
      heading: 'Information you submit',
      blocks: [
        {
          kind: 'p',
          text: 'When you submit information through our forms, you confirm that it is accurate and that you are authorized to provide it. We handle the information you submit in accordance with our privacy policy.',
        },
      ],
    },
    {
      id: 'third-party-links',
      heading: 'Third-party links and services',
      blocks: [
        {
          kind: 'p',
          text: 'The site may link to or rely on third-party websites and services that we do not control. We are not responsible for their content, availability, or practices, and linking to them is not an endorsement. Your use of a third-party service is governed by that party’s own terms.',
        },
      ],
    },
    {
      id: 'disclaimers',
      heading: 'Disclaimers',
      blocks: [
        {
          kind: 'p',
          text: 'The site and its content are provided "as is" and "as available," without warranties of any kind, whether express or implied, to the fullest extent permitted by law. Content on the site is for general information only and is not professional, financial, or legal advice. We do not warrant that the site will be uninterrupted, secure, or error-free.',
        },
      ],
    },
    {
      id: 'liability',
      heading: 'Limitation of liability',
      blocks: [
        {
          kind: 'p',
          text: 'To the fullest extent permitted by law, flowlyst will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the site.',
        },
        {
          kind: 'flag',
          text: 'Counsel to set the liability cap, carve-outs, and any indemnification clause. This section is placeholder boilerplate until reviewed.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to the site and these terms',
      blocks: [
        {
          kind: 'p',
          text: 'We may change, suspend, or discontinue any part of the site at any time. We may also update these terms; when we do, we will change the "last updated" date above. Your continued use of the site after a change means you accept the updated terms.',
        },
      ],
    },
    {
      id: 'governing-law',
      heading: 'Governing law',
      blocks: [
        {
          kind: 'p',
          text: 'These terms are governed by the laws that apply where flowlyst is established, without regard to conflict-of-laws rules.',
        },
        {
          kind: 'flag',
          text: 'Specify the governing state/jurisdiction and the venue for disputes (and whether arbitration applies). Left general until counsel decides.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact us',
      blocks: [
        {
          kind: 'p',
          text: 'Questions about these terms? Email us at info@flowlyst.io.',
        },
      ],
    },
  ],
}
