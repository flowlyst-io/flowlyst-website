'use client'

import React, { useId, useState } from 'react'

/**
 * Demo-request form — the client island on `/request-demo`, the highest-intent
 * lead path (review invariant d). Built against design/site/pages.jsx
 * `RequestDemoPage`; the page's heading/lead/proof column stay server-rendered in
 * page.tsx, so only this interactive `<form>` is a client component (invariant a).
 *
 * Delivery: POSTs JSON to the raw Payload REST endpoint `POST /api/demo-requests`
 * (`create: anyone`). Two-layer validation — this island blocks bad input, and the
 * DemoRequests collection re-validates server-side (required fullName/workEmail,
 * email format, the required-true `consent`, and the `botField` honeypot). The
 * `afterChange` notifier (Phase 3 foundation) emails sales; email can't fail
 * persistence.
 *
 * Field reconciliation (comp vs collection): the comp marks Title / District /
 * Phone / Date preference required, so those are enforced CLIENT-side to match the
 * asterisks; the server's hard-required subset is fullName / workEmail / consent.
 * The comp's single "Anything else?" textarea maps to the collection's
 * `anythingElse` (the collection's `message` field is not rendered by the comp).
 * The comp's reCAPTCHA placeholder is omitted (reCAPTCHA is parked; the honeypot
 * is the spam measure).
 */

const INTEREST_OPTIONS = [
  { value: 'ai-training', label: 'AI Training' },
  { value: 'budget-software', label: 'Budget Software' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'keynotes', label: 'Keynotes' },
] as const

const HEARD_OPTIONS = [
  { value: '', label: '—' },
  { value: 'google', label: 'Google search' },
  { value: 'ai-assistant', label: 'AI assistant (ChatGPT, Claude, etc.)' },
  { value: 'referral', label: 'Referral' },
  { value: 'event', label: 'Event or conference' },
  { value: 'social', label: 'LinkedIn / social' },
  { value: 'other', label: 'Other' },
] as const

type TextField =
  | 'fullName'
  | 'title'
  | 'district'
  | 'workEmail'
  | 'phone'
  | 'datePreference'
  | 'districtSize'
  | 'anythingElse'

type Values = {
  fullName: string
  title: string
  district: string
  workEmail: string
  phone: string
  datePreference: string
  districtSize: string
  anythingElse: string
  heardAboutUs: string
  interests: string[]
  consent: boolean
}

const INITIAL: Values = {
  fullName: '',
  title: '',
  district: '',
  workEmail: '',
  phone: '',
  datePreference: '',
  districtSize: '',
  anythingElse: '',
  heardAboutUs: '',
  interests: [],
  consent: false,
}

// Client-required set = the server's hard-required set (fullName / workEmail /
// consent + email format). Adjudication on #14: PRD §8.1 "keep it short" beats the
// comp's required-markers on title / district / phone / date, and aligning the
// client to the server contract avoids over-blocking the highest-intent form.
// Those four fields render without an asterisk and never block submission.
type ErrorKey = 'fullName' | 'workEmail' | 'consent'

// The required text fields are exactly the non-consent error keys (all of them
// are also TextField / Values keys), so validation can index both records safely.
type RequiredTextField = Exclude<ErrorKey, 'consent'>

const REQUIRED_TEXT: RequiredTextField[] = ['fullName', 'workEmail']

// Focus order for the first-invalid field (mirrors visual/DOM order).
const FOCUS_ORDER: ErrorKey[] = ['fullName', 'workEmail', 'consent']

