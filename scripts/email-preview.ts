/**
 * Writes the confirmation emails for mock data to test-results/email-preview/ so they
 * can be opened in a browser: `pnpm email:preview`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { confirmationContent, renderLeadConfirmation } from '../src/email/leadConfirmation'

const outDir = join(process.cwd(), 'test-results', 'email-preview')
mkdirSync(outDir, { recursive: true })

const samples = {
  demo: confirmationContent('demo', {
    fullName: 'Jordan Rivera',
    district: 'Sample Unified School District',
    interests: ['budget-software', 'ai-training'],
    datePreference: 'Weekday afternoons',
  }),
  contact: confirmationContent('contact', {
    name: 'Jordan Rivera',
    reason: 'training',
    message: 'We would like to hear more about AI training for our finance staff.',
  }),
  speaking: confirmationContent('speaking', {
    contactName: 'Jordan Rivera',
    eventName: 'Sample State Association Conference',
    eventDate: '2027-03-14',
    organization: 'Sample Association of School Business Officials',
  }),
  escape: confirmationContent('contact', {
    name: 'Jordan Rivera',
    reason: 'other',
    message: '<script>alert(1)</script> & "quotes"',
  }),
}

const kinds = { demo: 'demo', contact: 'contact', speaking: 'speaking', escape: 'contact' } as const

for (const [name, content] of Object.entries(samples)) {
  const { html, text } = renderLeadConfirmation({
    kind: kinds[name as keyof typeof kinds],
    ...content,
  })
  writeFileSync(join(outDir, `${name}.html`), html)
  writeFileSync(join(outDir, `${name}.txt`), text)
}

console.log(`Wrote ${Object.keys(samples).length * 2} files to ${outDir}`)
