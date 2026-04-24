import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  ShieldCheck,
  MessagesSquare,
  ScanSearch,
  HandCoins,
  ChevronRight,
  Check,
  X as XIcon,
  CircleCheck,
  CircleX,
  CircleHelp,
  Flag,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
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

const ACTION_META = {
  approve:   { label: 'Approve',    Icon: CircleCheck, tone: 'success', destructive: false },
  reject:    { label: 'Reject',     Icon: CircleX,     tone: 'error',   destructive: true  },
  more_info: { label: 'More info',  Icon: CircleHelp,  tone: 'warning', destructive: true  },
  escalate:  { label: 'Escalate',   Icon: Flag,        tone: 'brand',   destructive: true  },
}

/* Fixed render order: destructive on the left, constructive on the
   right (thumb/eye lands on Approve). A subset of these is accepted
   via payload.actions. */
const ACTION_ORDER = ['escalate', 'more_info', 'reject', 'approve']

const CONFIRM_COPY = {
  reject:    { prompt: 'Reason for rejection (optional)',         confirm: 'Confirm reject'   },
  more_info: { prompt: 'What information do you need? (optional)', confirm: 'Confirm request' },
  escalate:  { prompt: 'Escalation note (optional)',              confirm: 'Confirm escalate' },
}

const TONE_CLASS = {
  success: 'card_success',
  warning: 'card_warning',
  error:   'card_error',
}

const SHORTCUT_KEY = {
  approve: 'A', reject: 'R', more_info: 'M', escalate: 'E',
}

function formatClockTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function Approval({ payload }) {
  const {
    variant = 'bgv',
    case_id,
    summary,
    recommendation,
    reasoning,
    evidence = [],
    actions = ['approve', 'reject', 'more_info', 'escalate'],
  } = payload ?? {}
  const Icon = VARIANT_ICONS[variant] ?? ShieldCheck

  const [openPanelId, setOpenPanelId] = useState(null)
  const [pending, setPending] = useState(null)   // null | 'reject' | 'more_info' | 'escalate'
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState(null) // null | { action, notes, at }

  // §9 tone: post-commit tracks the decision; pre-commit tracks the recommendation.
  const activeTone = decision
    ? (decision.action === 'approve'    ? 'success'
      : decision.action === 'reject'    ? 'error'
      : decision.action === 'more_info' ? 'warning'
      : 'success')  // 'escalate' falls back to brand via special-case below
    : recommendation?.tone

  // 'escalate' gets brand-60 via its own modifier so it doesn't turn success-green.
  const toneClass =
    decision?.action === 'escalate'
      ? 'card_brand'
      : (TONE_CLASS[activeTone] ?? null)

  const { onReply } = useChatActions()

  const visibleActions = useMemo(
    () => ACTION_ORDER.filter((a) => actions.includes(a)),
    [actions],
  )

  const commit = useCallback(
    (action, noteText = '') => {
      const decidedAt = new Date().toISOString()
      setDecision({ action, notes: noteText, at: decidedAt })
      onReply({
        type: 'widget_response',
        payload: {
          widget_id: payload?.widget_id,
          source_type: 'approval',
          case_id,
          decision: action,
          notes: noteText || undefined,
          decided_at: decidedAt,
        },
      })
    },
    [onReply, case_id, payload?.widget_id],
  )

  const handleClick = useCallback(
    (action) => {
      if (decision) return
      if (!ACTION_META[action]?.destructive) {
        commit(action)
        return
      }
      setPending(action)
      setNotes('')
    },
    [decision, commit],
  )

  const cancelPending = useCallback(() => {
    setPending(null)
    setNotes('')
  }, [])

  const confirmPending = useCallback(() => {
    if (!pending) return
    commit(pending, notes.trim())
    setPending(null)
  }, [pending, notes, commit])

  const togglePanel = useCallback(
    (id) => setOpenPanelId((prev) => (prev === id ? null : id)),
    [],
  )

  const rootRef = useRef(null)

  useEffect(() => {
    if (decision) return
    const node = rootRef.current
    if (!node) return
    node.focus({ preventScroll: true })
  }, [decision])

  useEffect(() => {
    if (decision) return
    function onKey(e) {
      // ignore if focus is inside a textarea (pending notes)
      if (e.target?.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && !e.shiftKey && pending) {
          e.preventDefault()
          confirmPending()
        }
        if (e.key === 'Escape' && pending) {
          e.preventDefault()
          cancelPending()
        }
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'a' && actions.includes('approve'))   { e.preventDefault(); handleClick('approve')   }
      if (key === 'r' && actions.includes('reject'))    { e.preventDefault(); handleClick('reject')    }
      if (key === 'm' && actions.includes('more_info')) { e.preventDefault(); handleClick('more_info') }
      if (key === 'e' && actions.includes('escalate'))  { e.preventDefault(); handleClick('escalate')  }
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        const item = evidence[idx]
        if (item) { e.preventDefault(); togglePanel(item.id) }
      }
    }
    const node = rootRef.current
    if (!node) return
    node.addEventListener('keydown', onKey)
    return () => node.removeEventListener('keydown', onKey)
  }, [decision, pending, actions, evidence, handleClick, togglePanel, confirmPending, cancelPending])

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cx(styles.card, toneClass && styles[toneClass])}
    >
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
          committed={!!decision}
          decisionKey={decision?.action}
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
              committed={!!decision}
              onToggle={togglePanel}
            />
          ))}
        </ul>
      )}
      {!decision ? (
        <div className={styles.actionRegion}>
          {pending && (
            <div className={styles.pendingPrompt}>
              <label className={styles.pendingLabel} htmlFor={`apv-notes-${payload?.widget_id}`}>
                {CONFIRM_COPY[pending]?.prompt}
              </label>
              <textarea
                id={`apv-notes-${payload?.widget_id}`}
                className={styles.pendingTextarea}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                autoFocus
              />
              <div className={styles.pendingActions}>
                <Button type="button" variant="secondary" onClick={cancelPending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={confirmPending}
                  className={cx(styles.confirmButton, styles[`confirmButton_${ACTION_META[pending].tone}`])}
                >
                  {CONFIRM_COPY[pending]?.confirm}
                </Button>
              </div>
            </div>
          )}

          <div className={cx(styles.actionBar, pending && styles.actionBar_locked)}>
            {visibleActions.map((action) => {
              const meta = ACTION_META[action]
              const ActionIcon = meta.Icon
              return (
                <Button
                  key={action}
                  type="button"
                  variant={action === 'approve' ? 'primary' : 'secondary'}
                  onClick={() => handleClick(action)}
                  disabled={!!pending && pending !== action}
                  className={cx(
                    styles.actionButton,
                    styles[`actionButton_${action}`],
                    pending === action && styles.actionButton_armed,
                  )}
                >
                  <ActionIcon size={16} strokeWidth={2} />
                  <span>{meta.label}</span>
                  <span className={styles.kbd} aria-hidden>{SHORTCUT_KEY[action]}</span>
                </Button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={styles.committed}>
          <div className={styles.banner}>
            <span className={cx(styles.bannerChip, styles[`bannerChip_${decision.action}`])}>
              <CircleCheck size={14} strokeWidth={2} />
              <span>{VERDICT_LABEL_DONE[decision.action]}</span>
            </span>
            <span className={styles.bannerMeta}>
              Decided at {formatClockTime(decision.at)} · Confidence {Math.round((recommendation?.confidence ?? 0) * 100)}%
            </span>
          </div>
          {decision.notes && (
            <blockquote className={styles.notesEcho}>{decision.notes}</blockquote>
          )}
        </div>
      )}
    </div>
  )
}
