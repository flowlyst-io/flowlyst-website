/**
 * SERVER-ONLY (same rule as the rest of `src/crm`): records a lead's Bigin outcome on
 * its row, and queues a retry when a verified lead's push failed.
 */
import type { Payload } from 'payload'

import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'

import { biginConfig, type BiginKind } from './biginConfig'
import { pushLead } from './pushLead'

type DocFor = { demo: DemoRequest; contact: ContactMessage; speaking: SpeakingRequest }
export type LeadCollection = 'demo-requests' | 'contact-messages' | 'speaking-requests'

export const COLLECTION_FOR: Record<BiginKind, LeadCollection> = {
  demo: 'demo-requests',
  contact: 'contact-messages',
  speaking: 'speaking-requests',
}

/** The inline push plus up to three queued retries. */
export const MAX_ATTEMPTS = 4

export async function syncLeadToBigin<K extends BiginKind>(
  payload: Payload,
  kind: K,
  doc: DocFor[K],
  opts: { verified: boolean; requeueDelayMs?: number },
): Promise<void> {
  const collection = COLLECTION_FOR[kind]
  const where = `${collection} ${doc.id}`
  try {
    let data: Record<string, unknown>
    let retry = false

    if (!opts.verified) {
      data = { crmStatus: 'unverified' }
    } else if (!biginConfig(payload.logger.warn.bind(payload.logger)).enabled) {
      data = { crmStatus: 'off' }
    } else {
      const result = await pushLead(kind, doc, payload.logger)
      const attempts = (doc.crmAttempts ?? 0) + 1
      const base = { crmAttempts: attempts, crmLastAttemptAt: new Date().toISOString() }
      if (result.ok) {
        data = { ...base, crmStatus: 'sent', crmDealId: result.dealId, crmLastError: null }
      } else {
        data = { ...base, crmStatus: 'failed', crmLastError: result.error.slice(0, 500) }
        retry = attempts < MAX_ATTEMPTS
      }
    }

    try {
      await payload.update({
        collection,
        id: doc.id,
        data: data as never,
        overrideAccess: true,
        context: { leadEffects: 'skip' },
      })
    } catch (err) {
      payload.logger.error(
        `[bigin] could not record status for ${where}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    if (retry) {
      try {
        await payload.jobs.queue({
          task: 'biginRetry',
          input: { collection, id: doc.id },
          ...(opts.requeueDelayMs ? { waitUntil: new Date(Date.now() + opts.requeueDelayMs) } : {}),
        })
      } catch (err) {
        payload.logger.error(
          `[bigin] could not queue a retry for ${where}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  } catch (err) {
    payload.logger.error(
      `[bigin] sync failed for ${where}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
