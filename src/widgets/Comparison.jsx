import { useCallback, useEffect, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  GitCompare,
  TrendingUp,
  ClipboardCheck,
  User,
  Briefcase,
  Wrench,
  Target,
  Camera,
  CheckCircle2,
  Check,
  Minus,
  X,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './comparison.module.scss'

/* ─── Comparison Widget (#22, v2.1 — criterion-as-row-header) ──────
   Vertical stack of per-criterion blocks. Each block:
     • Top: criterion name as an eyebrow header.
     • Bottom: a_value · tone dot · b_value on a single row.
     • Left edge: tone-colored ledger stripe (§8 pattern) carrying
       the verdict peripherally so the dot can stay quiet.

   Variants:
     candidate_match → User (left) vs Briefcase (right)
     skills_gap      → Wrench (left) vs Target (right)
     qc_spec         → Camera (left) vs CheckCircle2 (right)

   Reshape from v2.0 (4-col table) driven by horizontal-space UX
   feedback — chat slots are narrow, values were cramped. Criterion
   moves to a row header, chip collapses to an icon-only tone dot,
   column-header row drops, item band collapses to a single inline
   row. ─── */

const MAX_CRITERIA = 8   /* §11 stagger cap */

const VARIANT_ICON = {
  candidate_match: GitCompare,
  skills_gap:      TrendingUp,
  qc_spec:         ClipboardCheck,
}

const ITEM_ICONS = {
  candidate_match: { a: User,   b: Briefcase },
  skills_gap:      { a: Wrench, b: Target },
  qc_spec:         { a: Camera, b: CheckCircle2 },
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

function overallTone(criteria) {
  if (criteria.some((c) => c.status === 'gap')) return 'error'
  if (criteria.some((c) => c.status === 'partial')) return 'warning'
  return 'success'
}

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
  const itemA    = payload?.item_a ?? { label: 'Item A' }
  const itemB    = payload?.item_b ?? { label: 'Item B' }

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

  const [openIdx, setOpenIdx] = useState(null)
  const [actedAt, setActedAt] = useState(null)

  const HeaderIcon = VARIANT_ICON[variant] ?? GitCompare
  const { a: ItemAIcon, b: ItemBIcon } = ITEM_ICONS[variant] ?? ITEM_ICONS.candidate_match
  const title = payload?.title ?? defaultTitle(variant, itemB)
  const description = payload?.description
    ?? `${matchCount(criteria)} of ${criteria.length} criteria met`

  const tone  = overallTone(criteria)
  const ratio = metRatio(criteria)
  const pct   = Math.round(ratio * 100)

  /* Pill starts filling 180ms after the last row's tone-dot fully
     settles. Dot pop ends at row_delay + 400ms; tone-specific settle
     extends up to +640ms (match glow). Budget 1220ms past last row
     delay, floored 120ms for inline band + (dropped) header row
     settle. */
  const lastRowIdx = Math.max(0, Math.min(criteria.length - 1, MAX_CRITERIA - 1))
  const summaryDelay = 120 + lastRowIdx * 60 + 1220

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
      {/* §2 Header */}
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden="true">
          <HeaderIcon size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
      </header>

      {/* Inline item band — one line, two parties. Left carries the
          brand-tint identity ("your side"); right carries the neutral
          identity ("the target"). Identity comes from icon pod + name
          on a single horizontal row, eliminating the stacked eyebrow
          + subtitle vertical pair. */}
      <div className={styles.itemInline}>
        <ItemInlinePart side="a" Icon={ItemAIcon} name={itemA.subtitle ?? itemA.label} />
        <span className={styles.itemInlineArrow} aria-hidden="true">↔</span>
        <ItemInlinePart side="b" Icon={ItemBIcon} name={itemB.subtitle ?? itemB.label} />
      </div>

      {/* Criteria stack — vertical list of per-criterion blocks. */}
      <div className={styles.criteriaStack}>
        {criteria.map((c, idx) => {
          const Glyph   = STATUS_GLYPH[c.status] ?? Minus
          const isOpen  = openIdx === idx
          const hasNote = Boolean(c.note)
          const rowKey  = `${c.name ?? 'row'}-${idx}`
          return (
            <CriterionBlock
              key={rowKey}
              idx={idx}
              criterion={c}
              Glyph={Glyph}
              hasNote={hasNote}
              isOpen={isOpen}
              onToggle={() => toggleRow(idx)}
            />
          )
        })}
      </div>

      {/* §6 linear-fill summary pill, tone-tinted. */}
      <div className={styles.summary}>
        <div className={styles.summaryEyebrow}>
          Overall match · {matchCount(criteria)} of {criteria.length} criteria met
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

      {/* §10 success banner OR §5 CTA. */}
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

/* ─── Inline item band part (one side) ─────────────────────────── */
function ItemInlinePart({ side, Icon, name }) {
  return (
    <div className={cx(styles.itemInlinePart, styles[`itemInlinePart_${side}`])}>
      <span className={styles.itemInlineIcon} aria-hidden="true">
        <Icon size={14} strokeWidth={2} />
      </span>
      <span className={styles.itemInlineName}>{name}</span>
    </div>
  )
}

/* ─── Criterion block ──────────────────────────────────────────────
   Each block is its own grid:
     Row 1: criterion name (spans all 3 cols).
     Row 2: a_value · tone dot · b_value.
   Left edge: a tone-colored ::before stripe (§8 ledger pattern).
   Rows with notes become <button>; notes render as a sibling
   pull-quote that expands/collapses. ─── */
function CriterionBlock({
  idx, criterion, Glyph, hasNote, isOpen, onToggle,
}) {
  const rowClass = cx(
    styles.criterionBlock,
    hasNote && styles.criterionBlock_clickable,
    isOpen && styles.criterionBlock_open,
  )
  const rowId  = `cmp-row-${idx}`
  const noteId = `cmp-note-${idx}`
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
        style={{ '--cmp-row-delay': `${120 + Math.min(idx, 7) * 60}ms` }}
      >
        <span className={styles.criterionName}>{criterion.name}</span>
        <span className={styles.cellA}>{criterion.a_value}</span>
        <span className={styles.toneDot} aria-hidden="true">
          <Glyph size={12} strokeWidth={2.75} />
        </span>
        <span className={styles.srOnly}>{statusLabel(criterion.status)}</span>
        <span className={styles.cellB}>{criterion.b_value}</span>
      </RowTag>
      {hasNote && (
        <div
          id={noteId}
          className={cx(styles.noteRow, isOpen && styles.noteRow_open)}
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
  if (status === 'partial') return 'Close match'
  if (status === 'gap') return 'Gap'
  return 'Unknown'
}

function defaultTitle(variant, itemB) {
  if (variant === 'skills_gap') return `Skills gap · ${itemB?.subtitle ?? 'target role'}`
  if (variant === 'qc_spec')    return `Spec check · ${itemB?.subtitle ?? 'expected'}`
  return `Match for ${itemB?.subtitle ?? 'the role'}`
}
