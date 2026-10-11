import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ClientModule = typeof import('@/utilities/recaptchaClient')

const scripts = () => document.querySelectorAll('script[src*="recaptcha"]')

async function freshClient(): Promise<ClientModule> {
  vi.resetModules()
  return import('@/utilities/recaptchaClient')
}

beforeEach(() => {
  document.head.innerHTML = ''
  vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site-key')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  delete (window as unknown as { grecaptcha?: unknown }).grecaptcha
})

describe('recaptchaClient', () => {
  it('resolves null and adds no script without a key', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '')
    const { getRecaptchaToken } = await freshClient()
    expect(await getRecaptchaToken('contact')).toBeNull()
    expect(scripts()).toHaveLength(0)
  })

  it('injects exactly one script for repeated loads', async () => {
    const { loadRecaptcha } = await freshClient()
    void loadRecaptcha()
    void loadRecaptcha()
    expect(scripts()).toHaveLength(1)
    expect(scripts()[0].getAttribute('src')).toContain('render=site-key')
  })

  it('returns the token and passes the action to execute', async () => {
    const execute = vi.fn().mockResolvedValue('the-token')
    ;(window as unknown as { grecaptcha: unknown }).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute,
    }
    const { getRecaptchaToken } = await freshClient()
    const pending = getRecaptchaToken('demo_request')
    scripts()[0].dispatchEvent(new Event('load'))
    expect(await pending).toBe('the-token')
    expect(execute).toHaveBeenCalledWith('site-key', { action: 'demo_request' })
  })

  it('resolves null when the script fails to load', async () => {
    const { getRecaptchaToken } = await freshClient()
    const pending = getRecaptchaToken('contact')
    scripts()[0].dispatchEvent(new Event('error'))
    expect(await pending).toBeNull()
  })

  it('resolves null after 5 seconds when execute hangs', async () => {
    vi.useFakeTimers()
    ;(window as unknown as { grecaptcha: unknown }).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: () => new Promise(() => {}),
    }
    const { getRecaptchaToken } = await freshClient()
    const pending = getRecaptchaToken('contact')
    scripts()[0].dispatchEvent(new Event('load'))
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBeNull()
  })
})

describe('RecaptchaNotice', () => {
  it('renders nothing without a key', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '')
    const { RecaptchaNotice } = await import('@/components/RecaptchaNotice')
    const { container } = render(<RecaptchaNotice />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the attribution with both Google links when keyed', async () => {
    const { RecaptchaNotice } = await import('@/components/RecaptchaNotice')
    const { container, getByRole } = render(<RecaptchaNotice />)
    expect(container.textContent).toContain('This site is protected by reCAPTCHA')
    expect(getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe(
      'https://policies.google.com/privacy',
    )
    expect(getByRole('link', { name: 'Terms of Service' }).getAttribute('href')).toBe(
      'https://policies.google.com/terms',
    )
  })
})
