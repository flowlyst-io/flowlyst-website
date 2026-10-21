/**
 * The demo form's Interests options, shared by the `demo-requests` collection and the
 * confirmation email's recap. Changing a value changes the Postgres enum and needs a migration.
 */
export const DEMO_INTERESTS = [
  { label: 'AI Training', value: 'ai-training' },
  { label: 'Budget Software', value: 'budget-software' },
  { label: 'Consulting', value: 'consulting' },
  { label: 'Keynotes', value: 'keynotes' },
] as const
