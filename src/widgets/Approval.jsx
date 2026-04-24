import { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'
import {
  ShieldCheck,
  MessagesSquare,
  ScanSearch,
  HandCoins,
  ChevronRight,
  Check,
  X as XIcon,
} from 'lucide-react'
import styles from './approval.module.scss'

/* ─── Approval Widget (#23) ────────────────────────────────────────
   Admin / reviewer card. One shell, four variants (bgv, interview,
   qc_flagged, offer). State machine: idle → pending-confirm (for
   destructive actions) → committed. Signature moment: confidence arc
   as §2 header-right flourish.

   Spec: docs/superpowers/specs/2026-04-24-approval-widget-design.md
   Rule book: docs/widget-conventions.md
   ──────────────────────────────────────────────────────────────── */

const VERDICT_LABEL = {
  approve:    'APPROVE',
  reject:     'REJECT',
  borderline: 'BORDERLINE',
}

const VERDICT_LABEL_DONE = {
  approve:    'APPROVED',
  reject:     'REJECTED',
  more_info:  'INFO REQUESTED',
  escalate:   'ESCALATED',
}

/* r=18 fits inside the 44×44 viewBox with gutter for the 3px stroke. */
const ARC_CIRCUMFERENCE = 2 * Math.PI * 18

function ConfidenceArc({ confidence, verdict, committed = false, decisionKey = null }) {
  const target = committed ? 1 : (confidence ?? 0)
  const [swept, setSwept] = useState(false)

  // mount-only — Studio variant switches remount the widget, so no re-trigger needed here.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setSwept(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const dashOffset =
    ARC_CIRCUMFERENCE * (1 - (swept ? Math.max(0, Math.min(1, target)) : 0))
  const labelWord = committed
    ? (VERDICT_LABEL_DONE[decisionKey] ?? VERDICT_LABEL[verdict] ?? '')
    : (VERDICT_LABEL[verdict] ?? '')

  return (
    <div className={styles.arcWrap}>
      <svg
        className={styles.arcSvg}
        viewBox="0 0 44 44"
        role="img"
        aria-label={`Confidence ${Math.round((confidence ?? 0) * 100)} percent`}
      >
        <circle className={styles.arcTrack} cx="22" cy="22" r="18" />
        <circle
          className={styles.arcFill}
          cx="22"
          cy="22"
          r="18"
          style={{ strokeDasharray: ARC_CIRCUMFERENCE, strokeDashoffset: dashOffset }}
        />
      </svg>
      <span className={styles.arcVerdict}>{labelWord}</span>
    </div>
  )
}

/* ─── Evidence body renderers ───────────────────────────────────────
   One helper per kind. EvidenceBody dispatches to the right one.
   All sit above Approval so they close over styles but not widget state. */

function EvidenceBodyDocument({ body }) {
  return (
    <div className={styles.evDocument}>
      <div className={styles.evDocThumb} aria-hidden>
        {body?.thumbnail_url ? (
          <img src={body.thumbnail_url} alt="" />
        ) : (
          <span className={styles.evDocThumbEmpty}>
            {(body?.name ?? 'doc').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className={styles.evDocText}>
        <p className={styles.evDocName}>{body?.name}</p>
        {body?.subtitle && <p className={styles.evDocSubtitle}>{body.subtitle}</p>}
      </div>
    </div>
  )
}

function EvidenceBodyScore({ body }) {
  const rows = body?.rows ?? []
  return (
    <ul className={styles.evScoreList}>
      {rows.map((row, i) => {
        const v = Math.max(0, Math.min(1, row.value ?? 0))
        const band = v >= 0.85 ? 'strong' : v >= 0.6 ? 'okay' : 'weak'
        return (
          <li key={i} className={styles.evScoreRow}>
            <span className={styles.evScoreLabel}>{row.label}</span>
            <span className={styles.evScoreTrack}>
              <span
                className={cx(styles.evScoreFill, styles[`evScoreFill_${band}`])}
                style={{ width: `${Math.round(v * 100)}%` }}
              />
            </span>
            <span className={styles.evScoreValue}>{Math.round(v * 100)}%</span>
          </li>
        )
      })}
    </ul>
  )
}

function EvidenceBodyTranscript({ body }) {
  const excerpts = body?.excerpts ?? []
  return (
    <ul className={styles.evTranscriptList}>
      {excerpts.map((x, i) => (
        <li key={i} className={styles.evTranscriptRow}>
          <span className={styles.evTranscriptTime}>{x.timestamp}</span>
          <p className={styles.evTranscriptText}>{x.text}</p>
        </li>
      ))}
    </ul>
  )
}

function EvidenceBodyCriteria({ body }) {
  const items = body?.items ?? []
  return (
    <ul className={styles.evCriteriaGrid}>
      {items.map((it, i) => (
        <li
          key={i}
          className={cx(
            styles.evCriteriaChip,
            it.pass ? styles.evCriteriaChip_pass : styles.evCriteriaChip_fail,
          )}
        >
          {it.pass ? <Check size={14} strokeWidth={2} /> : <XIcon size={14} strokeWidth={2} />}
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  )
}

function EvidenceBodyCompensation({ body }) {
  const rows = body?.rows ?? []
  return (
    <ul className={styles.evCompList}>
      {rows.map((row, i) => (
        <li key={i} className={styles.evCompRow}>
          <span className={styles.evCompLabel}>{row.label}</span>
          <span className={styles.evCompValue}>{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

function EvidenceBody({ kind, body }) {
  switch (kind) {
    case 'document':      return <EvidenceBodyDocument body={body} />
    case 'score':         return <EvidenceBodyScore body={body} />
    case 'transcript':    return <EvidenceBodyTranscript body={body} />
    case 'criteria':      return <EvidenceBodyCriteria body={body} />
    case 'compensation':  return <EvidenceBodyCompensation body={body} />
    default:
      if (import.meta.env.DEV) {
        console.warn(`[Approval] unsupported evidence kind: ${kind}`)
      }
      return <p className={styles.evUnknown}>Unsupported evidence kind.</p>
  }
}

function EvidencePanel({ item, open, committed, onToggle }) {
  return (
    <li className={cx(styles.evPanel, open && styles.evPanel_open, committed && styles.evPanel_done)}>
      <button
        type="button"
        className={styles.evHeader}
        onClick={() => onToggle(item.id)}
        aria-expanded={open}
      >
        <span className={styles.evChevron} aria-hidden>
          <ChevronRight size={16} strokeWidth={2} />
        </span>
        <span className={styles.evLabel}>{item.label}</span>
        {item.meta && <span className={styles.evMeta}>{item.meta}</span>}
      </button>
      {open && (
        <div className={styles.evBody}>
          <EvidenceBody kind={item.kind} body={item.body} />
        </div>
      )}
    </li>
  )
}

const VARIANT_ICONS = {
  bgv: ShieldCheck,
  interview: MessagesSquare,
  qc_flagged: ScanSearch,
  offer: HandCoins,
}

const TONE_CLASS = {
  success: 'card_success',
  warning: 'card_warning',
  error:   'card_error',
}

export function Approval({ payload }) {
  const { variant = 'bgv', summary, recommendation, reasoning, evidence = [] } = payload ?? {}
  const Icon = VARIANT_ICONS[variant] ?? ShieldCheck

  const toneClass = TONE_CLASS[recommendation?.tone] ?? null

  const [openPanelId, setOpenPanelId] = useState(null)

  const togglePanel = useCallback(
    (id) => setOpenPanelId((prev) => (prev === id ? null : id)),
    [],
  )

  return (
    <div className={cx(styles.card, toneClass && styles[toneClass])}>
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <span className={styles.iconBadge} aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{summary?.title}</h3>
            {summary?.subtitle && (
              <p className={styles.description}>{summary.subtitle}</p>
            )}
          </div>
        </div>
        <ConfidenceArc
          confidence={recommendation?.confidence}
          verdict={recommendation?.verdict}
        />
      </header>
      {reasoning && (
        <blockquote className={styles.reasoning}>
          {reasoning}
        </blockquote>
      )}
      {evidence.length > 0 && (
        <ul className={styles.evidenceList}>
          {evidence.map((item) => (
            <EvidencePanel
              key={item.id}
              item={item}
              open={openPanelId === item.id}
              committed={false}
              onToggle={togglePanel}
            />
          ))}
        </ul>
      )}
      {/* Action bar follows in Task 6 */}
    </div>
  )
}
