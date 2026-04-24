import { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './dateTimePicker.module.scss'

/* ─── Date/Time Picker Widget ────────────────────────────────────────
   Calendar date picker + time slot selector in chat. Two-step flow:
   (1) pick a date from the month grid, (2) pick a time from the list
   that reveals below. Modes:
     • 'date'     — calendar only; Confirm on date pick
     • 'datetime' — calendar + times; Confirm on date + time pick
   Slot constraint:
     • `available_slots` provided — only those dates are tappable;
       time list is that date's published slots.
     • `available_slots` omitted  — calendar honours min/max_date;
       time list is generated from `time_window` (e.g. 09:00–18:00,
       step 30 min).
   ─────────────────────────────────────────────────────────────────── */

/* ─── Date helpers ─────────────────────────────────────────────────── */

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseYMD(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function sameDay(a, b) {
  return Boolean(a && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth()    === b.getMonth()
    && a.getDate()     === b.getDate())
}

/** Build the calendar grid for the given year/month, starting Monday.
 *  Returns {date, inMonth} cells padded to a multiple of 7 (5–6 rows). */
function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const firstWeekday = (first.getDay() + 6) % 7  // Mon = 0, Sun = 6
  const cells = []

  for (let i = firstWeekday; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), inMonth: false })
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), inMonth: true })
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }

  return cells
}

/* ─── Time helpers ─────────────────────────────────────────────────── */

function formatTime(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h < 12 ? 'am' : 'pm'
  const hh = h % 12 || 12
  const mm = String(m).padStart(2, '0')
  return `${hh}:${mm} ${ampm}`
}

function formatDateLong(date) {
  if (!date) return ''
  const weekday = WEEKDAY_SHORT[(date.getDay() + 6) % 7]
  return `${weekday}, ${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`
}

function generateFreeTimes(window) {
  const { start_hour = 9, end_hour = 18, step_min = 30 } = window ?? {}
  const times = []
  for (let h = start_hour; h < end_hour; h++) {
    for (let m = 0; m < 60; m += step_min) {
      times.push({
        slot_id: null,
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      })
    }
  }
  return times
}

/* ─── Root ─────────────────────────────────────────────────────────── */

