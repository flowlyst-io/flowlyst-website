'use client'

import { Button, useConfig, useDocumentEvents, useField, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CROP_ZOOM_MAX,
  CROP_ZOOM_MIN,
  clampCrop,
  cropPlacement,
  normalizeCrop,
  panCrop,
  type HeadshotCrop,
} from '@/utilities/headshotCropShared'
import { withMediaVersion } from '@/utilities/mediaSrc'
import '@/components/card/headshotDiamond.css'
import './HeadshotCropField.css'

type MediaDoc = {
  url?: string | null
  alt?: string | null
  mimeType?: string | null
  updatedAt?: string | null
  filename?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
}

const DEFAULT_CROP: HeadshotCrop = { zoom: 1, x: 0.5, y: 0.5, aspect: null }
const HELP =
  'This is how the photo looks on the card and in saved contacts. Save the card to keep it.'

export function HeadshotCropField() {
  const { config } = useConfig()
  const headshot = useFormFields(([fields]) => fields.headshot?.value as unknown)
  const headshotId =
    headshot && typeof headshot === 'object' ? (headshot as { id?: number | string }).id : headshot
  const hasHeadshot = headshotId !== undefined && headshotId !== null && headshotId !== ''

  const { mostRecentUpdate } = useDocumentEvents()
  const mediaEvent =
    mostRecentUpdate?.entitySlug === 'media' && String(mostRecentUpdate.id) === String(headshotId)
      ? mostRecentUpdate
      : null

  const zoomField = useField<number | null>({ path: 'headshotCrop.zoom' })
  const xField = useField<number | null>({ path: 'headshotCrop.x' })
  const yField = useField<number | null>({ path: 'headshotCrop.y' })
  const aspectField = useField<number | null>({ path: 'headshotCrop.aspect' })

  // Each piece of state remembers which photo it belongs to, so a different photo starts clean.
  const [loaded, setLoaded] = useState<{ id: unknown; media?: MediaDoc; failed?: boolean }>({
    id: undefined,
  })
  const [natural, setNatural] = useState<{ id: unknown; aspect?: number; failed?: boolean }>({
    id: undefined,
  })
  const [draftState, setDraftState] = useState<{ id: unknown; crop: HeadshotCrop | null }>({
    id: undefined,
    crop: null,
  })
  const own = <T extends { id: unknown }>(state: T) => state.id === headshotId
  const media = own(loaded) ? (loaded.media ?? null) : null
  const failed = (own(loaded) && loaded.failed) || (own(natural) && natural.failed) || false
  const naturalAspect = own(natural) ? (natural.aspect ?? null) : null
  const draft = own(draftState) ? draftState.crop : null
  const setDraft = (crop: HeadshotCrop | null) => setDraftState({ id: headshotId, crop })

  const stored =
    normalizeCrop({
      zoom: zoomField.value,
      x: xField.value,
      y: yField.value,
      aspect: aspectField.value,
    }) ?? DEFAULT_CROP
  const latest = useRef(stored)
  const setters = useRef({ zoomField, xField, yField, aspectField })
  useEffect(() => {
    latest.current = stored
    setters.current = { zoomField, xField, yField, aspectField }
  })

  const write = useCallback((crop: HeadshotCrop | null) => {
    const s = setters.current
    s.zoomField.setValue(crop ? crop.zoom : null)
    s.xField.setValue(crop ? crop.x : null)
    s.yField.setValue(crop ? crop.y : null)
    s.aspectField.setValue(crop ? crop.aspect : null)
  }, [])

  const clearCrop = useCallback(() => {
    const s = setters.current
    const hasValue = [s.zoomField, s.xField, s.yField, s.aspectField].some(
      (f) => f.value !== null && f.value !== undefined,
    )
    if (hasValue) write(null)
  }, [write])

  // Compares the file itself, never the event: the event outlives navigation, so a stale one on
  // mount must not reset a saved crop. Alt, caption and focal edits leave the signature alone.
  const fileFacts = useRef<{ id: unknown; sig: string } | null>(null)

  useEffect(() => {
    if (!hasHeadshot) return
    const controller = new AbortController()
    fetch(`${config.routes.api}/media/${headshotId}?depth=0`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<MediaDoc>
      })
      .then((doc) => {
        const sig = [doc.filename, doc.filesize, doc.width, doc.height].join('|')
        const facts = fileFacts.current
        if (facts && facts.id === headshotId && facts.sig !== sig) {
          // Hide the old photo and lock zoom until the new file loads, so its aspect is never
          // written against the old one.
          setNatural({ id: undefined })
          setDraftState({ id: headshotId, crop: null })
          latest.current = DEFAULT_CROP
          clearCrop()
        }
        fileFacts.current = { id: headshotId, sig }
        setLoaded({ id: headshotId, media: doc })
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'AbortError')
          setLoaded({ id: headshotId, failed: true })
      })
    return () => controller.abort()
  }, [config.routes.api, hasHeadshot, headshotId, mediaEvent, clearCrop])

  const previousId = useRef(headshotId)
  useEffect(() => {
    if (previousId.current === headshotId) return
    previousId.current = headshotId
    clearCrop()
  }, [headshotId, clearCrop])

  const dragStart = useRef<{ x: number; y: number; crop: HeadshotCrop } | null>(null)

  if (!hasHeadshot) return null

  const wrapper = (children: React.ReactNode) => (
    <div className="field-type headshot-crop" data-testid="headshot-crop">
      <h4>Adjust photo</h4>
      {children}
    </div>
  )

  if (failed) return wrapper(<p role="alert">Could not load the photo.</p>)
  if (media?.mimeType === 'image/svg+xml') {
    return wrapper(<p role="alert">This image type cannot be adjusted.</p>)
  }

  const aspect = naturalAspect ?? 1
  const current = draft ?? stored
  const placement = cropPlacement(current, aspect)
  const src = media?.url
    ? withMediaVersion(media.url.replace(config.serverURL ?? '', ''), media.updatedAt)
    : undefined

  const commit = (crop: HeadshotCrop) => {
    const clamped = clampCrop(crop, aspect)
    const next = normalizeCrop({ ...clamped, aspect: naturalAspect })
    if (next) {
      latest.current = next
      write(next)
    }
  }

  const nudge = (dx: number, dy: number) => commit(panCrop(latest.current, dx, dy, aspect))

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 16 : 4
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[e.key]
    if (!move || naturalAspect === null) return
    e.preventDefault()
    nudge(move[0], move[1])
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (naturalAspect === null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY, crop: latest.current }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (!start) return
    setDraft(panCrop(start.crop, e.clientX - start.x, e.clientY - start.y, aspect))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (!start) return
    dragStart.current = null
    const moved = panCrop(start.crop, e.clientX - start.x, e.clientY - start.y, aspect)
    setDraft(null)
    if (e.clientX !== start.x || e.clientY !== start.y) commit(moved)
  }

  return wrapper(
    <>
      <div
        className="headshot-crop__stage"
        data-testid="headshot-crop-stage"
        role="group"
        aria-label="Photo position. Drag, or use the arrow keys, to move the photo inside the diamond."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="card__diamond-box">
          <div className="card__headshot-crop">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="card__headshot-crop-img"
                data-testid="headshot-crop-img"
                src={src}
                alt={media?.alt ?? ''}
                draggable={false}
                style={naturalAspect === null ? { visibility: 'hidden' } : placement}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    setNatural({ id: headshotId, aspect: naturalWidth / naturalHeight })
                  } else {
                    setNatural({ id: headshotId, failed: true })
                  }
                }}
                onError={() => setNatural({ id: headshotId, failed: true })}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="headshot-crop__zoom">
        <label htmlFor="headshot-crop-zoom">Zoom</label>
        <input
          id="headshot-crop-zoom"
          type="range"
          min={CROP_ZOOM_MIN}
          max={CROP_ZOOM_MAX}
          step={0.01}
          value={current.zoom}
          aria-valuetext={`${current.zoom.toFixed(1)} times`}
          data-testid="headshot-crop-zoom"
          disabled={naturalAspect === null}
          onChange={(e) => commit({ ...latest.current, zoom: Number(e.target.value) })}
        />
      </div>
      <div data-testid="headshot-crop-reset">
        <Button
          buttonStyle="secondary"
          size="small"
          type="button"
          onClick={() => {
            setDraft(null)
            latest.current = DEFAULT_CROP
            write(null)
          }}
        >
          Reset
        </Button>
      </div>
      <p>{HELP}</p>
    </>,
  )
}
