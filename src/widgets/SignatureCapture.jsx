import { useState } from 'react'
import cx from 'classnames'
import {
  HandCoins,
  ScrollText,
  ClipboardCheck,
  FileText,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './signatureCapture.module.scss'

/* ─── Signature Capture (#14) ─────────────────────────────────────────
   Touch-first signature pad for legally weighty in-chat moments.

   Two structural variants:
     • 'document' — thumbnail preview of an attached doc; tap opens it
                    via JobDetailsModal chrome. Gate clears on close.
     • 'text'     — inline scrollable agreement body. Gate clears on
                    scroll-to-end.

   Use-case (offer / contract / completion) is a payload field that
   drives header icon + default copy only — not a separate variant.

   Capture surface: bottom-sheet (mobile) / modal (desktop). The card
   itself is a non-interactive preview that holds 4 states:
     idle (gate-pending) → reviewed (gate met) → captured → submitted

   Region 1 ships the shell, header, body region, gate caption, idle
   preview region, and CTA scaffolding. Gate logic, sheet, captured /
   submitted states land in subsequent regions.

   Spec: docs/superpowers/specs/2026-04-25-signature-capture-widget-design.md
   Rule book: docs/widget-conventions.md
   ─────────────────────────────────────────────────────────────────── */

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

/* ─── Body — document variant ───────────────────────────────────────── */

function DocumentBody({ documentRef }) {
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
        <button type="button" className={styles.docOpenLink} disabled>
          <span>Open document</span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ─── Body — text variant ───────────────────────────────────────────── */

function AgreementBody({ agreementText }) {
  const paragraphs = String(agreementText ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className={styles.agreement}>
      <div
        className={styles.agreementBody}
        tabIndex={0}
        role="region"
        aria-label="Agreement text"
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

  /* Region 1 — gate is always pending. State machine arrives in region 2. */
  const [gateMet] = useState(false)
  const [captured] = useState(false)

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

      {variant === 'document'
        ? <DocumentBody documentRef={documentRef} />
        : <AgreementBody agreementText={agreementText} />}

      <p className={cx(styles.gateCaption, gateMet && styles.gateCaption_met)}>
        {gateMet ? (
          <>
            <Check size={14} strokeWidth={2.25} aria-hidden />
            <span>{variant === 'text' ? 'Agreement read' : 'Document reviewed'}</span>
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
        <span className={styles.previewCaption}>
          {gateMet ? 'Tap to sign' : 'Tap to sign'}
        </span>
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
    </div>
  )
}
