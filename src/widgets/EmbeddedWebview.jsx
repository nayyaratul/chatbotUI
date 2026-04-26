import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  ExternalLink,
  GraduationCap,
  BookOpenText,
  MonitorSmartphone,
  Globe,
  Loader2,
  WifiOff,
  Check,
  X as XIcon,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './embeddedWebview.module.scss'

/* ─── Embedded Webview (#27) ─────────────────────────────────────────
   Iframe escape-hatch for complex partner UIs. Compact card lives in
   the chat stream; on CTA tap a portaled bottom-sheet lifts up and
   holds the iframe edge-to-edge. The compact card's poster region
   morphs into the sheet's iframe-frame via a FLIP transition.

   Four variants drive icon / eyebrow / footer / completion strategy:
     partner_form   — postMessage 'complete' (mandatory)
     training       — postMessage 'progress' until 'complete'
     reader         — user-attested via "I've read this" CTA
     preview        — no completion (close = continue)

   See docs/superpowers/specs/2026-04-26-embedded-webview-widget-design.md
   ─────────────────────────────────────────────────────────────────── */

const SHEET_ANIM_DURATION = 360  /* bottom-sheet open/close — matches transform 320ms + 40ms safety */
const LIFT_DURATION       = 520  /* FLIP poster → iframe-frame morph; Task 13 */

const DEFAULT_SANDBOX = 'allow-scripts allow-forms allow-same-origin allow-popups'

function buildIframeSrc(url, widgetId) {
  if (!url || !widgetId) return url
  try {
    /* URL constructor handles relative, absolute, and hash-bearing URLs.
       Append ?wid (or &wid) without disturbing existing query / hash. */
    const u = new URL(url, window.location.origin)
    u.searchParams.set('wid', widgetId)
    return u.toString()
  } catch {
    /* Fallback: malformed URL the URL constructor refused. Insert wid
       BEFORE any hash fragment so it reaches the server (a query placed
       after `#` becomes part of the fragment and is dropped). */
    const hashIdx = url.indexOf('#')
    const base    = hashIdx !== -1 ? url.slice(0, hashIdx) : url
    const hash    = hashIdx !== -1 ? url.slice(hashIdx)    : ''
    const sep     = base.includes('?') ? '&' : '?'
    return `${base}${sep}wid=${encodeURIComponent(widgetId)}${hash}`
  }
}

function clamp(min, max, v) {
  return Math.max(min, Math.min(max, v))
}

