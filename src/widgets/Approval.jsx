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

const VERDICT_GLYPH = {
  approve:    Check,
  reject:     XIcon,
  borderline: CircleHelp,
}

function ConfidenceArc({ confidence, verdict, committed = false, decisionKey = null }) {
  const target = committed ? 1 : (confidence ?? 0)
  const [swept, setSwept] = useState(false)
  const wasCommittedRef = useRef(committed)
  const [morphing, setMorphing] = useState(false)

  // mount-only — Studio variant switches remount the widget, so no re-trigger needed here.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setSwept(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Tone morph: when committed flips from false → true, run a short
  // "through-neutral" animation on the fill stroke, timed to the
  // success-banner's 280ms spring-in so the two feel like one motion.
  useEffect(() => {
    if (!wasCommittedRef.current && committed) {
      setMorphing(true)
      const t = setTimeout(() => setMorphing(false), 320)
      wasCommittedRef.current = committed
      return () => clearTimeout(t)
    }
    wasCommittedRef.current = committed
  }, [committed])

  const dashOffset =
    ARC_CIRCUMFERENCE * (1 - (swept ? Math.max(0, Math.min(1, target)) : 0))
  const labelWord = committed
    ? (VERDICT_LABEL_DONE[decisionKey] ?? VERDICT_LABEL[verdict] ?? '')
    : (VERDICT_LABEL[verdict] ?? '')

  const Glyph = !committed ? VERDICT_GLYPH[verdict] : null

  return (
    <div className={cx(styles.arcWrap, swept && styles.arcWrap_ready)}>
      <svg
        className={styles.arcSvg}
        viewBox="0 0 44 44"
        role="img"
        aria-label={`Confidence ${Math.round((confidence ?? 0) * 100)} percent`}
      >
        <circle className={styles.arcTrack} cx="22" cy="22" r="18" />
        <circle
          className={cx(styles.arcFill, morphing && styles.arcFill_morphing)}
          cx="22"
          cy="22"
          r="18"
          style={{ strokeDasharray: ARC_CIRCUMFERENCE, strokeDashoffset: dashOffset }}
        />
      </svg>
      <span className={styles.arcVerdict}>
        {Glyph && (
          <Glyph size={12} strokeWidth={2} className={styles.arcVerdictGlyph} aria-hidden />
        )}
        <span className={styles.arcVerdictWord}>{labelWord}</span>
      </span>
    </div>
  )
}

/* ─── Evidence body renderers ───────────────────────────────────────
   One helper per kind. EvidenceBody dispatches to the right one.
   All sit above Approval so they close over styles but not widget state. */

