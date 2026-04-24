import { useCallback, useState } from 'react'
import cx from 'classnames'
import {
  ListChecks,
  Check,
  CheckCircle2,
  ArrowRight,
  Minus,
  Eye,
  Clock,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './checklist.module.scss'

/* ─── Checklist Widget ────────────────────────────────────────────────
   Two variants from the spec:
     • Interactive — user checks off steps, can submit. Item status
       toggles between pending and completed. Submit gated by
       require_all / allow_skip.
     • Read-only  — renders current progress as a status readout.
       No interactive checkboxes, no submit. Items may carry a
       "skipped" status in addition to pending/completed. Useful for
       "here's where this candidate is in onboarding" dashboards.

   Both variants share the header + progress strip + item list. The
   difference is interactivity at the item level and presence of the
   submit CTA at the bottom.
   ─────────────────────────────────────────────────────────────────── */

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

export function Checklist({ payload }) {
  const { onReply } = useChatActions()

  const widgetId     = payload?.widget_id
  const checklistId  = payload?.checklist_id
  const title        = payload?.title ?? 'Checklist'
  const description  = payload?.description
  const readOnly     = Boolean(payload?.read_only)
  const requireAll   = payload?.require_all !== false
  const allowSkip    = Boolean(payload?.allow_skip)
  const isSilent     = Boolean(payload?.silent)

  /* Seeded from payload; each item: { item_id, label, description?,
     status: 'pending' | 'completed' } */
  const [items, setItems] = useState(() =>
    (payload?.items ?? []).map((it) => ({
      status: 'pending',
      ...it,
    })),
  )

  const [submitted, setSubmitted]     = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)

  const total       = items.length
  const completed   = items.filter((i) => i.status === 'completed').length
  const skipped     = items.filter((i) => i.status === 'skipped').length
  const pending     = total - completed - skipped
  /* "Complete" here means every item has been decided — completed or
     skipped. In practice the interactive variant never produces
     skipped items (toggle only swings pending ↔ completed), so for
     interactive this is equivalent to "all completed". */
  const allComplete = pending === 0 && total > 0
  const canSubmit   = !readOnly && (
    allowSkip ? completed > 0 : (requireAll ? allComplete : true)
  )

  const toggleItem = useCallback((itemId) => {
    if (readOnly) return
    setItems((prev) => prev.map((i) =>
      i.item_id === itemId
        ? { ...i, status: i.status === 'completed' ? 'pending' : 'completed' }
        : i,
    ))
  }, [readOnly])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    const now = Date.now()
    setSubmittedAt(now)
    setSubmitted(true)
    const completions = items.map((i) => ({
      item_id: i.item_id,
      status: i.status,
    }))
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'checklist',
          source_widget_id: widgetId,
          data: {
            label: allComplete
              ? `Checklist complete · ${total}/${total}`
              : `Checklist submitted · ${completed}/${total}`,
            checklist_id: checklistId,
            completions,
            submitted_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [canSubmit, items, onReply, widgetId, checklistId, allComplete, completed, total, isSilent])

  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <ListChecks size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
        {readOnly && (
          <span className={styles.readOnlyChip} aria-label="Read-only view">
            <Eye size={11} strokeWidth={2.25} aria-hidden="true" />
            View only
          </span>
        )}
      </div>

      {/* ─── Progress strip — per-item segments, green when done,
          muted grey-diagonal when skipped, grey when pending ─── */}
      {!submitted && total > 0 && (
        <div className={styles.progressStrip}>
          <div
            className={styles.progressSegments}
            aria-hidden="true"
            role="presentation"
          >
            {items.map((item) => (
              <span
                key={item.item_id}
                className={cx(styles.segment, styles[`segment_${item.status}`])}
              />
            ))}
          </div>
          <div className={styles.progressText}>
            <strong>{completed}</strong>
            <span className={styles.progressOf}>/ {total} done</span>
            {skipped > 0 && (
              <span className={styles.progressSkipped}>
                · {skipped} skipped
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Item list ──────────────────────────────────────────── */}
      <ul className={styles.itemList}>
        {items.map((item) => (
          <ChecklistItem
            key={item.item_id}
            item={item}
            readOnly={readOnly}
            disabled={submitted || readOnly}
            onToggle={() => toggleItem(item.item_id)}
          />
        ))}
      </ul>

      {/* ─── Bottom: Submit OR success banner (skipped entirely in
          read-only mode — there's nothing for the user to commit). */}
      {readOnly ? null : submitted ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>
              {allComplete ? 'Checklist complete' : 'Checklist submitted'}
            </div>
            <div className={styles.successSub}>
              <strong>{completed}</strong> of <strong>{total}</strong>
              {' done'}
              <span className={styles.dotSep} aria-hidden="true"> · </span>
              <span className={styles.successTime}>{timeLabel(submittedAt)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.actionsGroup}>
          <Button
            variant="primary"
            size="md"
            disabled={!canSubmit}
            className={styles.submitBtn}
            iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
            onClick={handleSubmit}
          >
            {allComplete
              ? 'Submit'
              : (allowSkip
                  ? `Submit · ${completed}/${total} done`
                  : `${pending} ${pending === 1 ? 'item' : 'items'} left`)
            }
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── ChecklistItem — one row with a tickable checkbox.
   Handles all three item statuses (pending / completed / skipped)
   and the optional per-item due indicator. Read-only mode disables
   toggling at the item level but keeps the row fully rendered. */

function ChecklistItem({ item, readOnly, disabled, onToggle }) {
  const { label, description, status, due } = item
  const isDone    = status === 'completed'
  const isSkipped = status === 'skipped'

  const checkboxIcon = isDone
    ? <Check size={12} strokeWidth={3} aria-hidden="true" className={styles.checkmark} />
    : isSkipped
      ? <Minus size={12} strokeWidth={3} aria-hidden="true" className={styles.checkmark} />
      : null

  return (
    <li
      className={cx(
        styles.item,
        isDone && styles.itemDone,
        isSkipped && styles.itemSkipped,
        disabled && styles.itemDisabled,
        readOnly && styles.itemReadOnly,
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone ? true : isSkipped ? 'mixed' : false}
        className={cx(
          styles.checkbox,
          isDone && styles.checkboxDone,
          isSkipped && styles.checkboxSkipped,
        )}
        onClick={onToggle}
        disabled={disabled}
        aria-label={`Mark "${label}" as ${isDone ? 'not done' : 'done'}`}
      >
        {checkboxIcon}
      </button>

      <button
        type="button"
        className={styles.itemBody}
        onClick={onToggle}
        disabled={disabled}
      >
        <div className={styles.itemLabel}>{label}</div>
        {description && (
          <div className={styles.itemDescription}>{description}</div>
        )}
        {due && (
          <div className={cx(styles.itemDue, due.tone && styles[`itemDue_${due.tone}`])}>
            <Clock size={11} strokeWidth={2.25} aria-hidden="true" />
            {due.label}
          </div>
        )}
      </button>
    </li>
  )
}
