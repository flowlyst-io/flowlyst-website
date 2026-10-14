/**
 * The contact form's Reason options, shared by the `contact-messages` collection (the
 * Postgres enum), the form island, and the /contact page's `?reason=` preselect.
 * Adding or removing a value changes the enum and needs a migration.
 */
export const CONTACT_REASONS = [
  { label: 'Press', value: 'press' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'Training question', value: 'training' },
  { label: 'Free automation assessment', value: 'assessment' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Support', value: 'support' },
  { label: 'Other', value: 'other' },
] as const

export type ContactReason = (typeof CONTACT_REASONS)[number]['value']

export function toContactReason(value: unknown): ContactReason | undefined {
  return CONTACT_REASONS.find((r) => r.value === value)?.value
}