function EvidenceBodyDocument({ body }) {
  const hasImage = !!body?.thumbnail_url
  return (
    <div className={styles.evDocument}>
      <div
        className={cx(styles.evDocThumb, !hasImage && styles.evDocThumb_empty)}
        aria-hidden
      >
        {hasImage ? (
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
        {item.meta && (
          <span
            className={cx(
              styles.evMeta,
              item.meta_tone && styles[`evMeta_${item.meta_tone}`],
            )}
          >
            {item.meta}
          </span>
        )}
      </button>
      {/* grid-template-rows 0fr→1fr trick: body stays mounted, just collapses. */}
      <div
        className={cx(styles.evBodyOuter, open && styles.evBodyOuter_open)}
        aria-hidden={!open}
      >
        <div className={styles.evBodyInner}>
          <div className={styles.evBody}>
            <EvidenceBody kind={item.kind} body={item.body} />
          </div>
        </div>
      </div>
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
  brand:   'card_brand',
}

/* Maps a committed decision.action → §9 tone slot. 'escalate' uses
   brand-60 rather than any semantic success/error/warning color. */
const DECISION_TONE = {
  approve:   'success',
  reject:    'error',
  more_info: 'warning',
  escalate:  'brand',
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
  // 'live' → action bar visible. 'exiting' → action bar slides out left
  // while the committed banner has yet to appear. 'done' → banner visible.
  // The exiting phase is ~180ms so it reads as a hand-off, not a pause.
  const [phase, setPhase] = useState('live')

  // §9 tone: post-commit tracks the decision; pre-commit tracks the recommendation.
  const activeTone = decision
    ? DECISION_TONE[decision.action]
    : recommendation?.tone
  const toneClass = TONE_CLASS[activeTone] ?? null

  const { onReply } = useChatActions()

  const visibleActions = useMemo(
    () => ACTION_ORDER.filter((a) => actions.includes(a)),
    [actions],
  )

  /* Primary row = the two-decision bar (Reject + Approve) that takes the
     main visual weight. Secondary row = Escalate + More info as text-link
     buttons above, lower chrome. Mirrors JobCard's "View full details" /
     actions split. */
  const primaryActions = useMemo(
    () => visibleActions.filter((a) => a === 'reject' || a === 'approve'),
    [visibleActions],
  )
  const secondaryActions = useMemo(
    () => visibleActions.filter((a) => a === 'escalate' || a === 'more_info'),
    [visibleActions],
  )

  // Holds the decision payload during the ~180ms 'exiting' phase,
  // between `onReply` firing and the committed banner appearing.
  const pendingDecisionRef = useRef(null)

  const commit = useCallback(
    (action, noteText = '') => {
      if (phase !== 'live') return  // idempotent — guards re-entry during the exiting window
      const decidedAt = new Date().toISOString()
      pendingDecisionRef.current = { action, notes: noteText, at: decidedAt }
      // Start the action-bar exit first; the useEffect below swaps to the
      // banner one tick later (~180ms) so the two motions feel like one
      // continuous hand-off. onReply fires synchronously so the chat
      // stream doesn't observe the animation delay.
      setPhase('exiting')
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
    [phase, onReply, case_id, payload?.widget_id],
  )

  // Hand-off: once the action bar is exiting, wait the animation's
  // duration, then swap to the banner. Cleanup on unmount prevents the
  // timer from touching state after the widget has gone away.
  useEffect(() => {
    if (phase !== 'exiting') return
    const t = setTimeout(() => {
      const d = pendingDecisionRef.current
      if (d) setDecision(d)
      setPhase('done')
    }, 180)
    return () => clearTimeout(t)
  }, [phase])

  const handleClick = useCallback(
    (action) => {
      if (decision || phase !== 'live') return
      if (!ACTION_META[action]?.destructive) {
        commit(action)
        return
      }
      setPending(action)
      setNotes('')
    },
    [decision, phase, commit],
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
        <div className={cx(styles.actionRegion, phase === 'exiting' && styles.actionRegion_exiting)}>
          {pending && (
            <div
              className={cx(
                styles.pendingPrompt,
                styles[`pendingPrompt_${ACTION_META[pending].tone}`],
              )}
            >
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

          {secondaryActions.length > 0 && (
            <div className={cx(styles.secondaryActionRow, pending && styles.secondaryActionRow_locked)}>
              {secondaryActions.map((action) => {
                const meta = ACTION_META[action]
                const ActionIcon = meta.Icon
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleClick(action)}
                    disabled={!!pending && pending !== action}
                    className={cx(
                      styles.linkButton,
                      pending === action && styles.linkButton_armed,
                    )}
                  >
                    <ActionIcon size={14} strokeWidth={2} aria-hidden />
                    <span>{meta.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className={cx(styles.actionBar, pending && styles.actionBar_locked)}>
            {primaryActions.map((action) => {
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
                </Button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={styles.committed}>
          <div className={styles.banner}>
            {(() => {
              const DecisionIcon = ACTION_META[decision.action]?.Icon ?? CircleCheck
              return (
                <span className={cx(styles.bannerChip, styles[`bannerChip_${decision.action}`])}>
                  <DecisionIcon size={14} strokeWidth={2} />
                  <span>{VERDICT_LABEL_DONE[decision.action]}</span>
                </span>
              )
            })()}
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