// Pragmatic email shape check — the collection's `email` field re-validates server-side.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function DemoRequestForm() {
  const baseId = useId()
  const [values, setValues] = useState<Values>(INITIAL)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({})
  const [state, setState] = useState<SubmitState>('idle')

  const fieldId = (name: string) => `${baseId}-${name}`
  const errorId = (name: string) => `${baseId}-${name}-error`

  const clearError = (name: ErrorKey) =>
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))

  const setText =
    (name: TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value
      setValues((prev) => ({ ...prev, [name]: v }))
      // Only the required text fields carry errors (districtSize / anythingElse don't).
      if ((REQUIRED_TEXT as string[]).includes(name)) clearError(name as ErrorKey)
    }

  const toggleInterest = (val: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setValues((prev) => ({
      ...prev,
      interests: checked ? [...prev.interests, val] : prev.interests.filter((i) => i !== val),
    }))
  }

  const setConsent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setValues((prev) => ({ ...prev, consent: checked }))
    clearError('consent')
  }

  function validate(): Partial<Record<ErrorKey, string>> {
    const next: Partial<Record<ErrorKey, string>> = {}
    for (const name of REQUIRED_TEXT) {
      if (!values[name].trim()) next[name] = 'This field is required.'
    }
    if (values.workEmail.trim() && !EMAIL_RE.test(values.workEmail.trim())) {
      next.workEmail = 'Enter a valid email address.'
    }
    if (!values.consent) next.consent = 'Please agree to be contacted so we can reach you.'
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return

    // Filled honeypot → a bot; show success without hinting at the trap. The
    // server rejects it too (defence in depth).
    if (honeypot) {
      setState('success')
      return
    }

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setState('error')
      const firstInvalid = FOCUS_ORDER.find((name) => nextErrors[name])
      if (firstInvalid) document.getElementById(fieldId(firstInvalid))?.focus()
      return
    }

    setState('submitting')
    setErrors({})

    // Drop heardAboutUs when blank — an empty string isn't a valid enum member.
    const { heardAboutUs, ...rest } = values
    const body = {
      ...rest,
      botField: honeypot,
      ...(heardAboutUs ? { heardAboutUs } : {}),
    }

    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        data-testid="demo-form-success"
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
        <h2 className="h4" style={{ marginBottom: 12 }}>
          Request received.
        </h2>
        <p className="p" style={{ fontSize: 16 }}>
          Thanks — we’ll be in touch, usually the same business day. Aziz or a senior consultant
          will reach out to schedule your walkthrough.
        </p>
      </div>
    )
  }

  const showFormError = state === 'error' && Object.keys(errors).length === 0
  const interestsLabelId = fieldId('interests-label')

  return (
    <form
      className="card"
      style={{ padding: 40 }}
      onSubmit={handleSubmit}
      noValidate
      data-testid="demo-form"
    >
      <div className="form-row form-row--2">
        <Field
          name="fullName"
          label="Full name"
          required
          value={values.fullName}
          onChange={setText('fullName')}
          error={errors.fullName}
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="title"
          label="Title"
          value={values.title}
          onChange={setText('title')}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <div className="form-row form-row--2">
        <Field
          name="district"
          label="District / org"
          value={values.district}
          onChange={setText('district')}
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="workEmail"
          label="Work email"
          type="email"
          required
          value={values.workEmail}
          onChange={setText('workEmail')}
          error={errors.workEmail}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      <div className="form-row form-row--2">
        <Field
          name="phone"
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={setText('phone')}
          fieldId={fieldId}
          errorId={errorId}
        />
        <Field
          name="datePreference"
          label="Date preference"
          type="date"
          value={values.datePreference}
          onChange={setText('datePreference')}
          fieldId={fieldId}
          errorId={errorId}
        />
      </div>

      {/* Interests — optional multi-select chips (role=group for AT). */}
      <div
        className="field"
        style={{ marginBottom: 24 }}
        role="group"
        aria-labelledby={interestsLabelId}
      >
        <span className="field__label" id={interestsLabelId}>
          Interests · multi-select
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {INTEREST_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                style={{ accentColor: 'var(--fl-green)' }}
                checked={values.interests.includes(opt.value)}
                onChange={toggleInterest(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Optional details (PRD §8.1 v1 additions). */}
      <div style={{ padding: 20, background: 'var(--c-cream)', borderRadius: 4, marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--c-ink-3)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Optional — helps us tailor the call
        </div>
        <div className="form-row form-row--2">
          <Field
            name="districtSize"
            label="District size"
            placeholder="Students or schools"
            value={values.districtSize}
            onChange={setText('districtSize')}
            fieldId={fieldId}
            errorId={errorId}
          />
          <div className="field">
            <label className="field__label" htmlFor={fieldId('heardAboutUs')}>
              How did you hear?
            </label>
            <select
              id={fieldId('heardAboutUs')}
              className="select"
              value={values.heardAboutUs}
              onChange={(e) => setValues((prev) => ({ ...prev, heardAboutUs: e.target.value }))}
            >
              {HEARD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field__label" htmlFor={fieldId('anythingElse')}>
            Anything else?
          </label>
          <textarea
            id={fieldId('anythingElse')}
            className="textarea"
            value={values.anythingElse}
            onChange={setText('anythingElse')}
          />
        </div>
      </div>

      {/* Consent — required-true; server 400s without it. */}
      <label
        htmlFor={fieldId('consent')}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: errors.consent ? 8 : 20,
          fontSize: 13,
          color: 'var(--c-ink-2)',
        }}
      >
        <input
          id={fieldId('consent')}
          type="checkbox"
          style={{ marginTop: 2, accentColor: 'var(--fl-green)' }}
          checked={values.consent}
          onChange={setConsent}
          aria-required="true"
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? errorId('consent') : undefined}
        />
        <span>
          I agree to flowlyst’s privacy policy and to be contacted about my demo request.{' '}
          <span aria-hidden="true">*</span>
        </span>
      </label>
      {errors.consent && (
        <p
          id={errorId('consent')}
          style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 20 }}
        >
          {errors.consent}
        </p>
      )}

      {/* Honeypot — visually hidden, out of tab order and off AT. Non-semantic
          name/id/label so autofill never fills it (would kill a real lead). */}
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
        <label htmlFor={`${baseId}-botField`}>Leave this field empty</label>
        <input
          id={`${baseId}-botField`}
          name="botField"
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
          data-testid="demo-form-error"
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
        {state === 'submitting' ? 'Sending…' : 'Request demo'}{' '}
        <span className="arr" aria-hidden="true" style={{ display: 'inline-block' }}>
          →
        </span>
      </button>
    </form>
  )
}

// ---------------- field primitive ----------------
// Text-like input in the design's `.field` / `.field__label` / `.input` markup,
// with inline validation wiring (aria-invalid + aria-describedby).

type FieldProps = {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'date'
  required?: boolean
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  fieldId: (name: string) => string
  errorId: (name: string) => string
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  placeholder,
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
        placeholder={placeholder}
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
