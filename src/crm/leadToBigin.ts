/**
 * SERVER-ONLY (same rule as the rest of `src/crm`): maps a saved lead to Bigin
 * records. Pure: no network, no env; the config and the date are passed in.
 */
import {
  contactMessageLines,
  demoRequestLines,
  speakingRequestLines,
} from '@/email/leadNotifications'
import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'

import type { BiginConfig, BiginKind } from './biginConfig'

type DocFor = { demo: DemoRequest; contact: ContactMessage; speaking: SpeakingRequest }

export type BiginContact = {
  Last_Name: string
  First_Name?: string
  Email: string
  Phone?: string
  Title?: string
}

export type BiginDeal = {
  Deal_Name: string
  Pipeline: { name: string; id?: string }
  Sub_Pipeline: string
  Stage: string
  Closing_Date: string
  Description: string
  [field: string]: unknown
}

export type BiginLead = { accountName?: string; contact: BiginContact; deal: BiginDeal }

export function splitName(full: string): { First_Name?: string; Last_Name: string } {
  const words = full.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return { Last_Name: words[0] ?? full.trim() }
  return { First_Name: words.slice(0, -1).join(' '), Last_Name: words[words.length - 1] }
}

function productKeys(kind: BiginKind, doc: DocFor[BiginKind]): string[] {
  if (kind === 'demo') return (doc as DemoRequest).interests ?? []
  if (kind === 'speaking') return ['keynotes']
  const reason = (doc as ContactMessage).reason
  if (reason === 'training') return ['ai-training']
  if (reason === 'assessment') return ['consulting']
  return []
}

function closingDate(today: Date, days: number): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days),
  )
  return d.toISOString().slice(0, 10)
}

export function toBiginLead<K extends BiginKind>(
  kind: K,
  doc: DocFor[K],
  config: BiginConfig,
  today: Date,
): BiginLead {
  let person: string
  let email: string
  let org: string | null | undefined
  let lines: string[]
  if (kind === 'demo') {
    const d = doc as DemoRequest
    person = d.fullName
    email = d.workEmail
    org = d.district
    lines = demoRequestLines(d)
  } else if (kind === 'speaking') {
    const s = doc as SpeakingRequest
    person = s.contactName
    email = s.email
    org = s.organization
    lines = speakingRequestLines(s)
  } else {
    const c = doc as ContactMessage
    person = c.name
    email = c.email
    org = undefined
    lines = contactMessageLines(c)
  }
  const accountName = org?.trim() || undefined

  const contact: BiginContact = { ...splitName(person), Email: email }
  if (kind === 'demo') {
    const d = doc as DemoRequest
    if (d.phone?.trim()) contact.Phone = d.phone.trim()
    if (d.title?.trim()) contact.Title = d.title.trim()
  }

  const deal: BiginDeal = {
    Deal_Name: accountName ? `${accountName} / ${person}` : person,
    Pipeline: {
      name: config.pipelineName,
      ...(config.pipelineId ? { id: config.pipelineId } : {}),
    },
    Sub_Pipeline: config.subPipeline[kind],
    Stage: config.stage,
    Closing_Date: closingDate(today, config.closingDays),
    Description: lines.join('\n'),
  }
  if (config.leadSourceField) deal[config.leadSourceField] = config.leadSource[kind]
  if (config.productInterestField) {
    const values = productKeys(kind, doc)
      .map((key) => config.productInterestValues[key])
      .filter((v): v is string => Boolean(v))
    if (values.length) deal[config.productInterestField] = values
  }
  return { accountName, contact, deal }
}
