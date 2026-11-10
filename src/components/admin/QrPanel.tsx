'use client'

import { Button, useConfig, useFormFields } from '@payloadcms/ui'
import { useMemo, useState } from 'react'

import { buildRainfallQr, QR_COLORS, type QrColor } from '@/utilities/qr/rainfallQr'
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

const COLOR_LABELS: Record<QrColor, string> = {
  black: 'Black',
  white: 'White',
  violet: 'flowlyst purple',
}

function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '8px 0' }}>
      <legend style={{ fontWeight: 600, marginBottom: 4 }}>{legend}</legend>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {options.map((option) => (
          <label key={option.value} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function QrPanel({ kind }: { kind: 'link' | 'card' }) {
  const { config } = useConfig()
  const origin = config.serverURL ?? ''
  const code = useFormFields(([fields]) => fields.code?.value as string | undefined)
  const slug = useFormFields(([fields]) => fields.slug?.value as string | undefined)
  const [color, setColor] = useState<QrColor>('black')
  const [logo, setLogo] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primary = kind === 'link' ? code : slug
  const url = primary ? `${origin}/${kind === 'link' ? 'go' : 'card'}/${primary}` : null
  const slugUrl = kind === 'link' && slug ? `${origin}/go/${slug}` : null
  const qr = useMemo(() => (url ? buildRainfallQr(url, { color, logo }) : null), [url, color, logo])

  if (!url || !qr) {
    return (
      <div className="field-type">
        <p>Save to generate the QR code.</p>
      </div>
    )
  }

  const base = `flowlyst-${kind === 'link' ? 'go' : 'card'}-${primary}-${color}-${logo ? 'logo' : 'nologo'}`

  return (
    <div className="field-type" data-testid="qr-panel">
      <h4>{kind === 'link' ? 'Link and QR code' : 'Card URL and QR code'}</h4>
      <CopyUrl url={url} />
      {slugUrl && <CopyUrl url={slugUrl} />}
      {kind === 'card' && <p>{CARD_NOTE}</p>}
      <RadioGroup
        legend="Colour"
        name={`qr-colour-${kind}`}
        value={color}
        options={(Object.keys(QR_COLORS) as QrColor[]).map((c) => ({
          value: c,
          label: COLOR_LABELS[c],
        }))}
        onChange={setColor}
      />
      <RadioGroup
        legend="Logo"
        name={`qr-logo-${kind}`}
        value={logo ? 'logo' : 'nologo'}
        options={[
          { value: 'logo', label: 'With logo' },
          { value: 'nologo', label: 'Without logo' },
        ]}
        onChange={(v) => setLogo(v === 'logo')}
      />
      <div
        data-testid="qr-swatch"
        style={{
          display: 'inline-block',
          padding: 16,
          margin: '12px 0',
          background: color === 'white' ? QR_COLORS.black : QR_COLORS.white,
        }}
      >
        <div
          role="img"
          data-testid="qr-preview"
          aria-label={`QR code for ${url}, ${COLOR_LABELS[color].toLowerCase()}, ${logo ? 'with logo' : 'without logo'}`}
          style={{ width: 240, height: 240 }}
          dangerouslySetInnerHTML={{
            __html: qr.svg.replace(/width="[^"]*" height="[^"]*"/, 'width="240" height="240"'),
          }}
        />
      </div>
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
