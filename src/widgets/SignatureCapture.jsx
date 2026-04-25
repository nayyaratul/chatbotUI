import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  HandCoins,
  ScrollText,
  ClipboardCheck,
  FileText,
  ChevronRight,
  Check,
  Undo2,
  Eraser,
  X as XIcon,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { makeId } from '../engine/ids.js'
import styles from './signatureCapture.module.scss'

/* ─── Signature Capture (#14) ─────────────────────────────────────────
   Touch-first signature pad for legally weighty in-chat moments.

   Two structural variants:
     • 'document' — thumbnail preview of an attached doc; tap opens it
                    in a portaled DocumentViewerSheet. Gate clears on
                    close.
     • 'text'     — inline scrollable agreement body. Gate clears on
                    scroll-to-end.

   Capture surface: SignatureSheet (portaled bottom-sheet) owns the
   <canvas>. Strokes are stored as normalized 0..1 coordinates so the
   capture surface and the inline preview render the same point arrays
   at different physical sizes. Quadratic smoothing through midpoints
   produces curves vs jagged polylines.

   The card itself is a non-interactive preview that holds 4 states:
     idle (gate-pending) → reviewed (gate met) → captured → submitted

   Region 3 wires the capture surface (canvas + Undo/Clear/Cancel/Use
   signature + discard-confirm) and the captured state on the card
   (SVG render with stroke-dasharray draw-in). Submit handler arrives
   in region 4.

   Spec: docs/superpowers/specs/2026-04-25-signature-capture-widget-design.md
   Rule book: docs/widget-conventions.md
   ─────────────────────────────────────────────────────────────────── */

const SHEET_ANIM_DURATION = 320  /* matches the slowest exit transition (transform 320ms) */
const SVG_VIEWBOX_W       = 500
const SVG_VIEWBOX_H       = 200
const USE_CASE_ICON = {
  offer:      HandCoins,
  contract:   ScrollText,
  completion: ClipboardCheck,
}

const USE_CASE_TITLE = {
  offer:      'Sign the offer letter',
  contract:   'Sign the agreement',
  completion: 'Sign off completion',
}

const USE_CASE_SUBTITLE = {
  offer:      'Acceptance · counter-signed by the company',
  contract:   'Read the terms and sign at the bottom',
  completion: 'Confirm the work you completed',
}

function disclaimerCopy(variant) {
  if (variant === 'text') return 'By signing you agree to be bound by this agreement.'
  return 'By signing you agree to be bound by this document.'
}

function gatePendingCopy(variant) {
  if (variant === 'text') return 'Read to the end to sign'
  return 'Open the document to enable signing'
}

function gateMetCopy(variant) {
  if (variant === 'text') return 'Agreement read'
  return 'Document reviewed'
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function dateLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${month} ${d.getDate()}`
}

/* Short readable form of navigator.userAgent for the stamp metadata.
   Not a fingerprint — `iPhone · Safari` rather than the full UA. */
function deviceInfoLabel() {
  if (typeof navigator === 'undefined') return 'Web'
  const ua = navigator.userAgent
  let device = 'Web'
  if (/iPhone|iPad|iPod/.test(ua))     device = /iPad/.test(ua) ? 'iPad' : 'iPhone'
  else if (/Android/.test(ua))         device = 'Android'
  else if (/Mac/i.test(ua))            device = 'macOS'
  else if (/Windows/.test(ua))         device = 'Windows'
  else if (/Linux/i.test(ua))          device = 'Linux'

  let browser = 'Browser'
  if (/Edg/.test(ua))                  browser = 'Edge'
  else if (/CriOS|Chrome/.test(ua))    browser = 'Chrome'
  else if (/FxiOS|Firefox/.test(ua))   browser = 'Firefox'
  else if (/Safari/.test(ua))          browser = 'Safari'

  return `${device} · ${browser}`
}

/* ─── Stroke geometry helpers ────────────────────────────────────────
   Strokes are stored as Array<Array<{x, y}>> in normalized 0..1
   coordinates relative to the drawing area's bounding rect. */

function strokeToPathD(stroke, viewW, viewH) {
  if (!stroke || stroke.length === 0) return ''
  if (stroke.length === 1) {
    const x = stroke[0].x * viewW
    const y = stroke[0].y * viewH
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`
  }
  if (stroke.length === 2) {
    return `M ${stroke[0].x * viewW} ${stroke[0].y * viewH} L ${stroke[1].x * viewW} ${stroke[1].y * viewH}`
  }
  let d = `M ${stroke[0].x * viewW} ${stroke[0].y * viewH}`
  for (let i = 1; i < stroke.length - 1; i++) {
    const x1 = stroke[i].x * viewW
    const y1 = stroke[i].y * viewH
    const x2 = stroke[i + 1].x * viewW
    const y2 = stroke[i + 1].y * viewH
    const xc = (x1 + x2) / 2
    const yc = (y1 + y2) / 2
    d += ` Q ${x1} ${y1} ${xc} ${yc}`
  }
  const last = stroke[stroke.length - 1]
  d += ` L ${last.x * viewW} ${last.y * viewH}`
  return d
}

