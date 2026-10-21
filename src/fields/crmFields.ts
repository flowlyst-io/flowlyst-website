import type { Field } from 'payload'

import { isAdminFieldLevel } from '@/access'

/**
 * Where a lead stands with Bigin (issue #116). Written only by the server after the
 * lead is saved; admin-only on every operation, so an anonymous create can neither set
 * these nor read them back from the create response.
 */
const adminOnly = { read: isAdminFieldLevel, create: isAdminFieldLevel, update: isAdminFieldLevel }
const sidebar = { position: 'sidebar', readOnly: true } as const

export const crmFields: Field[] = [
  {
    name: 'crmStatus',
    type: 'select',
    label: 'Bigin',
    defaultValue: 'not-sent',
    access: adminOnly,
    admin: sidebar,
    options: [
      { label: 'Not sent', value: 'not-sent' },
      { label: 'In Bigin', value: 'sent' },
      { label: 'Failed', value: 'failed' },
      { label: 'Skipped: unverified', value: 'unverified' },
      { label: 'Skipped: Bigin off', value: 'off' },
    ],
  },
  { name: 'crmDealId', type: 'text', label: 'Bigin deal id', access: adminOnly, admin: sidebar },
  {
    name: 'crmLastError',
    type: 'textarea',
    label: 'Bigin last error',
    access: adminOnly,
    admin: sidebar,
  },
  {
    name: 'crmAttempts',
    type: 'number',
    label: 'Bigin attempts',
    defaultValue: 0,
    access: adminOnly,
    admin: sidebar,
  },
  {
    name: 'crmLastAttemptAt',
    type: 'date',
    label: 'Bigin last attempt',
    access: adminOnly,
    admin: sidebar,
  },
]
