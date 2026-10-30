'use client'

import { Button, useConfig, useFormFields } from '@payloadcms/ui'
import { useMemo, useState } from 'react'

import { buildRainfallQr } from '@/utilities/qr/rainfallQr'
import { downloadBlob, svgToPngBlob } from '@/utilities/qr/qrClient'

const CARD_NOTE =
  "Printing this card or writing an NFC tag? Create a Link that points to this card's URL and use the Link's QR code, so you can change where it goes later."

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <code data-testid="qr-url" style={{ wordBreak: 'break-all' }}>
        {url}
      </code>
      <Button
        buttonStyle="secondary"
        size="small"
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}

export function QrPanel({ kind }: { kind: 'link' | 'card' }) {
  const { config } = useConfig()
  const origin = config.serverURL ?? ''
  const code = useFormFields(([fields]) => fields.code?.value as string | undefined)
  const slug = useFormFields(([fields]) => fields.slug?.value as string | undefined)
  const [error, setError] = useState<string | null>(null)

  const primary = kind === 'link' ? code : slug
  const url = primary ? `${origin}/${kind === 'link' ? 'go' : 'card'}/${primary}` : null
  const slugUrl = kind === 'link' && slug ? `${origin}/go/${slug}` : null
  const qr = useMemo(() => (url ? buildRainfallQr(url) : null), [url])

  if (!url || !qr) {
    return (
      <div className="field-type">
        <p>Save to generate the QR code.</p>
      </div>
    )
  }

  const base = `flowlyst-${kind === 'link' ? 'go' : 'card'}-${primary}`

  return (
    <div className="field-type" data-testid="qr-panel">
      <h4>{kind === 'link' ? 'Link and QR code' : 'Card URL and QR code'}</h4>
      <CopyUrl url={url} />
      {slugUrl && <CopyUrl url={slugUrl} />}
      {kind === 'card' && <p>{CARD_NOTE}</p>}
      <div
        role="img"
        aria-label={`QR code for ${url}`}
        style={{ width: 240, height: 240, margin: '12px 0' }}
        dangerouslySetInnerHTML={{
          __html: qr.svg.replace(/width="[^"]*" height="[^"]*"/, 'width="240" height="240"'),
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          buttonStyle="secondary"
          type="button"
          onClick={() => downloadBlob(new Blob([qr.svg], { type: 'image/svg+xml' }), `${base}.svg`)}
        >
          Download SVG
        </Button>
        <Button
          buttonStyle="secondary"
          type="button"
          onClick={() => {
            setError(null)
            svgToPngBlob(qr.svg, 2048)
              .then((blob) => downloadBlob(blob, `${base}.png`))
              .catch((e: unknown) => setError(e instanceof Error ? e.message : 'PNG export failed'))
          }}
        >
          Download PNG
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
