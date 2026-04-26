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

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function useCountUp(target, durationMs = 280) {
  const [value, setValue] = useState(target ?? 0)
  const startedRef = useRef({ from: 0, to: 0, t0: 0, raf: 0 })

  useEffect(() => {
    if (target == null) return
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
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

  const posterRef = useRef(null)
  const [liftState, setLiftState] = useState(null)
  /* liftState shape:
     { direction: 'forward' | 'reverse', sourceRect, targetRect, tint }
     null when not lifting. */

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = useCallback(() => {
    if (cardState === 'completed') return                     // proof state — locked
    if (cardState === 'sheet_open') return                    // double-tap guard

    if (!prefersReducedMotion()) {
      /* Phase 1 — measure source. Sheet has not mounted yet; we use a
         provisional target rect (the chat-modal-root's body area). The
         sheet, when it mounts, will call back with the precise iframe
         frame rect; the clone re-targets via setLiftState if needed. */
      const sourceRect = posterRef.current?.getBoundingClientRect()
      const modalRoot = document.getElementById('chat-modal-root')
      const rootRect = modalRoot?.getBoundingClientRect()
      const provisionalTarget = rootRect && sourceRect
        ? {
            x: rootRect.left,
            y: rootRect.top + rootRect.height * 0.18,
            width: rootRect.width,
            height: rootRect.height * 0.62,
          }
        : null

      if (sourceRect && provisionalTarget) {
        setLiftState({
          direction: 'forward',
          sourceRect: { x: sourceRect.left - rootRect.left, y: sourceRect.top - rootRect.top, width: sourceRect.width, height: sourceRect.height },
          targetRect: { x: provisionalTarget.x - rootRect.left, y: provisionalTarget.y - rootRect.top, width: provisionalTarget.width, height: provisionalTarget.height },
          tint: 'transparent',
        })
      }
    }

    lastOpenedAtRef.current = Date.now()
    setCardState('sheet_open')
  }, [cardState])

  const handleSheetClose = useCallback(() => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }

    if (!prefersReducedMotion()) {
      /* Capture rects for reverse FLIP. */
      const sourceRect = posterRef.current?.getBoundingClientRect()
      const modalRoot = document.getElementById('chat-modal-root')
      const rootRect = modalRoot?.getBoundingClientRect()
      if (sourceRect && rootRect) {
        const currentTarget = liftState?.targetRect
          ?? {
            x: 0,
            y: rootRect.height * 0.18,
            width: rootRect.width,
            height: rootRect.height * 0.62,
          }
        setLiftState({
          direction: 'reverse',
          sourceRect: {
            x: sourceRect.left - rootRect.left,
            y: sourceRect.top - rootRect.top,
            width: sourceRect.width,
            height: sourceRect.height,
          },
          targetRect: currentTarget,
          tint: liftState?.tint ?? 'transparent',
        })
      }
    }

    setCardState((prev) => (prev === 'completed' ? prev : 'dismissed'))
  }, [liftState])

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

  const handleLiftDone = useCallback(() => {
    setLiftState(null)
  }, [])

  const handleSheetMeasured = useCallback((iframeFrameRect, tint) => {
    setLiftState((prev) => {
      if (!prev || prev.direction !== 'forward') return prev
      const modalRoot = document.getElementById('chat-modal-root')
      const rootRect = modalRoot?.getBoundingClientRect()
      if (!rootRect) return prev
      return {
        ...prev,
        targetRect: {
          x: iframeFrameRect.left - rootRect.left,
          y: iframeFrameRect.top - rootRect.top,
          width: iframeFrameRect.width,
          height: iframeFrameRect.height,
        },
        tint: tint ?? prev.tint,
      }
    })
  }, [])

  const sheetOpen = cardState === 'sheet_open'

  const ctaLabel = cardState === 'dismissed' ? meta.ctaReopen : meta.ctaOpen
  const showSuccess = cardState === 'completed'

  return (
    <article className={cx(styles.card, styles[`card_${variant}`], styles[`card_${cardState}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden>
          <Icon size={18} strokeWidth={2} />
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
        ref={posterRef}
        className={cx(
          styles.poster,
          !payload?.poster_url && styles.poster_empty,
          liftState && styles.poster_fading,
        )}
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
          lifted={!liftState || liftState.direction === 'reverse'}
          onClose={handleSheetClose}
          onCompleted={handleCompleted}
          onProgress={handleProgress}
          onMeasured={handleSheetMeasured}
        />
      )}

      {liftState && (
        <LiftClone
          sourceRect={liftState.sourceRect}
          targetRect={liftState.targetRect}
          posterUrl={payload?.poster_url}
          faviconUrl={payload?.favicon_url}
          domainLabel={payload?.domain_label}
          direction={liftState.direction}
          tint={liftState.tint}
          onDone={handleLiftDone}
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
  lifted,
  onClose,
  onCompleted,
  onProgress,            // ← new: forwards progress events to card state
  onMeasured,
}) {
  const [phase, setPhase] = useState('entering')
  const closingRef = useRef(false)
  const closeBtnRef = useRef(null)
  const iframeFrameRef = useRef(null)

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

  /* Two RAFs so the initial styles paint before transition kicks in.
     Track BOTH ids so an unmount between outer and inner cancels the
     inner — otherwise setPhase fires on an unmounted component. */
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('open'))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'open') return
    closeBtnRef.current?.focus({ preventScroll: true })
  }, [phase])

  useEffect(() => {
    if (phase !== 'open') return
    const rect = iframeFrameRef.current?.getBoundingClientRect()
    if (rect && onMeasured) {
      /* tint sampling: read the iframe-frame's computed background. */
      const computed = iframeFrameRef.current
        ? getComputedStyle(iframeFrameRef.current).backgroundColor
        : undefined
      onMeasured(rect, computed)
    }
  }, [phase, onMeasured])

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
              {/* Re-key per integer so the digit-tick keyframe re-runs on
                 each percent change — reads as a digit roll, not a swap. */}
              <span key={Math.round(animatedProgress)} className={styles.shProgressLabel}>
                {Math.round(animatedProgress)}%
              </span>
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

        <div
          ref={iframeFrameRef}
          className={cx(styles.shBody, lifted ? styles.shBody_lifted : styles.shBody_pre_lift)}
          aria-busy={iframeState === 'loading'}
        >
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

/* ─── LiftClone — FLIP source-element clone ──────────────────────────
   Portaled into #chat-modal-root; animates from sourceRect → targetRect
   over LIFT_DURATION on the family rise-up curve. Removed from the
   tree once the animation settles.

   The clone is purely visual — pointer events disabled, aria-hidden.
   The sheet's iframe-frame and the compact card's poster sit at the
   src + target ends with opacity 0 / 0.4 respectively while the clone
   carries the visual. */

function LiftClone({ sourceRect, targetRect, posterUrl, faviconUrl, domainLabel, direction, onDone, tint }) {
  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null
  const [phase, setPhase] = useState('start')                 // 'start' | 'end'

  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('end'))
    })
    const t = window.setTimeout(onDone, LIFT_DURATION + 40)
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
      window.clearTimeout(t)
    }
  }, [onDone])

  if (!portalTarget || !sourceRect || !targetRect) return null

  const fromRect = direction === 'reverse' ? targetRect : sourceRect
  const toRect   = direction === 'reverse' ? sourceRect : targetRect
  const rect = phase === 'start' ? fromRect : toRect
  /* Poster has rounded corners (radius-150); iframe-frame has square
     corners. Morph the radius alongside the rect interpolation so the
     end of the lift doesn't snap. */
  const fromRadius = direction === 'reverse' ? '0' : 'var(--radius-150)'
  const toRadius   = direction === 'reverse' ? 'var(--radius-150)' : '0'
  const radius = phase === 'start' ? fromRadius : toRadius

  return createPortal(
    <div
      className={styles.liftClone}
      aria-hidden
      style={{
        left: rect.x + 'px',
        top: rect.y + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        borderRadius: radius,
        '--lift-tint': tint || 'transparent',
      }}
    >
      {posterUrl
        ? <img src={posterUrl} alt="" className={styles.liftCloneImg} />
        : <span className={styles.liftCloneFallback}><Globe size={36} strokeWidth={1.5} aria-hidden /></span>
      }
      <div className={styles.trustCapsule}>
        {faviconUrl
          ? <img className={styles.faviconImg} src={faviconUrl} alt="" />
          : <Globe size={14} strokeWidth={2} aria-hidden />
        }
        <span className={styles.faviconDomain}>{domainLabel}</span>
      </div>
    </div>,
    portalTarget,
  )
}