export function DateTimePicker({ payload }) {
  const { onReply } = useChatActions()

  const widgetId       = payload?.widget_id
  const appointmentId  = payload?.appointment_id
  const title          = payload?.title ?? 'Pick a date & time'
  const description    = payload?.description
  const mode           = payload?.mode ?? 'datetime'
  const timezone       = payload?.timezone ?? 'UTC'
  const timezoneLabel  = payload?.timezone_label ?? null
  const availableSlots = Array.isArray(payload?.available_slots) ? payload.available_slots : null
  const timeWindow     = payload?.time_window ?? null
  const submitLabel    = payload?.submit_label ?? 'Confirm'
  const isSilent       = Boolean(payload?.silent)

  const minDate = useMemo(() => parseYMD(payload?.min_date), [payload?.min_date])
  const maxDate = useMemo(() => parseYMD(payload?.max_date), [payload?.max_date])

  const slotsByDate = useMemo(() => {
    if (!availableSlots) return null
    const m = new Map()
    for (const d of availableSlots) m.set(d.date, d.times ?? [])
    return m
  }, [availableSlots])

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const initialMonth = useMemo(() => {
    const anchor = minDate ?? today
    return { year: anchor.getFullYear(), month: anchor.getMonth() }
  }, [minDate, today])

  const [view, setView]                     = useState(initialMonth)
  const [selectedDate, setSelectedDate]     = useState(null)
  const [selectedTime, setSelectedTime]     = useState(null)
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [submitted, setSubmitted]           = useState(false)

  const cells = useMemo(
    () => monthGrid(view.year, view.month),
    [view.year, view.month],
  )

  const isDateDisabled = useCallback((date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    if (slotsByDate && !slotsByDate.has(toYMD(date))) return true
    return false
  }, [minDate, maxDate, slotsByDate])

  /* ─── Month nav gating ─────────────────────────────────────────── */
  const canGoPrev = useMemo(() => {
    if (!minDate) return true
    const prevLast = new Date(view.year, view.month, 0)
    return prevLast >= minDate
  }, [minDate, view.year, view.month])

  const canGoNext = useMemo(() => {
    if (!maxDate) return true
    const nextFirst = new Date(view.year, view.month + 1, 1)
    return nextFirst <= maxDate
  }, [maxDate, view.year, view.month])

  const shiftMonth = useCallback((delta) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }, [])

  /* ─── Date click ───────────────────────────────────────────────── */
  const handleDateClick = useCallback((date) => {
    if (submitted) return
    if (isDateDisabled(date)) return
    setSelectedDate(date)
    setSelectedTime(null)
    setSelectedSlotId(null)
  }, [submitted, isDateDisabled])

  /* ─── Times for the selected date ──────────────────────────────── */
  const timesForSelectedDate = useMemo(() => {
    if (mode !== 'datetime') return []
    if (!selectedDate) return []
    if (slotsByDate) return slotsByDate.get(toYMD(selectedDate)) ?? []
    return generateFreeTimes(timeWindow)
  }, [mode, selectedDate, slotsByDate, timeWindow])

  const handleTimeClick = useCallback((timeObj) => {
    if (submitted) return
    setSelectedTime(timeObj.time)
    setSelectedSlotId(timeObj.slot_id ?? null)
  }, [submitted])

  /* ─── Submit gate + helper text ────────────────────────────────── */
  const needsTime = mode === 'datetime'
  const canSubmit = !submitted
    && selectedDate != null
    && (!needsTime || selectedTime != null)

  let helperText = null
  if (!submitted) {
    if (!selectedDate) helperText = 'Pick a date to continue'
    else if (needsTime && !selectedTime) helperText = 'Pick a time to continue'
  }

  /* ─── Submit ───────────────────────────────────────────────────── */
  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    const now = Date.now()
    setSubmitted(true)

    const ymd = toYMD(selectedDate)
    const label = selectedTime
      ? `${formatDateLong(selectedDate)} at ${formatTime(selectedTime)}`
      : formatDateLong(selectedDate)

    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'datetime_picker',
          source_widget_id: widgetId,
          data: {
            label,
            appointment_id: appointmentId ?? null,
            selected_date: ymd,
            selected_time: selectedTime ?? undefined,
            slot_id: selectedSlotId ?? undefined,
            timezone,
            submitted_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [
    canSubmit, selectedDate, selectedTime, selectedSlotId,
    widgetId, appointmentId, timezone, onReply, isSilent,
  ])

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
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* Timezone strip */}
      {timezoneLabel && (
        <div className={styles.tzStrip}>
          <span className={styles.tzPrefix}>Times shown in</span>
          <span className={styles.tzValue}>{timezoneLabel}</span>
        </div>
      )}

      {/* Calendar */}
      <div className={styles.calendar}>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navBtn}
            disabled={!canGoPrev || submitted}
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <div className={styles.monthLabel}>
            {MONTH_LONG[view.month]} {view.year}
          </div>
          <button
            type="button"
            className={styles.navBtn}
            disabled={!canGoNext || submitted}
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.weekdayRow} aria-hidden="true">
          {WEEKDAY_SHORT.map((w) => (
            <span key={w} className={styles.weekdayCell}>{w}</span>
          ))}
        </div>

        <div className={styles.dayGrid} role="grid" aria-label="Calendar">
          {cells.map((cell, i) => {
            const disabled = isDateDisabled(cell.date)
            const selected = sameDay(cell.date, selectedDate)
            const isToday  = sameDay(cell.date, today)
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-selected={selected}
                aria-disabled={disabled}
                disabled={disabled || submitted}
                className={cx(
                  styles.dayCell,
                  !cell.inMonth && styles.dayCellMuted,
                  isToday && styles.dayCellToday,
                  selected && styles.dayCellSelected,
                )}
                onClick={() => handleDateClick(cell.date)}
              >
                {cell.date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time list — only when mode:datetime and a date is selected */}
      {mode === 'datetime' && selectedDate && !submitted && (
        <div className={styles.timeSection}>
          <div className={styles.timeHead}>
            <Clock size={12} strokeWidth={2} aria-hidden="true" />
            <span className={styles.timeHeadLabel}>Times</span>
            <span className={styles.timeHeadDate}>
              · {formatDateLong(selectedDate)}
            </span>
          </div>

          {timesForSelectedDate.length === 0 ? (
            <div className={styles.timeEmpty}>
              No times available for this date.
            </div>
          ) : (
            <ul className={styles.timeList}>
              {timesForSelectedDate.map((t) => {
                const isSelectedTime = t.time === selectedTime
                const low = typeof t.remaining === 'number' && t.remaining > 0 && t.remaining <= 2
                return (
                  <li key={`${t.time}-${t.slot_id ?? 'free'}`}>
                    <button
                      type="button"
                      className={cx(
                        styles.timeBtn,
                        isSelectedTime && styles.timeBtnSelected,
                      )}
                      onClick={() => handleTimeClick(t)}
                    >
                      <span className={styles.timeBtnLabel}>
                        {formatTime(t.time)}
                      </span>
                      {typeof t.remaining === 'number' && (
                        <span className={cx(
                          styles.timeBtnMeta,
                          low && styles.timeBtnMetaLow,
                        )}>
                          {t.remaining} left
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Footer — submit OR success banner */}
      {submitted ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>Appointment confirmed</div>
            <div className={styles.successSub}>
              {formatDateLong(selectedDate)}
              {selectedTime && ` · ${formatTime(selectedTime)}`}
              {timezoneLabel && ` · ${timezoneLabel}`}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.actionsGroup}>
          {helperText && (
            <div className={styles.helperRow}>
              <AlertCircle size={12} strokeWidth={2.25} aria-hidden="true" />
              {helperText}
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
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
