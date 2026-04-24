import { useCallback, useEffect, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  GitCompare,
  TrendingUp,
  ClipboardCheck,
  Check,
  Minus,
  X,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './comparison.module.scss'

/* ─── Comparison Widget (#22) ─────────────────────────────────────
   Side-by-side display for verdicts that resolve per criterion:
   candidate vs role (hiring), skills vs target (training gap),
   submitted vs expected (QC spec check).

   Signature moment is the center gutter rail — each criterion row
   resolves into a tri-state indicator chip (match / partial / gap)
   that scans down the card. Tones:
     match   → color-text-success (Check glyph)
     partial → yellow-60 (Minus glyph — reads "close, not exact")
     gap     → color-text-error (X glyph)

   Rows with a `note` are click-to-expand (single-open accordion).
   Summary pill at the bottom uses §6 linear-fill tinted to the
   overall verdict. Optional §5 CTA if `action` is present. ─── */

const MAX_CRITERIA = 8   /* §11 stagger cap */

const VARIANT_ICON = {
  candidate_match: GitCompare,
  skills_gap:      TrendingUp,
  qc_spec:         ClipboardCheck,
}

const STATUS_GLYPH = {
  match:   Check,
  partial: Minus,
  gap:     X,
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/* Overall tone derived from the criteria status mix.
   – any gap → error (hard miss dominates)
   – any partial (no gap) → warning
   – all match → success */
function overallTone(criteria) {
  if (criteria.some((c) => c.status === 'gap')) return 'error'
  if (criteria.some((c) => c.status === 'partial')) return 'warning'
  return 'success'
}

/* Weighted ratio for the summary pill fill width.
   match counts as 1, partial counts as 0.5, gap counts as 0. */
function metRatio(criteria) {
  if (criteria.length === 0) return 0
  const weighted = criteria.reduce((sum, c) => {
    if (c.status === 'match') return sum + 1
    if (c.status === 'partial') return sum + 0.5
    return sum
  }, 0)
  return weighted / criteria.length
}

export function Comparison({ payload }) {
  const { onReply } = useChatActions()

  const widgetId = payload?.widget_id
  const variant  = payload?.variant ?? 'candidate_match'
  const itemA    = payload?.item_a ?? { label: 'A' }
  const itemB    = payload?.item_b ?? { label: 'B' }
  const rawCriteria = useMemo(
    () => (Array.isArray(payload?.criteria) ? payload.criteria : []),
    [payload?.criteria],
  )
  const criteria = useMemo(() => rawCriteria.slice(0, MAX_CRITERIA), [rawCriteria])
  const action = payload?.action

  useEffect(() => {
    if (rawCriteria.length > MAX_CRITERIA) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Comparison] Received ${rawCriteria.length} criteria; rendering first ${MAX_CRITERIA} (§11 stagger cap).`,
      )
    }
  }, [rawCriteria.length])

  const [openIdx, setOpenIdx]   = useState(null)
  const [actedAt, setActedAt]   = useState(null)

  const Icon = VARIANT_ICON[variant] ?? GitCompare
  const title = payload?.title ?? defaultTitle(variant, itemB)
  const description = payload?.description
    ?? `${matchCount(criteria)} of ${criteria.length} criteria met`

  const tone  = overallTone(criteria)
  const ratio = metRatio(criteria)
  const pct   = Math.round(ratio * 100)

  /* Summary pill starts filling 180ms after the last row's indicator chip
     settles. chip settles at row_delay + 120ms (start) + 280ms (duration).
     So summaryDelay = (lastRowIdx * 60ms) + 400ms + 180ms. */
  const lastRowIdx = Math.max(0, Math.min(criteria.length - 1, MAX_CRITERIA - 1))
  const summaryDelay = lastRowIdx * 60 + 580

  const toggleRow = useCallback((idx) => {
    setOpenIdx((prev) => (prev === idx ? null : idx))
  }, [])

  const handleAction = useCallback(() => {
    if (actedAt || !action) return
    const now = Date.now()
    setActedAt(now)

    onReply?.({
      type: 'widget_response',
      payload: {
        source_type: 'comparison',
        source_widget_id: widgetId,
        data: {
          label: action.label,
          variant,
          action: action.label,
          submitted_at: now,
        },
      },
    })
  }, [actedAt, action, onReply, variant, widgetId])

  return (
    <div
      className={cx(styles.card, styles[`card_${tone}`])}
      data-variant={variant}
      role="article"
      aria-label={title}
    >
      {/* Header — §2 */}
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
      </header>

      {/* Column-label row (eyebrow over subtitle) */}
      <div className={styles.columnLabels}>
        <div className={styles.columnLabel}>
          <span className={styles.columnEyebrow}>{itemA.label}</span>
          {itemA.subtitle && (
            <span className={styles.columnSubtitle}>{itemA.subtitle}</span>
          )}
        </div>
        <span className={styles.columnLabelGutter} aria-hidden="true" />
        <div className={cx(styles.columnLabel, styles.columnLabelRight)}>
          <span className={styles.columnEyebrow}>{itemB.label}</span>
          {itemB.subtitle && (
            <span className={styles.columnSubtitle}>{itemB.subtitle}</span>
          )}
        </div>
      </div>

      {/* Criteria grid — the signature body. No role="list" on the grid
          because clickable rows render as <button> and mixing listitem
          semantics with button semantics loses button announcement in
          some screen readers. The grid is a visual scan target, not an
          a11y list. */}
      <div className={styles.criteriaGrid}>
        {criteria.map((c, idx) => {
          const Glyph = STATUS_GLYPH[c.status] ?? Minus
          const isOpen = openIdx === idx
          const hasNote = Boolean(c.note)
          const rowKey = `${c.name ?? 'row'}-${idx}`
          return (
            <CriterionRow
              key={rowKey}
              idx={idx}
              criterion={c}
              Glyph={Glyph}
              hasNote={hasNote}
              isOpen={isOpen}
              isFirst={idx === 0}
              isTinted={idx % 2 === 1}
              onToggle={() => toggleRow(idx)}
            />
          )
        })}
      </div>

      {/* Summary pill — §6 linear fill, tone-tinted. --cmp-pct carries
          the target width to the keyframe so the fill animates 0→target
          rather than appearing at target on mount. --cmp-summary-delay
          scales with actual row count so the fill lands right after the
          last indicator settles. */}
      <div className={styles.summary}>
        <div className={styles.summaryEyebrow}>
          {matchCount(criteria)} of {criteria.length} criteria met
        </div>
        <div
          className={styles.summaryTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Overall match"
        >
          <div
            className={styles.summaryFill}
            style={{
              '--cmp-pct': `${pct}%`,
              '--cmp-summary-delay': `${summaryDelay}ms`,
            }}
          />
        </div>
      </div>

      {/* Footer — optional CTA OR §10 success banner (chip + one line). */}
      {actedAt ? (
        <div className={styles.successBanner}>
          <span className={styles.successChip}>
            <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
            Submitted
          </span>
          <span className={styles.successMeta}>
            {action?.label} · {timeLabel(actedAt)}
          </span>
        </div>
      ) : action ? (
        <Button
          variant={action.intent === 'neutral' ? 'secondary' : 'primary'}
          size="md"
          className={styles.submitBtn}
          iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
          onClick={handleAction}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

/* ─── Single criterion row ────────────────────────────────────────
   Rendered with display:contents on a grid-row wrapper so cells land
   directly in the outer criteria grid columns. When `hasNote`, the
   row renders as a <button>; otherwise as a plain <div> — no dead
   click affordance. ─── */
function CriterionRow({
  idx, criterion, Glyph, hasNote, isOpen, isFirst, isTinted, onToggle,
}) {
  const rowClass = cx(
    styles.criterionRow,
    isFirst && styles.criterionRow_first,
    isTinted && styles.criterionRow_tinted,
    hasNote && styles.criterionRow_clickable,
    isOpen && styles.criterionRow_open,
  )
  const rowId   = `cmp-row-${idx}`
  const noteId  = `cmp-note-${idx}`
  const RowTag = hasNote ? 'button' : 'div'
  const rowProps = hasNote
    ? {
        type: 'button',
        id: rowId,
        onClick: onToggle,
        'aria-expanded': isOpen,
        'aria-controls': noteId,
      }
    : { id: rowId }

  return (
    <>
      <RowTag
        {...rowProps}
        className={rowClass}
        data-status={criterion.status}
        style={{ '--cmp-row-delay': `${Math.min(idx, 7) * 60}ms` }}
      >
        <div className={styles.cellA}>
          <span className={styles.criterionName}>{criterion.name}</span>
          <span className={styles.criterionValue}>{criterion.a_value}</span>
        </div>
        <div className={styles.cellIndicator}>
          <span className={styles.indicatorChip} aria-hidden="true">
            <Glyph size={16} strokeWidth={2.25} />
          </span>
          <span className={styles.srOnly}>{statusLabel(criterion.status)}</span>
        </div>
        <div className={styles.cellB}>
          <span className={styles.criterionValue}>{criterion.b_value}</span>
        </div>
      </RowTag>
      {hasNote && (
        <div
          id={noteId}
          className={cx(styles.noteRow, isOpen && styles.noteRow_open, isTinted && styles.noteRow_tinted)}
          data-status={criterion.status}
          role="group"
          aria-labelledby={rowId}
          aria-hidden={!isOpen}
        >
          <div className={styles.noteInner}>{criterion.note}</div>
        </div>
      )}
    </>
  )
}

function matchCount(criteria) {
  return criteria.filter((c) => c.status === 'match').length
}

function statusLabel(status) {
  if (status === 'match') return 'Matches'
  if (status === 'partial') return 'Partial match'
  if (status === 'gap') return 'Gap'
  return 'Unknown'
}

function defaultTitle(variant, itemB) {
  if (variant === 'skills_gap') return `Skills gap · ${itemB?.subtitle ?? 'target role'}`
  if (variant === 'qc_spec')    return `Spec check · ${itemB?.subtitle ?? 'expected'}`
  return `Match for ${itemB?.subtitle ?? 'the role'}`
}
