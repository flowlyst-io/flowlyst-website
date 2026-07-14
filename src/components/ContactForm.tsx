'use client'

import React, { useId, useState } from 'react'

/**
 * Contact form — the ONLY client island on the /contact page
 * (design/site/pages.jsx `ContactPage` form). The page heading, lead, and
 * alternative-contact info stay server-rendered in page.tsx; only the interactive
 * `<form>` is a client component, so the crawlable content is untouched (review
 * invariant a).
 *
 * Delivery path (invariant d): submit POSTs JSON to the auto-generated Payload REST
 * endpoint `POST /api/contact-messages`, whose `create: anyone` access lets an
 * anonymous visitor persist a `contact-messages` document. Validation is
 * two-layered — this island blocks obviously-bad input before the request, and the
 * collection re-validates server-side (required name/email/message, email format,
 * the `reason` enum, and the `botField` honeypot) so the boundary holds even if the
 * client is bypassed. The collection's `afterChange` notifier emails info@ on
 * create but no-ops without mail keys configured; persistence is the delivery
 * (PRD §8.2 — the design's reCAPTCHA is realized as the hidden honeypot).
 *
 * Mirrors src/components/solutions/SpeakingRequestForm.tsx (honeypot,
 * focus-first-invalid, success/error states, aria wiring).
 */

const REASON_OPTIONS = [
  { value: 'press', label: 'Press' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'training', label: 'Training question' },
  { value: 'support', label: 'Support' },
  { value: 'other', label: 'Other' },
] as const

type FieldName = 'name' | 'email' | 'reason' | 'message'

type FormValues = Record<FieldName, string>

const INITIAL: FormValues = {
  name: '',
  email: '',
  reason: '',
  message: '',
}

// Required fields validated client-side (the server enforces the same set).
// `reason` is optional — omitted from the payload when left on "Choose…".
const REQUIRED: FieldName[] = ['name', 'email', 'message']

// Pragmatic email shape check — the real authority is the collection's `email`
// field type, which re-validates server-side.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm() {
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
      // Move focus to the first invalid field (form order == REQUIRED order) so
      // keyboard/AT users land on the problem. The inputs stay mounted through the
      // error re-render.
      const firstInvalid = REQUIRED.find((name) => nextErrors[name])
      if (firstInvalid) document.getElementById(fieldId(firstInvalid))?.focus()
      return
    }

    setState('submitting')
    setErrors({})

    // Omit `reason` entirely when unselected — it is optional, and posting an empty
    // string would fail the collection's enum validation.
    const payload: Record<string, string> = {
      name: values.name,
      email: values.email,
      message: values.message,
      botField: honeypot,
    }
    if (values.reason) payload.reason = values.reason

    try {
      const res = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        data-testid="contact-form-success"
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
          Message received.
        </h2>
        <p className="p" style={{ fontSize: 16 }}>
          Thanks — your message is in. We read every note and reply to real inquiries, usually
          within a couple of business days.
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
      data-testid="contact-form"
    >
      <div className="form-row">
        <div className="field">
          <label className="field__label" htmlFor={fieldId('name')}>
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId('name')}
            className="input"
            type="text"
            value={values.name}
            onChange={set('name')}
            required
            aria-required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? errorId('name') : undefined}
          />
          {errors.name && (
            <span id={errorId('name')} style={{ color: 'var(--danger)', fontSize: 13 }}>
              {errors.name}
            </span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field__label" htmlFor={fieldId('email')}>
            Work email <span aria-hidden="true">*</span>
          </label>
          <input
            id={fieldId('email')}
            className="input"
            type="email"
            value={values.email}
            onChange={set('email')}
            required
            aria-required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errorId('email') : undefined}
          />
          {errors.email && (
            <span id={errorId('email')} style={{ color: 'var(--danger)', fontSize: 13 }}>
              {errors.email}
            </span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field__label" htmlFor={fieldId('reason')}>
            Reason
          </label>
          <select
            id={fieldId('reason')}
            className="select"
            value={values.reason}
            onChange={set('reason')}
          >
            <option value="">Choose…</option>
            {REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field__label" htmlFor={fieldId('message')}>
            Message <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={fieldId('message')}
            className="textarea"
            style={{ minHeight: 140 }}
            value={values.message}
            onChange={set('message')}
            required
            aria-required
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? errorId('message') : undefined}
          />
          {errors.message && (
            <span id={errorId('message')} style={{ color: 'var(--danger)', fontSize: 13 }}>
              {errors.message}
            </span>
          )}
        </div>
      </div>

      {/* Honeypot — visually hidden, kept out of the tab order and off assistive
          tech. A real visitor never fills it; a bot that fills every field trips
          the server-side `botField` validator. The name/id/label are a
          non-semantic token ("botField"), NOT a real field name like company or
          email: password managers and browser autofill ignore autoComplete="off"
          and fill by field semantics, which would fill the trap for a real user
          and kill their lead. Keep this name off every autofill heuristic. */}
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
          data-testid="contact-form-error"
        >
          Something went wrong sending your message. Please try again, or email us directly at
          info@flowlyst.io.
        </p>
      )}

      <button
        type="submit"
        className="btn btn--primary btn--lg"
        style={{ width: '100%', opacity: state === 'submitting' ? 0.7 : 1 }}
        disabled={state === 'submitting'}
        aria-busy={state === 'submitting'}
      >
        {state === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
