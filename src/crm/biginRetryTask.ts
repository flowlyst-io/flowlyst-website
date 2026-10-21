/**
 * SERVER-ONLY (same rule as the rest of `src/crm`): the queued retry for a lead whose
 * Bigin push failed. Payload's cron endpoint (vercel.json) runs it daily.
 */
import type { TaskConfig } from 'payload'

import type { BiginKind } from './biginConfig'
import { COLLECTION_FOR, syncLeadToBigin, type LeadCollection } from './syncLead'

// A retry that fails again waits for a later cron run instead of re-running in this one.
const REQUEUE_DELAY_MS = 20 * 60 * 60 * 1000

export const biginRetryTask: TaskConfig<'biginRetry'> = {
  slug: 'biginRetry',
  retries: 0,
  inputSchema: [
    { name: 'collection', type: 'text', required: true },
    { name: 'id', type: 'number', required: true },
  ],
  handler: async ({ input, req }) => {
    const { payload } = req
    try {
      const kind = (Object.keys(COLLECTION_FOR) as BiginKind[]).find(
        (k) => COLLECTION_FOR[k] === input.collection,
      )
      if (!kind) return { output: {} }
      const doc = await payload.findByID({
        collection: input.collection as LeadCollection,
        id: input.id,
        overrideAccess: true,
        disableErrors: true,
      })
      // Only verified leads are ever marked failed, so a retry is always verified.
      if (doc && doc.crmStatus === 'failed') {
        await syncLeadToBigin(payload, kind, doc as never, {
          verified: true,
          requeueDelayMs: REQUEUE_DELAY_MS,
        })
      }
    } catch (err) {
      payload.logger.error(
        `[bigin] retry failed for ${input.collection} ${input.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    return { output: {} }
  },
}
