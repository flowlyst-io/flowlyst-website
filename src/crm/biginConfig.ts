/**
 * SERVER-ONLY: reads CRM secrets from env. Never import this from a client component.
 * (`server-only` is not installed; only non-`NEXT_PUBLIC_` names are read, which Next
 * never inlines into client bundles.)
 *
 * Everything the Bigin push needs is configuration, read per call so a Vercel env
 * change takes effect on redeploy and tests can stub it. The SDR owns the pipeline
 * side (stages, field API names, picklist values); none of it is hard-coded in logic.
 */
import { envValue } from '@/utilities/envValue'

export type BiginKind = 'demo' | 'contact' | 'speaking'

export type BiginConfig = {
  enabled: boolean
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  accountsUrl: string
  apiDomain?: string
  pipelineName: string
  pipelineId?: string
  stage: string
  subPipeline: Record<BiginKind, string>
  leadSourceField?: string
  leadSource: Record<BiginKind, string>
  productInterestField?: string
  productInterestValues: Record<string, string>
  closingDays: number
}

export const DEFAULT_PRODUCT_INTEREST_VALUES: Record<string, string> = {
  'ai-training': 'AI Training',
  'budget-software': 'Budget Software',
  consulting: 'Consulting',
  keynotes: 'Keynote',
}

function productInterestValues(warn?: (message: string) => void): Record<string, string> {
  const raw = envValue('BIGIN_PRODUCT_INTEREST_VALUES')
  if (!raw) return { ...DEFAULT_PRODUCT_INTEREST_VALUES }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('not an object')
    const strings = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>
    return { ...DEFAULT_PRODUCT_INTEREST_VALUES, ...strings }
  } catch {
    warn?.('[bigin] BIGIN_PRODUCT_INTEREST_VALUES is not a JSON object of strings; using defaults')
    return { ...DEFAULT_PRODUCT_INTEREST_VALUES }
  }
}

export function biginConfig(warn?: (message: string) => void): BiginConfig {
  const clientId = envValue('BIGIN_CLIENT_ID')
  const clientSecret = envValue('BIGIN_CLIENT_SECRET')
  const refreshToken = envValue('BIGIN_REFRESH_TOKEN')
  const days = Number.parseInt(envValue('BIGIN_CLOSING_DAYS') ?? '', 10)
  return {
    enabled: Boolean(clientId && clientSecret && refreshToken),
    clientId,
    clientSecret,
    refreshToken,
    accountsUrl: (envValue('BIGIN_ACCOUNTS_URL') ?? 'https://accounts.zoho.com').replace(
      /\/+$/,
      '',
    ),
    apiDomain: envValue('BIGIN_API_DOMAIN')?.replace(/\/+$/, ''),
    pipelineName: envValue('BIGIN_PIPELINE_NAME') ?? 'Sales Pipeline',
    pipelineId: envValue('BIGIN_PIPELINE_ID'),
    stage: envValue('BIGIN_STAGE') ?? 'Form Submitted',
    subPipeline: {
      demo: envValue('BIGIN_SUB_PIPELINE_DEMO') ?? 'sales',
      contact: envValue('BIGIN_SUB_PIPELINE_CONTACT') ?? 'sales',
      speaking: envValue('BIGIN_SUB_PIPELINE_SPEAKING') ?? 'Keynotes',
    },
    leadSourceField: envValue('BIGIN_LEAD_SOURCE_FIELD'),
    leadSource: {
      demo: envValue('BIGIN_LEAD_SOURCE_DEMO') ?? 'Website – Demo',
      contact: envValue('BIGIN_LEAD_SOURCE_CONTACT') ?? 'Website – Contact',
      speaking: envValue('BIGIN_LEAD_SOURCE_SPEAKING') ?? 'Website – Speaking',
    },
    productInterestField: envValue('BIGIN_PRODUCT_INTEREST_FIELD'),
    productInterestValues: productInterestValues(warn),
    closingDays: Number.isFinite(days) && days >= 0 ? days : 30,
  }
}
