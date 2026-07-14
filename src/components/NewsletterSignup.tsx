'use client'

import React, { useId, useState } from 'react'

/**
 * Newsletter signup — a reusable client island (PRD §8.3). A single email field
 * + Subscribe button matching the design's `/blog` newsletter row
 * (design/site/pages.jsx `BlogIndexPage` NEWSLETTER section), plus an invisible
 * honeypot and inline success/error states. The surrounding sage band, eyebrow,
 * heading and lead belong to the *mount* (issue #17 / the blog page), so this
 * component is just the interactive form and drops into any context.
 *
 * Delivery path (invariant d): POSTs JSON to the custom Payload endpoint
 * `POST /api/newsletter-subscribers/subscribe` — the ONLY public write path for
 * this collection (raw `create` is Admin-only). That endpoint is idempotent and
 * returns a **uniform `200 { ok: true }` for every outcome** (new subscribe,
 * re-subscribe, honeypot, malformed) so membership can't be enumerated from the
 * response. Consequences for this UI:
 *   - Success copy is generic and outcome-neutral — it must never imply new vs.
 *     already-subscribed (the endpoint deliberately hides that).
 *   - The error state fires ONLY on a network failure / non-2xx (a 5xx), never on
 *     a "already subscribed" or "invalid" outcome, because those also return 200.
 *
 * `source` (optional) tags where the signup came from (e.g. "blog") and is stored
 * on the subscriber row. Mirrors SpeakingRequestForm's a11y/state patterns scaled
 * down to one field.
 */

// Pragmatic email shape check before we POST; the endpoint re-validates with the
// same intent server-side (it returns the uniform 200 either way).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export type NewsletterSignupProps = {
  /** Where the signup came from — stored on the subscriber row (e.g. "blog"). */
  source?: string
}

export function NewsletterSignup({ source }: NewsletterSignupProps) {
  const baseId = useId()
  const emailId = `${baseId}-email`
  const errorId = `${baseId}-email-error`

  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [state, setState] = useState<SubmitState>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return

    // A filled honeypot means a bot: show success without POSTing so the trap is
    // never hinted at. The endpoint also rejects it (defence in depth).
    if (honeypot) {
      setState('success')
      return
    }

    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setFieldError('Enter a valid email address.')
      setState('error')
      document.getElementById(emailId)?.focus()
      return
    }

    setState('submitting')
    setFieldError(undefined)

    try {
      const res = await fetch('/api/newsletter-subscribers/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source, botField: honeypot }),
      })
      // The endpoint returns 200 for every real outcome; a non-ok response is a
      // genuine network/5xx failure, so that is the only thing the error state
      // reflects.
      if (res.ok) {
        setState('success')
        setEmail('')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <p
        role="status"
        aria-live="polite"
        data-testid="newsletter-success"
        style={{ fontSize: 16, fontWeight: 700, color: 'var(--fl-green-700)', margin: 0 }}
      >
        You’re on the list. One email a month — no fluff.
      </p>
    )
  }

  // A non-ok fetch leaves `fieldError` unset — that's how we tell a network/5xx
  // failure (form-level alert) from a client-side invalid-email error.
  const showNetworkError = state === 'error' && !fieldError

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="newsletter-form">
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={emailId}
          className="input"
          type="email"
          placeholder="you@district.k12.us"
          aria-label="Email address"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? errorId : undefined}
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldError) setFieldError(undefined)
          }}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={state === 'submitting'}
          aria-busy={state === 'submitting' || undefined}
          style={{ opacity: state === 'submitting' ? 0.7 : 1 }}
        >
          {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>

      {/* Honeypot — visually hidden, out of the tab order and off assistive tech.
          A real visitor never fills it; a bot that fills every field trips the
          server-side `botField` check. The name is a non-semantic token, NOT a
          real field name like `company` or `email`: browser autofill / password
          managers fill by field semantics (ignoring autoComplete="off"), which
          would fill the trap for a real user and silently drop their signup. Keep
          this name off every autofill heuristic. */}
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

      {fieldError && (
        <p
          id={errorId}
          role="alert"
          data-testid="newsletter-error"
          style={{ color: 'var(--danger)', fontSize: 13, margin: '8px 0 0' }}
        >
          {fieldError}
        </p>
      )}

      {showNetworkError && (
        <p
          role="alert"
          data-testid="newsletter-error"
          style={{ color: 'var(--danger)', fontSize: 13, margin: '8px 0 0' }}
        >
          Something went wrong. Please try again in a moment.
        </p>
      )}
    </form>
  )
}
