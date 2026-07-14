'use client'

import React, { useId, useState } from 'react'

/**
 * Speaking-request form — the ONLY client island on the Keynotes page
 * (design/site/solutions.jsx `KeynotesPage` request form). The section's heading
 * and lead stay server-rendered in page.tsx; only the interactive `<form>` is a
 * client component, so the crawlable content is untouched (review invariant a).
 *
 * Delivery path (invariant d): submit POSTs JSON to the auto-generated Payload
 * REST endpoint `POST /api/speaking-requests`, whose `create: anyone` access lets
 * an anonymous visitor persist a `speaking-requests` document. Validation is
 * two-layered — this island blocks obviously-bad input before the request, and
 * the collection re-validates server-side (required fields, email format, and the
 * `botField` honeypot) so the boundary holds even if the client is bypassed.
 * Email notification is out of scope tonight (#14); persistence is the delivery.
 *
 * Fields mirror the design comp, plus contact name / email / organization (the
 * comp omits them, but a speaking request is un-actionable without a way to reply
 * — see the SpeakingRequests collection note).
 */

const TOPIC_OPTIONS = [
  { value: 'ai-sbo', label: 'AI for school business officials' },
  { value: 'automation', label: 'Automating district finance & ops' },
  { value: 'ai-adoption', label: 'AI adoption for school leaders' },
  { value: 'custom', label: 'Custom topic' },
] as const

type FieldName =
  | 'contactName'
  | 'email'
  | 'organization'
  | 'eventName'
  | 'eventDate'
  | 'audienceSize'
  | 'budgetRange'
  | 'topicInterest'
  | 'message'

type FormValues = Record<FieldName, string>

const INITIAL: FormValues = {
  contactName: '',
  email: '',
  organization: '',
  eventName: '',
  eventDate: '',
  audienceSize: '',
  budgetRange: '',
  topicInterest: 'ai-sbo',
  message: '',
}

// Required fields validated client-side (the server enforces the same set).
const REQUIRED: FieldName[] = ['contactName', 'email', 'eventName', 'eventDate']

// Pragmatic email shape check — the real authority is the collection's `email`
// field type, which re-validates server-side.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function SpeakingRequestForm() {
  const baseId = useId()
  const [values, setValues] = useState<FormValues>(INITIAL)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [state, setState] = useState<SubmitState>('idle')

  const fieldId = (name: FieldName) => `${baseId}-${name}`
  const errorId = (name: FieldName) => `${baseId}-${name}-error`

  const set =
    (name: FieldName) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [name]: e.target.value }))
      // Clear a field's error as soon as the user edits it.
      setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
    }

  function validate(): Partial<Record<FieldName, string>> {
    const next: Partial<Record<FieldName, string>> = {}
    for (const name of REQUIRED) {
      if (!values[name].trim()) next[name] = 'This field is required.'
    }
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return

    // A filled honeypot means a bot; do nothing and show the success state so we
    // don't hint at the trap. The server rejects it too, defence in depth.
    if (honeypot) {
      setState('success')
      return
    }

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setState('error')
      return
    }

    setState('submitting')
    setErrors({})

    try {
      const res = await fetch('/api/speaking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, botField: honeypot }),
      })
      if (res.ok) {
        setState('success')
        setValues(INITIAL)
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div
        className="card"
        style={{ padding: 40 }}
        role="status"
        aria-live="polite"
        data-testid="keynotes-form-success"
      >
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: 'var(--fl-green)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 20,
          }}
        >
          ✓
        </div>
        <h3 className="h4" style={{ marginBottom: 12 }}>
          Request received.
        </h3>
        <p className="p" style={{ fontSize: 16 }}>
          Thanks — your speaking request is in. Aziz responds to event organizers personally,
          usually within 3 business days.
        </p>
      </div>
    )
  }

  const showFormError = state === 'error' && Object.keys(errors).length === 0

  return (
    <form
      className="card"
      style={{ padding: 40 }}
      onSubmit={handleSubmit}
      noValidate
      data-testid="keynotes-form"
    >
      <div className="form-row form-row--2">
        <Field
          name="contactName"
          label="Your name"
          required
          value={values.contactName}
          onChange={set('contactName')}
          error={errors.contactName}
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="email"
          label="Work email"
          type="email"
          required
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <div className="form-row">
        <Field
          name="organization"
          label="Organization"
          value={values.organization}
          onChange={set('organization')}
          error={errors.organization}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <div className="form-row form-row--2">
        <Field
          name="eventName"
          label="Event name"
          required
          value={values.eventName}
          onChange={set('eventName')}
          error={errors.eventName}
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="eventDate"
          label="Event date or timeframe"
          required
          value={values.eventDate}
          onChange={set('eventDate')}
          error={errors.eventDate}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <div className="form-row form-row--2">
        <Field
          name="audienceSize"
          label="Audience size"
          value={values.audienceSize}
          onChange={set('audienceSize')}
          error={errors.audienceSize}
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="budgetRange"
          label="Budget range"
          value={values.budgetRange}
          onChange={set('budgetRange')}
          error={errors.budgetRange}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field__label" htmlFor={fieldId('topicInterest')}>
          Topic interest
        </label>
        <select
          id={fieldId('topicInterest')}
          className="select"
          value={values.topicInterest}
          onChange={set('topicInterest')}
        >
          {TOPIC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 24 }}>
        <label className="field__label" htmlFor={fieldId('message')}>
          Anything else?
        </label>
        <textarea
          id={fieldId('message')}
          className="textarea"
          value={values.message}
          onChange={set('message')}
        />
      </div>

      {/* Honeypot — visually hidden, kept out of the tab order and off assistive
          tech. A real visitor never fills it; a bot that fills every field trips
          the server-side `botField` validator. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        <label htmlFor={`${baseId}-company`}>Company (leave this blank)</label>
        <input
          id={`${baseId}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {showFormError && (
        <p
          role="alert"
          style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}
          data-testid="keynotes-form-error"
        >
          Something went wrong sending your request. Please try again, or email us directly.
        </p>
      )}

      <button
        type="submit"
        className="btn btn--primary btn--lg"
        style={{ width: '100%', opacity: state === 'submitting' ? 0.7 : 1 }}
        disabled={state === 'submitting'}
        aria-busy={state === 'submitting'}
      >
        {state === 'submitting' ? 'Sending…' : 'Submit speaking request'}
      </button>
    </form>
  )
}

// ---------------- field primitive ----------------
// Text/email input wrapped in the design's `.field` / `.field__label` / `.input`
// markup, with inline validation wiring (aria-invalid + aria-describedby).

type FieldProps = {
  name: FieldName
  label: string
  type?: 'text' | 'email'
  required?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  fieldId: (name: FieldName) => string
  errorId: (name: FieldName) => string
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  value,
  onChange,
  error,
  fieldId,
  errorId,
}: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId(name)}>
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true">*</span>
          </>
        )}
      </label>
      <input
        id={fieldId(name)}
        className="input"
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(name) : undefined}
      />
      {error && (
        <span id={errorId(name)} style={{ color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </span>
      )}
    </div>
  )
}