function useCountUp(target, durationMs = 280) {
  const [value, setValue] = useState(target ?? 0)
  const startedRef = useRef({ from: 0, to: 0, t0: 0, raf: 0 })

  useEffect(() => {
    if (target == null) return
    cancelAnimationFrame(startedRef.current.raf)
    startedRef.current = {
      from: value,
      to: target,
      t0: performance.now(),
      raf: requestAnimationFrame(tick),
    }
    function tick(now) {
      const { from, to, t0 } = startedRef.current
      const t = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)        // ease-out cubic
      setValue(from + (to - from) * eased)
      if (t < 1) startedRef.current.raf = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(startedRef.current.raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}

const VARIANT_META = {
  partner_form: {
    icon: ExternalLink,
    eyebrowPrefix: 'Partner',
    ctaOpen: 'Open verification portal',
    ctaReopen: 'Reopen verification portal',
    completion: 'postmessage',
  },
  training: {
    icon: GraduationCap,
    eyebrowPrefix: 'Training',
    ctaOpen: 'Start training',
    ctaReopen: 'Resume training',
    completion: 'postmessage',
  },
  reader: {
    icon: BookOpenText,
    eyebrowPrefix: 'Reading',
    ctaOpen: 'Open reader',
    ctaReopen: 'Reopen reader',
    completion: 'attested',
  },
  preview: {
    icon: MonitorSmartphone,
    eyebrowPrefix: 'Preview',
    ctaOpen: 'Open preview',
    ctaReopen: 'Reopen preview',
    completion: 'none',
  },
}

export function EmbeddedWebview({ payload, onSubmit }) {
  const variant = payload?.variant ?? 'partner_form'
  const meta = VARIANT_META[variant] ?? VARIANT_META.partner_form
  const Icon = meta.icon

  const [cardState, setCardState] = useState('idle')         // 'idle' | 'sheet_open' | 'dismissed' | 'completed'
  const [lastProgress, setLastProgress] = useState(null)     // training-variant caption
  const totalOpenMsRef = useRef(0)
  const lastOpenedAtRef = useRef(0)

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = useCallback(() => {
    if (cardState === 'completed') return                     // proof state — locked
    lastOpenedAtRef.current = Date.now()
    setCardState('sheet_open')
  }, [cardState])

  const handleSheetClose = useCallback(() => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }
    setCardState((prev) => (prev === 'completed' ? prev : 'dismissed'))
  }, [])

  const handleCompleted = useCallback((data, method) => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }
    setCardState('completed')

    if (payload?.silent !== true) {
      onSubmit?.({
        type: 'widget_response',
        payload: {
          widget_id: payload?.widget_id,
          source_type: 'embedded_webview',
          variant,
          completed: true,
          completion_method: method,
          data: data ?? {},
          total_open_time_seconds: Math.round(totalOpenMsRef.current / 1000),
        },
      })
    }
  }, [onSubmit, payload, variant])

  const handleProgress = useCallback((pct) => {
    setLastProgress(pct)
  }, [])

  const sheetOpen = cardState === 'sheet_open'

  const ctaLabel = cardState === 'dismissed' ? meta.ctaReopen : meta.ctaOpen
  const showSuccess = cardState === 'completed'

  return (
    <article className={cx(styles.card, styles[`card_${variant}`], styles[`card_${cardState}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge}>
          <Icon size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title}>{payload?.title}</h3>
          {payload?.description && (
            <p className={styles.description}>{payload.description}</p>
          )}
        </div>
      </header>

      <div
        className={cx(styles.poster, !payload?.poster_url && styles.poster_empty)}
        aria-hidden
      >
        {payload?.poster_url
          ? <img className={styles.posterImg} src={payload.poster_url} alt="" loading="lazy" />
          : <Globe className={styles.posterFallbackGlyph} size={36} strokeWidth={1.5} aria-hidden />
        }
        <div className={cx(styles.trustCapsule, showSuccess && styles.trustCapsule_done)}>
          {showSuccess
            ? <Check size={14} strokeWidth={2.5} aria-hidden />
            : (payload?.favicon_url
                ? <img className={styles.faviconImg} src={payload.favicon_url} alt="" />
                : <Globe size={14} strokeWidth={2} aria-hidden />)
          }
          <span className={styles.faviconDomain}>{payload?.domain_label}</span>
        </div>
      </div>

      {payload?.estimated_minutes != null && !showSuccess && (
        <p className={styles.estimate}>
          Approx. {payload.estimated_minutes} min
          {variant === 'training' && cardState === 'dismissed' && lastProgress != null && (
            <> · Last left at {Math.round(lastProgress)}%</>
          )}
        </p>
      )}

      {showSuccess
        ? (
          <div className={styles.successBanner}>
            <span className={styles.successChip}>
              <Check size={14} strokeWidth={2.5} aria-hidden />
              <span>Submitted</span>
            </span>
            <p className={styles.successMeta}>
              Submitted at {new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date())}.
            </p>
          </div>
        )
        : (
          <div className={styles.ctaRow}>
            <Button variant="primary" fullWidth onClick={handleOpen}>
              <span className={styles.ctaLabel}>{ctaLabel}</span>
              <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </Button>
          </div>
        )
      }

      {sheetOpen && (
        <EmbeddedWebviewSheet
          payload={payload}
          variant={variant}
          meta={meta}
          onClose={handleSheetClose}
          onCompleted={handleCompleted}
          onProgress={handleProgress}
        />
      )}
    </article>
  )
}

/* ─── EmbeddedWebviewSheet — portaled bottom-sheet ─────────────────
   Same chat-frame containment pattern as JobDetailsModal /
   SignatureSheet: portaled into #chat-modal-root, three-phase
   animation, scrim + Esc + close ×, single in-flight close guard. */

function EmbeddedWebviewSheet({
  payload,
  variant,
  meta,
  onClose,
  onCompleted,
  onProgress,            // ← new: forwards progress events to card state
}) {
  const [phase, setPhase] = useState('entering')
  const closingRef = useRef(false)
  const closeBtnRef = useRef(null)

  const [iframeState, setIframeState] = useState('loading')   // 'loading' | 'live' | 'error'
  const iframeRef = useRef(null)

  const [retryNonce, setRetryNonce] = useState(0)

  const [progress, setProgress] = useState(null)            // 0–100 from `progress` event
  const droppedReasonsRef = useRef(new Set())

  /* 8s load watchdog. Cleared when iframe fires `load` (which flips
     iframeState to 'live', breaking the predicate and re-running cleanup). */
  useEffect(() => {
    if (iframeState !== 'loading') return
    const t = window.setTimeout(() => setIframeState('error'), 8000)
    return () => window.clearTimeout(t)
  }, [iframeState, retryNonce])

  const handleRetry = useCallback(() => {
    setIframeState('loading')
    setRetryNonce((n) => n + 1)        // forces iframe key to change → re-mount
  }, [])

  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  /* Two RAFs so the initial styles paint before transition kicks in. */
  useEffect(() => {
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'))
    })
    return () => cancelAnimationFrame(r)
  }, [])

  useEffect(() => {
    if (phase !== 'open') return
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

  /* postMessage listener — attaches when the sheet is open, detaches
     on close. Three-check origin gate; one console warn per reason
     per widget instance. */
  useEffect(() => {
    function warnOnce(reason) {
      if (droppedReasonsRef.current.has(reason)) return
      droppedReasonsRef.current.add(reason)
      console.warn(`[EmbeddedWebview] postMessage dropped: ${reason}`)
    }

    function onMessage(event) {
      const allowedOrigin = payload?.allowed_origin
      const expectedId = payload?.widget_id

      /* Fail-closed: if allowed_origin is missing or mismatched, drop. */
      if (!allowedOrigin || event.origin !== allowedOrigin) {
        warnOnce(allowedOrigin ? 'origin mismatch' : 'allowed_origin missing')
        return
      }
      if (event.data?.source !== 'embedded_webview') {
        return                                              // not for us — silent drop, no warn
      }
      if (event.data?.widget_id !== expectedId) {
        warnOnce('widget_id mismatch')
        return
      }

      switch (event.data.event) {
        case 'progress': {
          const raw = Number(event.data.data?.percent ?? 0)
          const pct = clamp(0, 100, Number.isFinite(raw) ? raw : 0)
          setProgress(pct)
          onProgress?.(pct)
          return
        }
        case 'complete': {
          onCompleted?.(event.data.data ?? {}, 'postmessage')
          return
        }
        case 'cancel': {
          requestClose()
          return
        }
        default: {
          warnOnce(`unknown event "${event.data.event ?? '(none)'}"`)
          return
        }
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [payload, onCompleted, onProgress, requestClose])

  const animatedProgress = useCountUp(variant === 'training' ? progress : null)
  const showProgressChip = variant === 'training' && progress != null

  if (!portalTarget) return null

  return createPortal(
    <div
      className={cx(styles.shLayer, styles[`shLayer_${phase}`])}
      role="dialog"
      aria-modal="true"
      aria-label={payload?.title}
    >
      <div className={styles.shScrim} onClick={requestClose} aria-hidden="true" />
      <div className={styles.shSheet}>
        <header className={styles.shHeader}>
          <div className={styles.shHeaderText}>
            {payload?.favicon_url
              ? <img className={styles.shFavicon} src={payload.favicon_url} alt="" />
              : <Globe size={14} strokeWidth={2} aria-hidden />
            }
            <span className={styles.shDomain}>{payload?.domain_label}</span>
          </div>
          {showProgressChip && (
            <span className={styles.shProgressChip}>
              <span className={styles.shProgressFill} style={{ width: `${Math.round(animatedProgress)}%` }} />
              <span className={styles.shProgressLabel}>{Math.round(animatedProgress)}%</span>
            </span>
          )}
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.shClose}
            onClick={requestClose}
            aria-label="Close"
          >
            <XIcon size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className={styles.shBody} aria-busy={iframeState === 'loading'}>
          {iframeState === 'loading' && (
            <div className={styles.shLoader} role="status" aria-live="polite">
              <Loader2 className={styles.shSpinner} size={28} strokeWidth={1.75} aria-hidden />
              <span className={styles.srOnly}>Loading {payload?.domain_label}…</span>
            </div>
          )}

          <iframe
            key={retryNonce}
            ref={iframeRef}
            className={cx(styles.shIframe, iframeState !== 'live' && styles.shIframe_hidden)}
            src={buildIframeSrc(payload?.url, payload?.widget_id)}
            sandbox={payload?.sandbox ?? DEFAULT_SANDBOX}
            allow={payload?.allow ?? ''}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            title={payload?.title ?? 'Embedded content'}
            onLoad={() => setIframeState('live')}
            onError={() => setIframeState('error')}
          />

          {iframeState === 'error' && (
            <div className={styles.shError} role="alert">
              <WifiOff className={styles.shErrorGlyph} size={36} strokeWidth={1.75} aria-hidden />
              <p className={styles.shErrorTitle}>Couldn't load {payload?.domain_label}.</p>
              <p className={styles.shErrorBody}>
                Check your connection or try again in a moment.
              </p>
              <div className={styles.shErrorActions}>
                <Button variant="secondary" onClick={handleRetry}>
                  <RotateCcw size={16} strokeWidth={2} aria-hidden />
                  <span>Try again</span>
                </Button>
                <button
                  type="button"
                  className={styles.shErrorClose}
                  onClick={requestClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {(variant === 'reader' || variant === 'preview') && (
          <footer className={styles.shFooter}>
            {variant === 'reader' && (
              <Button
                variant="primary"
                fullWidth
                onClick={() => onCompleted?.({}, 'attested')}
              >
                I've read this
              </Button>
            )}
            {variant === 'preview' && (
              <Button
                variant="secondary"
                fullWidth
                onClick={requestClose}
              >
                Done
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>,
    portalTarget,
  )
}