/* ─── SignatureSheet — portaled capture surface ─────────────────────
   Owns the <canvas>. Pointer events with setPointerCapture so the
   gesture stays locked even if the finger leaves the canvas bounds.
   touch-action: none on the canvas suppresses scroll/zoom. Quadratic
   smoothing through midpoints renders curves vs jagged polylines. */

function SignatureSheet({ subtitleContext, initialStrokes, onClose, onCommit }) {
  const [phase, setPhase]     = useState('entering')
  const [strokes, setStrokes] = useState(initialStrokes ?? [])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  /* `clearing` is the 200ms fade window after Clear is tapped — the canvas
     redraws with reduced alpha so existing strokes ramp out before being
     truncated. Without it, Clear was a hard pop. */
  const [clearing, setClearing] = useState(false)
  const canvasRef             = useRef(null)
  const containerRef          = useRef(null)
  const closeBtnRef           = useRef(null)
  const closingRef            = useRef(false)
  const drawingRef            = useRef(false)
  const currentStrokeRef      = useRef(null)
  const clearTimerRef         = useRef(null)
  const inkColorRef           = useRef('rgb(15, 23, 42)') /* fallback; resolved from --grey-90 on mount */

  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  /* Two-frame settle + body scroll lock. */
  useEffect(() => {
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'))
    })
    return () => cancelAnimationFrame(r)
  }, [])

  useEffect(() => {
    if (phase !== 'open') return
    /* preventScroll keeps the chat behind from scroll-jumping when the
       close button auto-focuses. No body-scroll-lock — the modal-root's
       absolute inset:0 + this sheet's scrim already cover the chat;
       locking document.body.style.overflow caused a scrollbar/width
       snap on desktop ("refresh"-like flash). */
    closeBtnRef.current?.focus({ preventScroll: true })
  }, [phase])

  /* Resolve --grey-90 to its computed colour so the canvas ink stays in
     sync with the design tokens — never hardcode the hex. */
  useEffect(() => {
    if (!containerRef.current) return
    const computed = getComputedStyle(containerRef.current)
      .getPropertyValue('--grey-90')
      .trim()
    if (computed) inkColorRef.current = computed
  }, [])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setPhase('exiting')
    window.setTimeout(onClose, SHEET_ANIM_DURATION)
  }, [onClose])

  /* Esc closes; if mid-draw, ignore so an accidental key tap doesn't
     drop the gesture. */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (drawingRef.current) return
        if (strokes.length > 0 && !confirmDiscard) {
          setConfirmDiscard(true)
        } else {
          requestClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose, strokes.length, confirmDiscard])

  /* ─── Canvas draw routine ─────────────────────────────────────────
     Redraws everything on every change; the cap of ~10 strokes makes
     this trivially cheap and keeps Undo / Clear logic simple. */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr  = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    /* Re-set intrinsic dimensions every redraw so the canvas survives
       resize without losing crispness. */
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width  = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.lineCap   = 'round'
    ctx.lineJoin  = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = inkColorRef.current
    ctx.fillStyle   = inkColorRef.current
    /* During the clear-fade window, render existing ink at reduced
       alpha. CSS-side .shCanvas_clearing nudges the alpha lower in
       its own transition; the canvas itself paints at half. The
       perceived ramp comes from the wrapper's opacity transition. */
    if (clearing) ctx.globalAlpha = 0.4

    function drawOne(stroke) {
      if (!stroke || stroke.length === 0) return
      if (stroke.length === 1) {
        ctx.beginPath()
        ctx.arc(stroke[0].x * rect.width, stroke[0].y * rect.height, 1.25, 0, Math.PI * 2)
        ctx.fill()
        return
      }
      ctx.beginPath()
      ctx.moveTo(stroke[0].x * rect.width, stroke[0].y * rect.height)
      if (stroke.length === 2) {
        ctx.lineTo(stroke[1].x * rect.width, stroke[1].y * rect.height)
      } else {
        for (let i = 1; i < stroke.length - 1; i++) {
          const x1 = stroke[i].x * rect.width
          const y1 = stroke[i].y * rect.height
          const x2 = stroke[i + 1].x * rect.width
          const y2 = stroke[i + 1].y * rect.height
          const xc = (x1 + x2) / 2
          const yc = (y1 + y2) / 2
          ctx.quadraticCurveTo(x1, y1, xc, yc)
        }
        const last = stroke[stroke.length - 1]
        ctx.lineTo(last.x * rect.width, last.y * rect.height)
      }
      ctx.stroke()
    }

    strokes.forEach(drawOne)
    if (currentStrokeRef.current) drawOne(currentStrokeRef.current)
  }, [strokes, clearing])

  /* Redraw whenever strokes change; resize observer for viewport
     changes (rotation / soft-keyboard). */
  useEffect(() => { redraw() }, [redraw])
  useEffect(() => {
    if (!canvasRef.current) return
    const ro = new ResizeObserver(() => redraw())
    ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [redraw])

  function getNormalizedPoint(e) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    }
  }

  function handlePointerDown(e) {
    /* Ignore pointer-down during the 200ms clear-fade window — drawing
       on top of fading strokes paints the new stroke at globalAlpha 0.4
       too, which reads as a stuck-dim signature. Wait for the fade to
       finish, then redraw at full alpha. */
    if (clearing) return
    e.preventDefault()
    try { e.target.setPointerCapture(e.pointerId) } catch { /* not supported */ }
    drawingRef.current = true
    currentStrokeRef.current = [getNormalizedPoint(e)]
    redraw()
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    e.preventDefault()
    currentStrokeRef.current.push(getNormalizedPoint(e))
    redraw()
  }

  function handlePointerEnd(e) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const finished = currentStrokeRef.current
    currentStrokeRef.current = null
    if (finished && finished.length > 0) {
      setStrokes((prev) => [...prev, finished])
    }
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1))
  }

  function handleClear() {
    if (clearing) return
    if (strokes.length === 0) return
    setClearing(true)
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current)
    clearTimerRef.current = window.setTimeout(() => {
      setStrokes([])
      setClearing(false)
      clearTimerRef.current = null
    }, 200)
  }

  /* On unmount, drop any in-flight clear-fade timer so it can't fire
     after the sheet has closed. */
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current)
    }
  }, [])

  function handleCancel() {
    if (strokes.length > 0) {
      setConfirmDiscard(true)
    } else {
      requestClose()
    }
  }

  function handleDiscard() {
    setStrokes([])
    setConfirmDiscard(false)
    requestClose()
  }

  function handleKeepDrawing() {
    setConfirmDiscard(false)
  }

  function handleUse() {
    if (strokes.length === 0) return
    onCommit(strokes)
    requestClose()
  }

  if (!portalTarget) return null

  const hasStrokes = strokes.length > 0

  return createPortal(
    <div
      ref={containerRef}
      className={cx(styles.shLayer, styles[`shLayer_${phase}`])}
      role="dialog"
      aria-modal="true"
      aria-label="Sign your name"
    >
      <div
        className={styles.shScrim}
        onClick={handleCancel}
        aria-hidden="true"
      />
      <div className={styles.shSheet}>
        <header className={styles.shHeader}>
          <div className={styles.shHeaderText}>
            <p className={styles.shEyebrow}>Signature</p>
            <h4 className={styles.shTitle}>Sign your name</h4>
            {subtitleContext && (
              <p className={styles.shSubtitle}>{subtitleContext}</p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.shClose}
            onClick={handleCancel}
            aria-label="Close signing surface"
          >
            <XIcon size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className={styles.shCanvasWrap}>
          <div
            className={cx(
              styles.shCanvasFrame,
              hasStrokes && styles.shCanvasFrame_inked,
              clearing && styles.shCanvasFrame_clearing,
            )}
          >
            <div className={styles.shBaseline} aria-hidden />
            <span className={styles.shMark} aria-hidden>×</span>
            {!hasStrokes && !clearing && (
              <span className={styles.shPlaceholder} aria-hidden>Sign here</span>
            )}
            <canvas
              ref={canvasRef}
              className={cx(styles.shCanvas, clearing && styles.shCanvas_clearing)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              aria-label="Signature drawing surface"
            />
          </div>

          <div className={styles.shFloatingTools} aria-hidden={!hasStrokes || undefined}>
            <button
              type="button"
              className={styles.shToolBtn}
              onClick={handleUndo}
              disabled={!hasStrokes || clearing}
              aria-label="Undo last stroke"
            >
              <Undo2 size={16} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.shToolBtn}
              onClick={handleClear}
              disabled={!hasStrokes || clearing}
              aria-label="Clear signature"
            >
              <Eraser size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <p className={styles.shHint}>Use finger or stylus.</p>

        {confirmDiscard ? (
          <div className={styles.shConfirm} role="alertdialog" aria-label="Discard signature?">
            <p className={styles.shConfirmTitle}>Discard signature?</p>
            <div className={styles.shConfirmActions}>
              <Button variant="secondary" onClick={handleKeepDrawing}>
                Keep drawing
              </Button>
              <button
                type="button"
                className={styles.shDiscardBtn}
                onClick={handleDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <footer className={styles.shFooter}>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUse}
              disabled={!hasStrokes}
            >
              Use signature
            </Button>
          </footer>
        )}
      </div>
    </div>,
    portalTarget,
  )
}

