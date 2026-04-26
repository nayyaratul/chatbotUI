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
    /* Fallback: malformed URL, append best-effort. */
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}wid=${encodeURIComponent(widgetId)}`
  }
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

  const [sheetOpen, setSheetOpen] = useState(false)

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = useCallback(() => {
    setSheetOpen(true)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false)
  }, [])

  const handleCompleted = useCallback((data, method) => {
    /* Submission wiring lands in Task 9. For now, just close. */
    setSheetOpen(false)
  }, [])

  return (
    <article className={cx(styles.card, styles[`card_${variant}`])}>
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
        className={cx(styles.poster, !payload?.poster_url && styles.poster_empty)}
        aria-hidden
      >
        {payload?.poster_url
          ? (
            <img className={styles.posterImg} src={payload.poster_url} alt="" loading="lazy" />
          )
          : (
            <Globe className={styles.posterFallbackGlyph} size={36} strokeWidth={1.5} aria-hidden />
          )
        }
        <div className={styles.trustCapsule}>
          {payload?.favicon_url
            ? <img className={styles.faviconImg} src={payload.favicon_url} alt="" />
            : <Globe size={14} strokeWidth={2} aria-hidden />
          }
          <span className={styles.faviconDomain}>{payload?.domain_label}</span>
        </div>
      </div>

      {payload?.estimated_minutes != null && (
        <p className={styles.estimate}>Approx. {payload.estimated_minutes} min</p>
      )}

      <div className={styles.ctaRow}>
        <Button variant="primary" fullWidth onClick={handleOpen}>
          <span className={styles.ctaLabel}>{meta.ctaOpen}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>

      {sheetOpen && (
        <EmbeddedWebviewSheet
          payload={payload}
          variant={variant}
          meta={meta}
          onClose={handleSheetClose}
          onCompleted={handleCompleted}
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
}) {
  const [phase, setPhase] = useState('entering')
  const closingRef = useRef(false)
  const closeBtnRef = useRef(null)

  const [iframeState, setIframeState] = useState('loading')   // 'loading' | 'live' | 'error'
  const iframeRef = useRef(null)

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
              <Loader2 className={styles.shSpinner} size={28} strokeWidth={2} aria-hidden />
              <span className={styles.srOnly}>Loading {payload?.domain_label}…</span>
            </div>
          )}

          <iframe
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
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
