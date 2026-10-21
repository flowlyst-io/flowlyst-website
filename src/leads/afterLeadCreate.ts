import { commitTransaction, type CollectionAfterChangeHook } from 'payload'

import { syncLeadToBigin } from '@/crm/syncLead'
import {
  notifyContactMessage,
  notifyDemoRequest,
  notifySpeakingRequest,
  sendLeadConfirmation,
} from '@/email/leadNotifications'
import type { LeadKind } from '@/email/leadConfirmation'
import type { ContactMessage, DemoRequest, SpeakingRequest } from '@/payload-types'
import { recaptchaOutcomeOf } from '@/utilities/recaptcha'

/**
 * What happens after a lead form row is created: the team email always; for an
 * anonymous REST create (the forms) also the submitter's confirmation and the Bigin
 * push, each only for a reCAPTCHA `pass`. See docs/conventions.md, "A lead's
 * afterChange commits before its network side effects".
 *
 * Payload runs afterChange inside the open transaction and commits after it, so for
 * the forms' path the hook commits first: the row is durable before any network call
 * and nothing after this point can roll it back. Everything below the commit
 * therefore never throws. The Local API keeps its transaction (a caller may have
 * passed an outer `req`) and gets only the team email.
 */
export function afterLeadCreate(kind: LeadKind): CollectionAfterChangeHook {
  return async ({ doc, operation, req }) => {
    if (operation !== 'create' || req.context.leadEffects === 'skip') return

    const external = req.payloadAPI === 'REST' && !req.user
    if (external && req.transactionID) await commitTransaction(req)

    try {
      const outcome = recaptchaOutcomeOf(req.context)
      const verified = outcome === 'pass'
      const { payload } = req
      const team = async () => {
        if (kind === 'demo') await notifyDemoRequest(payload, doc as DemoRequest, outcome)
        else if (kind === 'contact')
          await notifyContactMessage(payload, doc as ContactMessage, outcome)
        else await notifySpeakingRequest(payload, doc as SpeakingRequest, outcome)
      }
      const confirmation = async () => {
        if (verified && external) await sendLeadConfirmation(payload, kind, doc as never)
      }
      const crm = async () => {
        if (external) await syncLeadToBigin(payload, kind, doc as never, { verified })
      }
      const results = await Promise.allSettled([team(), confirmation(), crm()])
      for (const r of results)
        if (r.status === 'rejected')
          payload.logger.error(
            `[leads] ${kind} side effect failed after save: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
          )
    } catch (err) {
      req.payload.logger.error(
        `[leads] ${kind} side effects failed after save: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
