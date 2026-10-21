/**
 * SERVER-ONLY (same rule as the rest of `src/crm`): pushes one verified lead to Bigin.
 */
import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'

import { biginConfig, type BiginKind } from './biginConfig'
import {
  biginTiming,
  createDeal,
  upsertAccount,
  upsertContact,
  type BiginContext,
  type BiginLogger,
} from './biginClient'
import { toBiginLead } from './leadToBigin'

type DocFor = { demo: DemoRequest; contact: ContactMessage; speaking: SpeakingRequest }

export type PushResult = { ok: true; dealId: string } | { ok: false; error: string }

/**
 * Account (when the lead names an organization), then contact, then a new deal for
 * every request. One deadline bounds every call, token requests included. Never
 * throws: the caller runs after the lead is saved.
 */
export async function pushLead<K extends BiginKind>(
  kind: K,
  doc: DocFor[K],
  log?: BiginLogger,
): Promise<PushResult> {
  try {
    const config = biginConfig(log?.warn)
    if (!config.enabled) return { ok: false, error: 'Bigin is not configured' }

    const lead = toBiginLead(kind, doc, config, new Date())
    const ctx: BiginContext = { config, deadline: AbortSignal.timeout(biginTiming.budgetMs), log }

    const accountId = lead.accountName ? await upsertAccount(ctx, lead.accountName) : undefined
    const contactId = await upsertContact(ctx, {
      ...lead.contact,
      ...(accountId ? { Account_Name: { id: accountId } } : {}),
    })
    const dealId = await createDeal(ctx, {
      ...lead.deal,
      Contact_Name: { id: contactId },
      ...(accountId ? { Account_Name: { id: accountId } } : {}),
    })
    return { ok: true, dealId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
