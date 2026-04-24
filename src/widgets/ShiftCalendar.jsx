import { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  CalendarDays,
  Clock,
  Check,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  IndianRupee,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './shiftCalendar.module.scss'

/* ─── Shift Calendar Widget ───────────────────────────────────────────
   Day-grouped shift picker for gig / rider / delivery onboarding.
   Each day lists its shifts; tap a shift to toggle selection; submit
   when the min-shift threshold is met.

   Shift statuses handled:
     • available — tappable, starts unselected
     • selected  — tappable, starts selected (from payload)
     • booked    — already committed earlier, non-interactive
     • full      — slot is out of capacity, non-interactive
   ─────────────────────────────────────────────────────────────────── */

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/** Collect every already-selected shift from the payload into a flat
 *  initial set for useState. Runs once on mount. */
function initialSelected(days) {
  const ids = []
  for (const d of days ?? []) {
    for (const s of d.shifts ?? []) {
      if (s.status === 'selected') ids.push(s.shift_id)
    }
  }
  return ids
}

export function ShiftCalendar({ payload }) {
  const { onReply } = useChatActions()

  const widgetId    = payload?.widget_id
  const scheduleId  = payload?.schedule_id
  const title       = payload?.title ?? 'Pick your shifts'
  const description = payload?.description
  const days        = Array.isArray(payload?.days) ? payload.days : []
  const minShifts   = Number.isFinite(payload?.min_shifts) ? payload.min_shifts : 1
  const maxShifts   = Number.isFinite(payload?.max_shifts) ? payload.max_shifts : Infinity
  const allowMulti  = payload?.allow_multi_select !== false
  const submitLabel = payload?.submit_label ?? 'Confirm shifts'
  const isSilent    = Boolean(payload?.silent)

  const [selected, setSelected]       = useState(() => initialSelected(days))
  const [submitted, setSubmitted]     = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)

  /* ─── Shift toggle — respects min/max and skips unselectable. ──── */
  const toggleShift = useCallback((shift) => {
    if (submitted) return
    if (shift.status === 'full' || shift.status === 'booked') return
    setSelected((prev) => {
      if (prev.includes(shift.shift_id)) {
        return prev.filter((id) => id !== shift.shift_id)
      }
      if (!allowMulti) return [shift.shift_id]
      if (prev.length >= maxShifts) return prev
      return [...prev, shift.shift_id]
    })
  }, [submitted, allowMulti, maxShifts])

  /* ─── Derived counts for progress strip + submit gate ─────────── */
  const count        = selected.length
  const needed       = Math.max(0, minShifts - count)
  const canSubmit    = count >= minShifts && !submitted

  const totalShifts = useMemo(
    () => days.reduce((sum, d) => sum + (d.shifts?.length ?? 0), 0),
    [days],
  )
  const bookedCount = useMemo(
    () => days.reduce(
      (sum, d) => sum + (d.shifts ?? []).filter((s) => s.status === 'booked').length,
      0,
    ),
    [days],
  )

  /* ─── Submit → fire widget_response ──────────────────────────── */
  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    const now = Date.now()
    setSubmittedAt(now)
    setSubmitted(true)

    /* Build a rich response body so the bot can react to WHICH shifts
       were picked, not just the count. */
    const selectedShifts = []
    for (const d of days) {
      for (const s of (d.shifts ?? [])) {
        if (selected.includes(s.shift_id)) {
          selectedShifts.push({
            shift_id: s.shift_id,
            date: d.date ?? null,
            day_label: d.day_label ?? null,
            start_time: s.start_time ?? null,
            end_time: s.end_time ?? null,
            pay_estimate: s.pay_estimate ?? null,
          })
        }
      }
    }

    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'shift_calendar',
          source_widget_id: widgetId,
          data: {
            label: `Confirmed ${count} ${count === 1 ? 'shift' : 'shifts'}`,
            schedule_id: scheduleId,
            selected_shifts: selectedShifts,
            submitted_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [canSubmit, days, selected, onReply, widgetId, scheduleId, count, isSilent])

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <CalendarDays size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
      </div>

      {/* Progress strip — one segment per shift, colored by its
          current status. Matches the vocabulary used by Checklist
          and QC Evidence Review so the three "work-through-a-list"
          widgets read as one family. */}
      {!submitted && totalShifts > 0 && (
        <div className={styles.progressStrip}>
          <div
            className={styles.progressSegments}
            aria-hidden="true"
            role="presentation"
          >
            {days.flatMap((d) => (d.shifts ?? [])).map((s) => {
              const isSelected = selected.includes(s.shift_id)
              const status = isSelected
                ? 'selected'
                : s.status === 'booked'
                  ? 'booked'
                  : s.status === 'full'
                    ? 'full'
                    : 'available'
              return (
                <span
                  key={s.shift_id}
                  className={cx(styles.segment, styles[`segment_${status}`])}
                />
              )
            })}
          </div>
          <div className={styles.progressText}>
            <strong>{count}</strong>
            {minShifts > 0 ? (
              <span className={styles.progressOf}>/ {minShifts} minimum</span>
            ) : (
              <span className={styles.progressOf}>selected</span>
            )}
            {bookedCount > 0 && (
              <span className={styles.progressMeta}>
                · {bookedCount} already booked
              </span>
            )}
          </div>
        </div>
      )}

      {/* Day sections */}
      <div className={styles.dayList}>
        {days.map((day, i) => (
          <DaySection
            key={day.date ?? day.day_label ?? i}
            day={day}
            selected={selected}
            onToggle={toggleShift}
            disabled={submitted}
            delay={i}
          />
        ))}
      </div>

      {/* Bottom — Submit OR success banner */}
      {submitted ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>
              {count === 1 ? 'Shift confirmed' : `${count} shifts confirmed`}
            </div>
            <div className={styles.successSub}>
              We\'ll send a reminder the evening before each shift · {timeLabel(submittedAt)}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.actionsGroup}>
          {!canSubmit && needed > 0 && (
            <div className={styles.helperRow}>
              <AlertCircle size={12} strokeWidth={2.25} aria-hidden="true" />
              Pick {needed} more {needed === 1 ? 'shift' : 'shifts'} to continue
            </div>
          )}
          <Button
            variant="primary"
            size="md"
            disabled={!canSubmit}
            className={styles.submitBtn}
            iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
            onClick={handleSubmit}
          >
            {canSubmit
              ? `${submitLabel} · ${count}`
              : (needed > 0
                  ? `Pick ${needed} more`
                  : submitLabel)
            }
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── DaySection — one day's header + its shift rows ─────────────── */

function DaySection({ day, selected, onToggle, disabled, delay }) {
  const shifts = day.shifts ?? []
  return (
    <section
      className={styles.day}
      style={{ '--day-delay': `${delay * 60}ms` }}
    >
      <div className={styles.dayHead}>
        <span className={styles.dayLabel}>{day.day_label}</span>
        {day.date_label && (
          <span className={styles.dateLabel}>{day.date_label}</span>
        )}
      </div>

      <ul className={styles.shiftList}>
        {shifts.map((shift) => (
          <ShiftRow
            key={shift.shift_id}
            shift={shift}
            isSelected={selected.includes(shift.shift_id)}
            onToggle={() => onToggle(shift)}
            disabled={disabled}
          />
        ))}
      </ul>
    </section>
  )
}

/* ─── ShiftRow — one tappable shift slot ────────────────────────── */

function ShiftRow({ shift, isSelected, onToggle, disabled }) {
  const { label, start_time, end_time, duration, pay_estimate, status, capacity_left } = shift
  const isBooked  = status === 'booked'
  const isFull    = status === 'full'
  const locked    = disabled || isBooked || isFull

  const timeText = start_time && end_time
    ? `${start_time}–${end_time}`
    : start_time || end_time || ''

  return (
    <li
      className={cx(
        styles.shift,
        isSelected && styles.shiftSelected,
        isBooked && styles.shiftBooked,
        isFull && styles.shiftFull,
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected || isBooked}
        disabled={locked}
        className={styles.shiftBtn}
        onClick={onToggle}
      >
        {/* Left: selection indicator */}
        <span
          className={cx(
            styles.shiftIndicator,
            isSelected && styles.shiftIndicatorSelected,
            isBooked && styles.shiftIndicatorBooked,
          )}
          aria-hidden="true"
        >
          {(isSelected || isBooked) && (
            <Check size={12} strokeWidth={3} />
          )}
        </span>

        {/* Middle: time + label + pay */}
        <div className={styles.shiftBody}>
          <div className={styles.shiftTimeRow}>
            <Clock size={12} strokeWidth={2} aria-hidden="true" className={styles.shiftTimeIcon} />
            <span className={styles.shiftTime}>{timeText}</span>
            {label && <span className={styles.shiftLabel}>· {label}</span>}
            {duration && <span className={styles.shiftDuration}>· {duration}</span>}
          </div>

          {pay_estimate && (
            <div className={styles.shiftPay}>
              <IndianRupee size={11} strokeWidth={2.25} aria-hidden="true" />
              {pay_estimate}
            </div>
          )}
        </div>

        {/* Right: status chip */}
        <div className={styles.shiftStatusSlot}>
          {isBooked && (
            <span className={cx(styles.statusChip, styles.statusChip_booked)}>
              Booked
            </span>
          )}
          {isFull && (
            <span className={cx(styles.statusChip, styles.statusChip_full)}>
              Full
            </span>
          )}
          {!isBooked && !isFull && capacity_left != null && capacity_left <= 3 && (
            <span className={cx(styles.statusChip, styles.statusChip_lowcap)}>
              {capacity_left} left
            </span>
          )}
        </div>
      </button>
    </li>
  )
}
