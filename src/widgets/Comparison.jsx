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

/* ─── Comparison Widget (#22, v2 — explainable table) ──────────────
   Side-by-side display for verdicts that resolve per criterion.
   Layout is a 4-column table: criterion · a_value · status chip ·
   b_value. Status chip carries a short copy ("Exceeds by 6mo",
   "Close match", "Missing") — the verdict is stated, not decoded
   from an icon.

   Variants:
     candidate_match → User (left) vs Briefcase (right)
     skills_gap      → Wrench (left) vs Target (right)
     qc_spec         → Camera (left) vs CheckCircle2 (right)

   Signature moment is the staggered chip reveal — each table row
   settles, then its chip springs in last carrying the verdict. ─── */

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

const DEFAULT_STATUS_COPY = {
  match:   'Matches',
  partial: 'Close match',
  gap:     'Missing',
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

  /* Pill starts filling 180ms after the last row's chip settles.
     chip settle = row_delay + 120 + 280 = row_delay + 400.
     summaryDelay = (lastRowIdx * 60) + 400 + 180.
     Add 120ms floor because the dual-item band + column headers land
     before the first row. */
  const lastRowIdx = Math.max(0, Math.min(criteria.length - 1, MAX_CRITERIA - 1))
  const summaryDelay = 120 + lastRowIdx * 60 + 580

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

      {/* Dual-item band — gives each side a distinct identity so the
          pairing is obvious before the table even renders. */}
      <div className={styles.itemBand}>
        <ItemBandCell
          Icon={ItemAIcon}
          label={itemA.label}
          subtitle={itemA.subtitle}
        />
        <ItemBandCell
          Icon={ItemBIcon}
          label={itemB.label}
          subtitle={itemB.subtitle}
        />
      </div>

      {/* Column headers — make the 4-col relationship explicit. */}
      <div className={styles.columnHeaders} role="presentation">
        <span className={styles.columnHeader}>Criterion</span>
        <span className={styles.columnHeader}>{itemA.label}</span>
        <span className={cx(styles.columnHeader, styles.columnHeader_center)}>Match</span>
        <span className={cx(styles.columnHeader, styles.columnHeader_right)}>{itemB.label}</span>
      </div>

      {/* Criteria grid — the tabular body. */}
      <div className={styles.criteriaGrid}>
        {criteria.map((c, idx) => {
          const Glyph   = STATUS_GLYPH[c.status] ?? Minus
          const copy    = c.status_copy ?? DEFAULT_STATUS_COPY[c.status] ?? '—'
          const isOpen  = openIdx === idx
          const hasNote = Boolean(c.note)
          const rowKey  = `${c.name ?? 'row'}-${idx}`
          return (
            <CriterionRow
              key={rowKey}
              idx={idx}
              criterion={c}
              Glyph={Glyph}
              copy={copy}
              hasNote={hasNote}
              isOpen={isOpen}
              isFirst={idx === 0}
              isTinted={idx % 2 === 1}
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

/* ─── Dual-item band cell ──────────────────────────────────────── */
function ItemBandCell({ Icon, label, subtitle }) {
  return (
    <div className={styles.itemBandCell}>
      <span className={styles.itemBandIcon} aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className={styles.itemBandText}>
        <span className={styles.itemBandLabel}>{label}</span>
        {subtitle && <span className={styles.itemBandSubtitle}>{subtitle}</span>}
      </div>
    </div>
  )
}

/* ─── Criterion row (4 cells) + optional note ──────────────────── */
function CriterionRow({
  idx, criterion, Glyph, copy, hasNote, isOpen, isFirst, isTinted, onToggle,
}) {
  const rowClass = cx(
    styles.criterionRow,
    isFirst && styles.criterionRow_first,
    isTinted && styles.criterionRow_tinted,
    hasNote && styles.criterionRow_clickable,
    isOpen && styles.criterionRow_open,
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
        /* +120ms floor so row 0 lands after the band (60ms) + headers
           (120ms) finish. Matches the summaryDelay formula which adds
           the same 120ms. */
        style={{ '--cmp-row-delay': `${120 + Math.min(idx, 7) * 60}ms` }}
      >
        <div className={styles.cellCriterion}>
          <span className={styles.criterionName}>{criterion.name}</span>
        </div>
        <div className={styles.cellA}>
          <span className={styles.criterionValue}>{criterion.a_value}</span>
        </div>
        <div className={styles.cellChip}>
          <span className={styles.statusChip}>
            <Glyph size={12} strokeWidth={2.5} aria-hidden="true" />
            <span className={styles.statusChipCopy}>{copy}</span>
          </span>
        </div>
        <div className={styles.cellB}>
          <span className={styles.criterionValue}>{criterion.b_value}</span>
        </div>
      </RowTag>
      {hasNote && (
        <div
          id={noteId}
          className={cx(
            styles.noteRow,
            isOpen && styles.noteRow_open,
            isTinted && styles.noteRow_tinted,
          )}
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

function defaultTitle(variant, itemB) {
  if (variant === 'skills_gap') return `Skills gap · ${itemB?.subtitle ?? 'target role'}`
  if (variant === 'qc_spec')    return `Spec check · ${itemB?.subtitle ?? 'expected'}`
  return `Match for ${itemB?.subtitle ?? 'the role'}`
}