/* ─── Captured signature SVG render ─────────────────────────────────
   Renders an Array<Stroke> as inline SVG paths with stroke-dasharray
   draw-in animation. Caps the per-stroke stagger at 8 (§11). */

function SignatureSvg({ strokes, ariaLabel }) {
  const paths = useMemo(() => {
    return (strokes ?? []).map((stroke) => strokeToPathD(stroke, SVG_VIEWBOX_W, SVG_VIEWBOX_H))
  }, [strokes])

  return (
    <svg
      className={styles.signatureSvg}
      viewBox={`0 0 ${SVG_VIEWBOX_W} ${SVG_VIEWBOX_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/* ─── Review sheet — portaled bottom-sheet for both variants ────────
   Step 1 of the signing flow lives here. The card's body region is
   intentionally minimal (a tappable band that names the thing being
   signed); the full content opens in this sheet so the user actually
   has room to read on mobile. Mirrors JobDetailsModal's containment
   pattern (portal into #chat-modal-root, three-phase animation, scrim
   + Esc + close ×, single in-flight close guard).

   No body scroll lock — the modal-root is `position: absolute; inset:
   0` over the chat pane and the sheet's scrim covers it, so the chat
   can't be touched. Locking document.body.style.overflow caused a
   visible scrollbar/width snap on desktop ("refresh"-like flash). */

function ReviewSheet({ kind, documentRef, agreementText, onClose }) {
  const [phase, setPhase] = useState('entering')
  const closeBtnRef = useRef(null)
  const closingRef  = useRef(false)
  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  useEffect(() => {
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'))
    })
    return () => cancelAnimationFrame(r)
  }, [])

  useEffect(() => {
    if (phase !== 'open') return
    /* preventScroll: avoid focus()-induced scrollIntoView jumps in the
       chat behind the sheet. */
    closeBtnRef.current?.focus({ preventScroll: true })
  }, [phase])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setPhase('exiting')
    window.setTimeout(onClose, SHEET_ANIM_DURATION)
  }, [onClose])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  if (!portalTarget) return null

  const isText = kind === 'text'

  const eyebrow = isText ? 'Agreement' : 'Document preview'
  const title   = isText
    ? 'Read the agreement'
    : (documentRef?.label ?? 'Document')

  const meta = []
  if (!isText) {
    if (documentRef?.pages != null) meta.push(`${documentRef.pages} page${documentRef.pages === 1 ? '' : 's'}`)
    if (documentRef?.version)       meta.push(documentRef.version)
    if (documentRef?.updated_at)    meta.push(`Updated ${documentRef.updated_at}`)
  } else {
    const text = String(agreementText ?? '')
    const paraCount = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).length
    const words     = text.split(/\s+/).filter(Boolean).length
    const minutes   = Math.max(1, Math.ceil(words / 200))
    if (paraCount > 0) meta.push(`${paraCount} section${paraCount === 1 ? '' : 's'}`)
    meta.push(`~${minutes} min read`)
  }

  const ctaLabel = isText ? 'I have read the agreement' : 'I have reviewed the document'
  const ariaLabel = isText
    ? 'Agreement — full text'
    : `${documentRef?.label ?? 'Document'} — preview`

  const paragraphs = isText
    ? String(agreementText ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : null

  return createPortal(
    <div
      className={cx(styles.dvLayer, styles[`dvLayer_${phase}`])}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={styles.dvScrim}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div className={styles.dvSheet}>
        <header className={styles.dvHeader}>
          <div className={styles.dvHeaderText}>
            <p className={styles.dvEyebrow}>{eyebrow}</p>
            <h4 className={styles.dvTitle}>{title}</h4>
            {meta.length > 0 && (
              <p className={styles.dvMeta}>{meta.join(' · ')}</p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.dvClose}
            onClick={requestClose}
            aria-label={isText ? 'Close agreement' : 'Close document preview'}
          >
            <XIcon size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className={styles.dvBody}>
          {isText ? (
            <>
              {paragraphs.length > 0
                ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
                : <p>{agreementText}</p>}
              <p className={styles.dvBodyCaption}>
                <Check size={14} strokeWidth={2.25} aria-hidden />
                <span>Close to enable signing</span>
              </p>
            </>
          ) : (
            <>
              <p>
                This is a preview of the document attached to your signing request. In a real
                engagement this region would render the full document — letter, contract, or
                audit report — at full readable scale.
              </p>
              <p>
                Take a moment to review the terms above. When you close this preview, the
                signing affordance below the document band on the chat card will enable.
              </p>
              <p className={styles.dvBodyCaption}>
                <Check size={14} strokeWidth={2.25} aria-hidden />
                <span>Close to enable signing</span>
              </p>
            </>
          )}
        </div>

        <footer className={styles.dvFooter}>
          <Button
            variant="primary"
            fullWidth
            onClick={requestClose}
          >
            {ctaLabel}
          </Button>
        </footer>
      </div>
    </div>,
    portalTarget,
  )
}

/* ─── Body — document variant ───────────────────────────────────────── */

function DocumentBody({ documentRef, onOpen, gateMet }) {
  const hasThumb = !!documentRef?.thumbnail_url
  const meta = []
  if (documentRef?.pages != null) meta.push(`${documentRef.pages} page${documentRef.pages === 1 ? '' : 's'}`)
  if (documentRef?.version)       meta.push(documentRef.version)
  if (documentRef?.updated_at)    meta.push(`Updated ${documentRef.updated_at}`)

  return (
    <div className={styles.docBand}>
      <div
        className={cx(styles.docThumb, !hasThumb && styles.docThumb_empty)}
        aria-hidden
      >
        {hasThumb ? (
          <img src={documentRef.thumbnail_url} alt="" />
        ) : (
          <FileText size={28} strokeWidth={1.75} />
        )}
      </div>
      <div className={styles.docText}>
        <p className={styles.docLabel}>{documentRef?.label ?? 'Document'}</p>
        {meta.length > 0 && (
          <p className={styles.docMeta}>{meta.join(' · ')}</p>
        )}
        <button
          type="button"
          className={styles.docOpenLink}
          onClick={onOpen}
        >
          <span>{gateMet ? 'Re-open document' : 'Open document'}</span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ─── Body — text variant: agreement band (mirrors doc band) ───────
   Click target that opens the agreement in the ReviewSheet. The full
   agreement is unreadable inside a ~140px scroll area on a phone; the
   sheet pattern (used for both variants now) gives the user real room
   to read. Same shape as DocumentBand so Step 1 reads as one consistent
   control regardless of variant. */

function AgreementBand({ agreementText, onOpen, gateMet }) {
  const text = String(agreementText ?? '')
  const paraCount = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).length
  const words     = text.split(/\s+/).filter(Boolean).length
  const minutes   = Math.max(1, Math.ceil(words / 200))

  const meta = []
  if (paraCount > 0) meta.push(`${paraCount} section${paraCount === 1 ? '' : 's'}`)
  meta.push(`~${minutes} min read`)

  return (
    <div className={styles.docBand}>
      <div className={cx(styles.docThumb, styles.docThumb_empty)} aria-hidden>
        <ScrollText size={28} strokeWidth={1.75} />
      </div>
      <div className={styles.docText}>
        <p className={styles.docLabel}>Agreement to read</p>
        <p className={styles.docMeta}>{meta.join(' · ')}</p>
        <button
          type="button"
          className={styles.docOpenLink}
          onClick={onOpen}
        >
          <span>{gateMet ? 'Re-open agreement' : 'Open agreement'}</span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ─── Root ──────────────────────────────────────────────────────────── */

export function SignatureCapture({ payload }) {
  const variant      = payload?.variant === 'text' ? 'text' : 'document'
  const useCase      = ['offer', 'contract', 'completion'].includes(payload?.use_case)
    ? payload.use_case
    : 'offer'
  const HeaderIcon   = USE_CASE_ICON[useCase]
  const title        = payload?.title ?? USE_CASE_TITLE[useCase]
  const subtitle     = payload?.subtitle ?? USE_CASE_SUBTITLE[useCase]
  const ctaLabel     = payload?.cta_label ?? 'Submit signature'
  const showDisclaimer = payload?.legal_disclaimer !== null
  const disclaimer   = payload?.legal_disclaimer ?? disclaimerCopy(variant)
  const documentRef  = payload?.document_ref
  const agreementText = payload?.agreement_text

  const { onReply } = useChatActions()

  const [gateMet, setGateMet]       = useState(false)
  const [gateAt, setGateAt]         = useState(null)
  /* `reviewOpen` covers Step 1 for both variants — document preview AND
     agreement reading both happen in the portaled ReviewSheet. The
     scroll-to-end gate on the inline agreement body was removed: the
     inline scroll was unreadable on mobile, and unifying both variants
     under the same review→sign cadence collapses the gate logic to one
     rule (sheet close → gate clears). */
  const [reviewOpen, setReviewOpen] = useState(false)
  const [signOpen, setSignOpen]     = useState(false)
  const [strokes, setStrokes]       = useState([])
  const [submission, setSubmission] = useState(null)  /* { at, signer_name, device_info, signature_image_id } once submitted */
  const previewRef                  = useRef(null)
  const restoreFocusRef             = useRef(null)

  const captured  = strokes.length > 0
  const submitted = submission !== null

  const handleGateClear = useCallback(() => {
    setGateMet((prev) => {
      if (prev) return prev
      setGateAt(Date.now())
      return true
    })
  }, [])

  const handleOpenReview = useCallback(() => {
    setReviewOpen(true)
  }, [])

  const handleReviewClose = useCallback(() => {
    setReviewOpen(false)
    handleGateClear()
  }, [handleGateClear])

  const handlePreviewTap = useCallback(() => {
    if (!gateMet || submitted) return
    restoreFocusRef.current = document.activeElement
    setSignOpen(true)
  }, [gateMet, submitted])

  const handlePreviewKey = useCallback((e) => {
    if (!gateMet || submitted) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      restoreFocusRef.current = document.activeElement
      setSignOpen(true)
    }
  }, [gateMet, submitted])

  const signerName = payload?.signer_name ?? 'Signed'

  const handleSubmit = useCallback(() => {
    if (!gateMet || !captured || submitted) return
    const at = Date.now()
    const decided = {
      at,
      signer_name: signerName,
      device_info: deviceInfoLabel(),
      signature_image_id: makeId('img'),
    }
    setSubmission(decided)
    onReply({
      type: 'widget_response',
      payload: {
        widget_id: payload?.widget_id,
        source_type: 'signature',
        signature_image_id: decided.signature_image_id,
        signed_at: new Date(at).toISOString(),
        device_info: decided.device_info,
        document_id: payload?.document_id,
        signer_name: signerName,
        decided_at: new Date(at).toISOString(),
      },
    })
  }, [gateMet, captured, submitted, signerName, onReply, payload?.widget_id, payload?.document_id])

  const handleSheetClose = useCallback(() => {
    setSignOpen(false)
    /* Restore focus to whatever held it before the sheet opened —
       typically the preview region. Wait a frame so the sheet's
       slide-down doesn't fight focus styling. */
    requestAnimationFrame(() => {
      const el = restoreFocusRef.current ?? previewRef.current
      if (el && typeof el.focus === 'function') el.focus()
      restoreFocusRef.current = null
    })
  }, [])

  const handleSheetCommit = useCallback((nextStrokes) => {
    setStrokes(nextStrokes)
  }, [])

  const previewSubtitle = useMemo(() => {
    if (variant === 'document') {
      const parts = []
      if (documentRef?.label)   parts.push(documentRef.label)
      if (documentRef?.version) parts.push(documentRef.version)
      return parts.join(' · ')
    }
    /* Text variant — surface a hint of the agreement so the signer
       knows which document they're committing to inside the sheet,
       not just the card's use-case copy. */
    if (agreementText) {
      const trimmed = String(agreementText).trim()
      return trimmed.length > 60 ? `${trimmed.slice(0, 60).trimEnd()}…` : trimmed
    }
    return subtitle
  }, [variant, documentRef, agreementText, subtitle])

  /* Two-step wayfinding. Step 1 (review) is active until the gate
     clears; Step 2 (sign) is gated until step 1 is done, active once
     captured-but-not-submitted, and done on submit. Makes the
     review-then-sign sequence legible at a glance without inventing
     a progress primitive. */
  const stepOneState = gateMet ? 'done' : 'active'
  const stepTwoState = submitted
    ? 'done'
    : gateMet
      ? 'active'
      : 'gated'
  const stepOneLabel = variant === 'document' ? 'Review the document' : 'Read the agreement'

  return (
    <div className={cx(styles.card, gateMet && styles.card_gateMet)}>
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden>
          <HeaderIcon size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.description}>{subtitle}</p>}
        </div>
      </header>

      <p className={cx(styles.stepRow, styles[`stepRow_${stepOneState}`])}>
        <span className={styles.stepBadge}>Step 1</span>
        <span className={styles.stepText}>{stepOneLabel}</span>
      </p>

      {variant === 'document' ? (
        <DocumentBody
          documentRef={documentRef}
          onOpen={handleOpenReview}
          gateMet={gateMet}
        />
      ) : (
        <AgreementBand
          agreementText={agreementText}
          onOpen={handleOpenReview}
          gateMet={gateMet}
        />
      )}

      {/* Visual: two faces crossfade in place (CSS), Check springs in on
          gate-clear. A11y: aria-hidden flips don't reliably trigger
          aria-live announcements (NVDA in particular ignores them), so a
          separate sr-only aria-live region carries the actual text
          mutation that screen readers will announce. */}
      <p
        className={cx(styles.gateCaption, gateMet && styles.gateCaption_met)}
      >
        <span className={styles.gateCaptionPending} aria-hidden={gateMet || undefined}>
          {gatePendingCopy(variant)}
        </span>
        <span className={styles.gateCaptionMet} aria-hidden={!gateMet || undefined}>
          <Check size={14} strokeWidth={2.25} aria-hidden />
          <span>{gateMetCopy(variant)} · {timeLabel(gateAt)}</span>
        </span>
        <span className={styles.srOnly} aria-live="polite">
          {gateMet ? `${gateMetCopy(variant)} at ${timeLabel(gateAt)}` : ''}
        </span>
      </p>

      <p className={cx(styles.stepRow, styles[`stepRow_${stepTwoState}`])}>
        <span className={styles.stepBadge}>Step 2</span>
        <span className={styles.stepText}>Sign your name</span>
      </p>

      <div
        ref={previewRef}
        className={cx(
          styles.preview,
          !gateMet && styles.preview_gated,
          captured && !submitted && styles.preview_captured,
          submitted && styles.preview_submitted,
        )}
        role={submitted ? 'img' : 'button'}
        tabIndex={!submitted && gateMet ? 0 : -1}
        aria-disabled={!gateMet || undefined}
        aria-label={
          submitted
            ? 'Captured signature'
            : captured
              ? 'Tap to re-sign'
              : 'Tap to sign'
        }
        onClick={submitted ? undefined : handlePreviewTap}
        onKeyDown={submitted ? undefined : handlePreviewKey}
      >
        {captured ? (
          <SignatureSvg
            strokes={strokes}
            ariaLabel={submitted ? 'Signed' : 'Captured signature'}
          />
        ) : (
          <>
            <div className={styles.previewBaseline} aria-hidden />
            <span className={styles.previewMark} aria-hidden>×</span>
          </>
        )}
        {!submitted && (
          <span className={styles.previewCaption}>
            {captured ? 'Tap to re-sign' : 'Tap to sign'}
          </span>
        )}
        {submitted && (
          <>
            {/* Decorative seal layers — corner brackets (notarization
                cue), an inset frame ring, a low-opacity watermark fleck.
                All purely CSS-driven decoration on the existing preview
                primitive; no new primitive introduced. */}
            <span className={styles.stampFrame} aria-hidden />
            <span className={styles.stampCorners} aria-hidden />
            <span className={styles.stampWatermark} aria-hidden />
            <div className={styles.stampHalo} aria-hidden />
          </>
        )}
      </div>

      {submitted && (
        <p className={styles.stampMeta}>
          <span className={styles.stampSigner}>{submission.signer_name}</span>
          <span aria-hidden>·</span>
          <span className={styles.stampTime}>{timeLabel(submission.at)}</span>
          <span aria-hidden>·</span>
          <span>{dateLabel(submission.at)}</span>
          <span aria-hidden>·</span>
          <span>{submission.device_info}</span>
        </p>
      )}

      {!submitted && showDisclaimer && (
        <p className={styles.disclaimer}>{disclaimer}</p>
      )}

      {submitted ? (
        <div className={styles.banner} role="status" aria-live="polite">
          <span className={styles.bannerChip}>
            <Check size={14} strokeWidth={2.25} aria-hidden />
            <span>Signed</span>
          </span>
          <span className={styles.bannerText}>
            Signature captured at {timeLabel(submission.at)}
          </span>
        </div>
      ) : (
        <div className={styles.ctaRow}>
          <Button
            variant="primary"
            fullWidth
            disabled={!gateMet || !captured}
            onClick={handleSubmit}
          >
            {ctaLabel}
          </Button>
        </div>
      )}

      {reviewOpen && (
        <ReviewSheet
          kind={variant}
          documentRef={documentRef}
          agreementText={agreementText}
          onClose={handleReviewClose}
        />
      )}

      {signOpen && (
        <SignatureSheet
          subtitleContext={previewSubtitle}
          initialStrokes={strokes}
          onClose={handleSheetClose}
          onCommit={handleSheetCommit}
        />
      )}
    </div>
  )
}
