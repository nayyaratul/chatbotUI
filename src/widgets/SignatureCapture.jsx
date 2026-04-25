import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  HandCoins,
  ScrollText,
  ClipboardCheck,
  FileText,
  ChevronRight,
  Check,
  X as XIcon,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './signatureCapture.module.scss'

/* ─── Signature Capture (#14) ─────────────────────────────────────────
   Touch-first signature pad for legally weighty in-chat moments.

   Two structural variants:
     • 'document' — thumbnail preview of an attached doc; tap opens it
                    in a portaled DocumentViewerSheet. Gate clears on
                    close.
     • 'text'     — inline scrollable agreement body. Gate clears on
                    scroll-to-end.

   Use-case (offer / contract / completion) is a payload field that
   drives header icon + default copy only — not a separate variant.

   Capture surface (region 3+): bottom-sheet (mobile) / modal (desktop).
   The card itself is a non-interactive preview that holds 4 states:
     idle (gate-pending) → reviewed (gate met) → captured → submitted

   Region 2 wires the gate logic — DocumentViewerSheet for the
   `document` variant, scroll-to-end detection for the `text` variant,
   caption swap with timestamp, preview region opacity ramp. Capture
   surface lands in region 3.

   Spec: docs/superpowers/specs/2026-04-25-signature-capture-widget-design.md
   Rule book: docs/widget-conventions.md
   ─────────────────────────────────────────────────────────────────── */

const SHEET_ANIM_DURATION = 280

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

/* ─── Document viewer — portaled modal/sheet ────────────────────────
   Reuses the chat-frame portal target (#chat-modal-root) used by
   JobDetailsModal so the doc-viewer respects the device-frame
   metaphor instead of escaping to the browser window. Tap-to-close
   on scrim + Esc + close × all converge through requestClose with a
   single in-flight guard so onClose only fires once. */

function DocumentViewerSheet({ documentRef, onClose }) {
  const [phase, setPhase] = useState('entering')
  const closeBtnRef = useRef(null)
  const closingRef  = useRef(false)
  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  /* Two-frame settle so the entering styles paint before the open
     transition kicks in — same pattern as JobDetailsModal. */
  useEffect(() => {
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'))
    })
    return () => cancelAnimationFrame(r)
  }, [])

  /* Focus close button on open + lock body scroll under the modal. */
  useEffect(() => {
    if (phase !== 'open') return
    closeBtnRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
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

  const meta = []
  if (documentRef?.pages != null) meta.push(`${documentRef.pages} page${documentRef.pages === 1 ? '' : 's'}`)
  if (documentRef?.version)       meta.push(documentRef.version)
  if (documentRef?.updated_at)    meta.push(`Updated ${documentRef.updated_at}`)

  return createPortal(
    <div
      className={cx(styles.dvLayer, styles[`dvLayer_${phase}`])}
      role="dialog"
      aria-modal="true"
      aria-label={`${documentRef?.label ?? 'Document'} — preview`}
    >
      <div
        className={styles.dvScrim}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div className={styles.dvSheet}>
        <header className={styles.dvHeader}>
          <div className={styles.dvHeaderText}>
            <p className={styles.dvEyebrow}>Document preview</p>
            <h4 className={styles.dvTitle}>{documentRef?.label ?? 'Document'}</h4>
            {meta.length > 0 && (
              <p className={styles.dvMeta}>{meta.join(' · ')}</p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.dvClose}
            onClick={requestClose}
            aria-label="Close document preview"
          >
            <XIcon size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className={styles.dvBody}>
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
        </div>

        <footer className={styles.dvFooter}>
          <Button
            variant="primary"
            fullWidth
            onClick={requestClose}
          >
            I have reviewed the document
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

/* ─── Body — text variant ───────────────────────────────────────────── */

function AgreementBody({ agreementText, onScrollEnd, gateMet, scrollRef }) {
  const paragraphs = String(agreementText ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  /* On mount, if the body is short enough that no scrolling is required,
     fire onScrollEnd immediately — the user can't scroll-to-end content
     that already fits. Without this, short agreements would leave the
     gate permanently pending. */
  useEffect(() => {
    if (gateMet) return
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight <= el.clientHeight + 1) {
      onScrollEnd()
    }
  }, [gateMet, agreementText, onScrollEnd, scrollRef])

  function handleScroll() {
    if (gateMet) return
    const el = scrollRef.current
    if (!el) return
    /* 4px tolerance — matches var(--size-04) in spirit; tracks the
       "almost-at-bottom" rung in the design token scale. */
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
      onScrollEnd()
    }
  }

  return (
    <div className={styles.agreement}>
      <div
        ref={scrollRef}
        className={styles.agreementBody}
        tabIndex={0}
        role="region"
        aria-label="Agreement text"
        onScroll={handleScroll}
      >
        {paragraphs.length > 0
          ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
          : <p>{agreementText}</p>}
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

  const [gateMet, setGateMet]   = useState(false)
  const [gateAt, setGateAt]     = useState(null)
  const [docOpen, setDocOpen]   = useState(false)
  const [captured]              = useState(false)
  const scrollRef               = useRef(null)

  const handleGateClear = useCallback(() => {
    setGateMet((prev) => {
      if (prev) return prev
      setGateAt(Date.now())
      return true
    })
  }, [])

  const handleOpenDocument = useCallback(() => {
    setDocOpen(true)
  }, [])

  const handleDocumentClose = useCallback(() => {
    setDocOpen(false)
    handleGateClear()
  }, [handleGateClear])

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

      {variant === 'document' ? (
        <DocumentBody
          documentRef={documentRef}
          onOpen={handleOpenDocument}
          gateMet={gateMet}
        />
      ) : (
        <AgreementBody
          agreementText={agreementText}
          onScrollEnd={handleGateClear}
          gateMet={gateMet}
          scrollRef={scrollRef}
        />
      )}

      <p className={cx(styles.gateCaption, gateMet && styles.gateCaption_met)}>
        {gateMet ? (
          <>
            <Check size={14} strokeWidth={2.25} aria-hidden />
            <span>{gateMetCopy(variant)} · {timeLabel(gateAt)}</span>
          </>
        ) : (
          <span>{gatePendingCopy(variant)}</span>
        )}
      </p>

      <div
        className={cx(
          styles.preview,
          !gateMet && styles.preview_gated,
          captured && styles.preview_captured,
        )}
        aria-disabled={!gateMet || undefined}
      >
        <div className={styles.previewBaseline} aria-hidden />
        <span className={styles.previewMark} aria-hidden>×</span>
        <span className={styles.previewCaption}>Tap to sign</span>
      </div>

      {showDisclaimer && (
        <p className={styles.disclaimer}>{disclaimer}</p>
      )}

      <div className={styles.ctaRow}>
        <Button
          variant="primary"
          fullWidth
          disabled={!gateMet || !captured}
        >
          {ctaLabel}
        </Button>
      </div>

      {variant === 'document' && docOpen && (
        <DocumentViewerSheet
          documentRef={documentRef}
          onClose={handleDocumentClose}
        />
      )}
    </div>
  )
}
