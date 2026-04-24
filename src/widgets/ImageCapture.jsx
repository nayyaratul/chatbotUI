import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Camera,
  RotateCcw,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './imageCapture.module.scss'

/* ─── Image Capture Widget (CSV #5) ──────────────────────────────────
   Live camera interface with an overlay guide. Captures directly
   from the device camera via getUserMedia — NO gallery / file
   picker fallback, per CSV: "Gallery Upload not allowed".

   Capture types:
     • document — rectangular landscape guide with corner brackets,
                  rear camera
     • selfie   — circular guide, front camera, mirrored preview
     • evidence — simple crosshair, rear camera

   State machine:
     idle → (tap Start camera) → live → (shutter) → preview →
       ↓                           ↑                    ↓
       └──── denied (permission)   └── retake ←─────────┘
                                                        ↓
                                                    submitted
   ─────────────────────────────────────────────────────────────────── */

const MAX_DIM      = 2000
const JPEG_QUALITY = 0.85

const CAPTURE_META = {
  document: { facingMode: 'environment', overlayShape: 'rect',      hint: 'Place the document inside the frame' },
  selfie:   { facingMode: 'user',        overlayShape: 'circle',    hint: 'Center your face inside the circle' },
  evidence: { facingMode: 'environment', overlayShape: 'crosshair', hint: 'Line up your shot with the crosshair' },
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

/** Re-encode a data URL through a canvas to cap long-edge dimensions
 *  and JPEG quality, so typical cheap-Android 8MB shots become
 *  ~500KB–2MB before landing in the widget_response. */
function reencodeDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => {
      let { width: w, height: h } = img
      if (Math.max(w, h) > MAX_DIM) {
        if (w >= h) { h = Math.round(h * (MAX_DIM / w)); w = MAX_DIM }
        else        { w = Math.round(w * (MAX_DIM / h)); h = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const out = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      const base64 = out.slice(out.indexOf(',') + 1)
      resolve({ dataUrl: out, width: w, height: h, sizeBytes: Math.round(base64.length * 0.75) })
    }
    img.src = dataUrl
  })
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/* ─── Root ──────────────────────────────────────────────────────── */

export function ImageCapture({ payload }) {
  const { onReply } = useChatActions()

  const widgetId      = payload?.widget_id
  const instructionId = payload?.instruction_id
  const title         = payload?.title ?? 'Capture photo'
  const description   = payload?.description
  const guidelines    = Array.isArray(payload?.guidelines) ? payload.guidelines : []
  const captureType   = CAPTURE_META[payload?.capture_type] ? payload.capture_type : 'document'
  const overlayGuide  = payload?.overlay_guide !== false
  const requireFace   = Boolean(payload?.require_face_detection)
  const isSilent      = Boolean(payload?.silent)

  const meta = CAPTURE_META[captureType]

  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  /* 'idle' | 'live' | 'preview' | 'submitted' | 'denied' */
  const [phase, setPhase]                 = useState('idle')
  const [permError, setPermError]         = useState(null)
  const [capturedUrl, setCapturedUrl]     = useState(null)
  const [capturedMeta, setCapturedMeta]   = useState(null)
  const [submittedAt, setSubmittedAt]     = useState(null)

  /* ─── Stream lifecycle ────────────────────────────────────────── */

  const stopStream = useCallback(() => {
    const s = streamRef.current
    if (s) {
      s.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermError('This browser does not support camera access.')
      setPhase('denied')
      return
    }
    setPermError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: meta.facingMode,
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      setPhase('live')
      /* Attach the stream on the next frame so the <video> element
         mounted by the `live` render has a chance to exist. */
      requestAnimationFrame(() => {
        const el = videoRef.current
        if (el) {
          el.srcObject = stream
          el.play().catch(() => { /* autoplay policy — muted so should be fine */ })
        }
      })
    } catch (err) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera access was denied. Allow camera permission to continue.'
        : err?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : (err?.message || 'Could not start the camera.')
      setPermError(msg)
      setPhase('denied')
    }
  }, [meta.facingMode])

  /* ─── Capture / retake / submit ──────────────────────────────── */

  const handleCapture = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    /* Draw the current frame to an offscreen canvas. Selfies are
       mirrored so the captured image matches what the user saw. */
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (captureType === 'selfie') {
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
      ctx.restore()
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }

    const rawUrl = canvas.toDataURL('image/jpeg', 0.95)
    try {
      const { dataUrl, width, height, sizeBytes } = await reencodeDataUrl(rawUrl)
      setCapturedUrl(dataUrl)
      setCapturedMeta({ width, height, sizeBytes })
    } catch {
      setCapturedUrl(rawUrl)
      setCapturedMeta(null)
    }
    stopStream()
    setPhase('preview')
  }, [captureType, stopStream])

  const handleRetake = useCallback(() => {
    setCapturedUrl(null)
    setCapturedMeta(null)
    setPhase('idle')
    requestAnimationFrame(() => startCamera())
  }, [startCamera])

  const handleSubmit = useCallback(() => {
    const now = Date.now()
    setSubmittedAt(now)
    setPhase('submitted')
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'image_capture',
          source_widget_id: widgetId,
          data: {
            label: `Captured ${title}`,
            instruction_id: instructionId,
            capture_type: captureType,
            image_data_url: capturedUrl,
            captured_at: now,
            metadata: capturedMeta ?? null,
          },
        },
      },
      { silent: isSilent },
    )
  }, [onReply, widgetId, instructionId, title, captureType, capturedUrl, capturedMeta, isSilent])

  /* Cleanup — stop the stream on unmount / when the component
     navigates away (e.g. injected out of the message list). */
  useEffect(() => () => stopStream(), [stopStream])

  return (
    <div
      className={cx(styles.card, styles[`capture_${captureType}`])}
      role="article"
      aria-label={title}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Camera size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* ─── IDLE — guidelines + Start camera ──────────────────── */}
      {phase === 'idle' && (
        <>
          {guidelines.length > 0 && (
            <ul className={styles.guidelines} aria-label="Capture guidelines">
              {guidelines.map((g, i) => (
                <li key={i} className={styles.guidelineItem}>
                  <span className={styles.guidelineIcon} aria-hidden="true">
                    <Check size={12} strokeWidth={2.75} />
                  </span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          )}

          {requireFace && captureType === 'selfie' && (
            <div className={styles.hintPill}>
              Face must be clearly visible — no masks, no sunglasses
            </div>
          )}

          <button
            type="button"
            className={styles.startCameraBtn}
            onClick={startCamera}
          >
            <div className={styles.startCameraIcon} aria-hidden="true">
              <Camera size={28} strokeWidth={1.75} />
            </div>
            <div className={styles.startCameraText}>
              <span className={styles.startCameraLabel}>Start camera</span>
              <span className={styles.startCameraSub}>
                {captureType === 'selfie' ? 'Front camera will open' : 'Rear camera will open'}
              </span>
            </div>
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" className={styles.startCameraArrow} />
          </button>
        </>
      )}

      {/* ─── LIVE — video stream + overlay + shutter ─────────────── */}
      {phase === 'live' && (
        <>
          <div className={cx(styles.videoWrap, styles[`videoWrap_${captureType}`])}>
            <video
              ref={videoRef}
              className={cx(styles.video, captureType === 'selfie' && styles.videoMirrored)}
              playsInline
              muted
            />

            {overlayGuide && (
              <div
                className={cx(styles.overlay, styles[`overlay_${meta.overlayShape}`])}
                aria-hidden="true"
              >
                {meta.overlayShape === 'rect' && (
                  <div className={styles.overlayRect}>
                    <span className={cx(styles.bracket, styles.bracketTl)} />
                    <span className={cx(styles.bracket, styles.bracketTr)} />
                    <span className={cx(styles.bracket, styles.bracketBl)} />
                    <span className={cx(styles.bracket, styles.bracketBr)} />
                  </div>
                )}
                {meta.overlayShape === 'circle' && (
                  <div className={styles.overlayCircle} />
                )}
                {meta.overlayShape === 'crosshair' && (
                  <div className={styles.overlayCross} />
                )}
              </div>
            )}

            <div className={styles.overlayHint}>{meta.hint}</div>
          </div>

          <button
            type="button"
            className={styles.shutterBtn}
            onClick={handleCapture}
            aria-label="Take photo"
          >
            <span className={styles.shutterInner} />
          </button>
        </>
      )}

      {/* ─── PREVIEW — captured image + Retake / Use this ────────── */}
      {phase === 'preview' && capturedUrl && (
        <>
          <div className={cx(styles.previewWrap, styles[`videoWrap_${captureType}`])}>
            <Brackets tone="brand" />
            <img
              src={capturedUrl}
              alt="Captured"
              className={styles.previewImage}
            />
          </div>
          <div className={styles.actionsRow}>
            <Button
              variant="secondary"
              size="md"
              className={styles.retakeBtn}
              iconLeft={<RotateCcw size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleRetake}
            >
              Retake
            </Button>
            <Button
              variant="primary"
              size="md"
              className={styles.primaryBtn}
              iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleSubmit}
            >
              Use this photo
            </Button>
          </div>
        </>
      )}

      {/* ─── SUBMITTED — success banner + captured preview ───────── */}
      {phase === 'submitted' && capturedUrl && (
        <>
          <div className={styles.successBanner}>
            <span className={styles.successCheck} aria-hidden="true">
              <CheckCircle2 size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.successBody}>
              <div className={styles.successTitle}>Photo submitted</div>
              <div className={styles.successSub}>
                Saved successfully · {timeLabel(submittedAt)}
              </div>
            </div>
          </div>

          <div className={cx(styles.previewWrap, styles.previewWrapSuccess, styles[`videoWrap_${captureType}`])}>
            <Brackets tone="success" />
            <img
              src={capturedUrl}
              alt={`Captured ${title}`}
              className={styles.previewImage}
            />
          </div>

          <div className={styles.submittedFoot}>
            <span className={styles.submittedLabel}>{title}</span>
            {capturedMeta && (
              <span className={styles.submittedMeta}>
                {capturedMeta.width} × {capturedMeta.height}
                {' · '}
                {formatBytes(capturedMeta.sizeBytes)}
              </span>
            )}
          </div>
        </>
      )}

      {/* ─── DENIED — permission error + retry ──────────────────── */}
      {phase === 'denied' && (
        <div className={styles.deniedBlock}>
          <div className={styles.deniedIcon} aria-hidden="true">
            <ShieldAlert size={32} strokeWidth={1.5} />
          </div>
          <div className={styles.deniedBody}>
            <div className={styles.deniedTitle}>Camera required</div>
            <div className={styles.deniedSub}>{permError}</div>
          </div>
          <Button
            variant="secondary"
            size="md"
            className={styles.retryBtn}
            onClick={() => { setPermError(null); startCamera() }}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

/** Four L-shaped corner brackets — used by the preview + submitted
 *  states to visually connect back to the live-capture framing. */
function Brackets({ tone = 'brand' }) {
  return (
    <div className={cx(styles.brackets, tone === 'success' && styles.bracketsSuccess)} aria-hidden="true">
      <span className={cx(styles.bracket, styles.bracketTl)} />
      <span className={cx(styles.bracket, styles.bracketTr)} />
      <span className={cx(styles.bracket, styles.bracketBl)} />
      <span className={cx(styles.bracket, styles.bracketBr)} />
    </div>
  )
}
