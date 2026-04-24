import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './earnings.module.scss'

/* ─── Earnings Widget (#28) ───────────────────────────────────────
   Worker-facing financial summary. Total · status · trend · per-row
   breakdown. Signature moment is the count-up on the big total —
   RAF-driven 0 → target, tabular-nums throughout, tone-tinted
   container anchors the eye before the breakdown lands.

   Variants:
     paycheck  → Wallet, completed
     incentive → TrendingUp, processing mix
     advance   → CircleDollarSign, brand-tinted total, "Request
                 advance" primary CTA. ──────────────────────────── */

const MAX_BREAKDOWN = 8   /* §11 stagger cap */
const COUNT_UP_MS   = 720
const COUNT_UP_DELAY_MS = 180

const VARIANT_ICON = {
  paycheck:  Wallet,
  incentive: TrendingUp,
  advance:   CircleDollarSign,
}

const STATUS_GLYPH = {
  completed:  CheckCircle2,
  processing: Clock,
  failed:     XCircle,
}

const STATUS_LABEL = {
  completed:  'Completed',
  processing: 'Processing',
  failed:     'Failed',
}

/* Short context label for the total's eyebrow row. Kept to one word so
   it doesn't compete with the period label shown in the §2 header. */
const VARIANT_EYEBROW = {
  paycheck:  'Earned',
  incentive: 'Earned',
  advance:   'Available',
}

function toneForStatus(status) {
  if (status === 'completed')  return 'success'
  if (status === 'processing') return 'warning'
  if (status === 'failed')     return 'error'
  return 'neutral'
}

function localeForCurrency(currency) {
  if (currency === 'INR') return 'en-IN'
  if (currency === 'USD') return 'en-US'
  if (currency === 'EUR') return 'en-IE'
  if (currency === 'GBP') return 'en-GB'
  return 'en-IN'
}

function formatCurrency(amount, currency) {
  const locale = localeForCurrency(currency)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`
  }
}

/* Split the localised currency output into its symbol + digits parts
   so the two can carry distinct typographic weight — symbol quieter,
   digits bold. Mirrors the hierarchy financial apps use (Mint / bank
   dashboards) where the numeric value dominates and the symbol reads
   as a label. */
function formatCurrencyParts(amount, currency) {
  const locale = localeForCurrency(currency)
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(amount)
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency
    const rest = parts
      .filter((p) => p.type !== 'currency')
      .map((p) => p.value)
      .join('')
      .trim()
    return { symbol, rest }
  } catch {
    return { symbol: currency, rest: Math.round(amount).toLocaleString() }
  }
}

function formatPeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ''
  if (s > e) return ''
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const sOpts = { day: 'numeric', month: 'short' }
  const eOpts = sameMonth
    ? { day: 'numeric' }
    : { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('en-IN', sOpts)} – ${e.toLocaleDateString('en-IN', eOpts)}`
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/* Count-up hook — animates from 0 → target over `duration` ms after
   `delay` ms. Respects prefers-reduced-motion (jumps to target). */
function useCountUp(target, { duration, delay }) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduceMotion) {
      setValue(target)
      return undefined
    }

    setValue(0)
    const start = () => {
      const t0 = performance.now()
      const tick = (now) => {
        const elapsed = now - t0
        const progress = Math.min(1, elapsed / duration)
        /* Ease-out cubic for a natural settle — matches the §16 entry
           curve's feel (0.18, 0.9, 0.28, 1.04) without re-encoding the
           bezier in JS. */
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(target * eased))
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    timeoutRef.current = setTimeout(start, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  return value
}

export function Earnings({ payload }) {
  const { onReply } = useChatActions()

  const widgetId = payload?.widget_id
  const variant  = payload?.variant ?? 'paycheck'
  const period   = payload?.period ?? {}
  const total    = payload?.total ?? { amount: 0, currency: 'INR' }
  const status   = payload?.status ?? 'completed'
  const trend    = payload?.trend
  const action   = payload?.action

  const rawBreakdown = useMemo(
    () => (Array.isArray(payload?.breakdown) ? payload.breakdown : []),
    [payload?.breakdown],
  )
  const breakdown = useMemo(
    () => rawBreakdown.slice(0, MAX_BREAKDOWN),
    [rawBreakdown],
  )

  useEffect(() => {
    if (rawBreakdown.length > MAX_BREAKDOWN) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Earnings] Received ${rawBreakdown.length} breakdown rows; rendering first ${MAX_BREAKDOWN} (§11 stagger cap).`,
      )
    }
  }, [rawBreakdown.length])

  const [actedAt, setActedAt] = useState(null)

  const HeaderIcon = VARIANT_ICON[variant] ?? Wallet
  const StatusGlyph = STATUS_GLYPH[status] ?? CheckCircle2

  /* Tone tint on the total block:
       advance variant → brand-60 (primary action target)
       otherwise       → derived from widget-level status
     Per-row dot tones come from their own breakdown[].status. */
  const totalTone = variant === 'advance' ? 'brand' : toneForStatus(status)

  const displayAmount = useCountUp(total.amount, {
    duration: COUNT_UP_MS,
    delay: COUNT_UP_DELAY_MS,
  })

  const lastRowIdx = Math.max(0, Math.min(breakdown.length - 1, MAX_BREAKDOWN - 1))
  /* CTA closes the composition — lands 180ms after the last row settles.
     Row entries start at 300ms (delay 300 + idx*60), each rise is 320ms,
     so last row lands at 300 + lastRowIdx*60 + 320 = 620 + lastRowIdx*60.
     Add 180ms beat gap before the CTA enters. */
  const ctaDelay = 620 + lastRowIdx * 60 + 180

  const handleAction = useCallback(() => {
    if (actedAt || !action) return
    const now = Date.now()
    setActedAt(now)
    onReply?.({
      type: 'widget_response',
      payload: {
        source_type: 'earnings',
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

  const periodLabel = period.label ?? 'Earnings'
  const periodRange = formatPeriod(period.start, period.end)

  return (
    <div
      className={cx(styles.card, styles[`card_${totalTone}`])}
      data-variant={variant}
      role="article"
      aria-label={`${periodLabel}: ${formatCurrency(total.amount, total.currency)}`}
      style={{ '--earn-cta-delay': `${ctaDelay}ms` }}
    >
      {/* §2 Header */}
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden="true">
          <HeaderIcon size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{periodLabel}</h3>
          {periodRange && <p className={styles.description}>{periodRange}</p>}
        </div>
      </header>

      {/* Total block — 2×2 CSS Grid for strict alignment.
          Columns: [1fr amount/eyebrow] [auto trend/meta]
          Rows:    [eyebrow / trend]
                   [amount  / meta]
          align-items: baseline at the grid level so every row's items
          anchor to the same text baseline — no misalignments between
          the big amount and small meta on row 2. Right-column items
          use justify-self: end so trend and meta right edges stack. */}
      <div className={styles.totalBlock}>
        <span className={styles.totalEyebrow}>
          {VARIANT_EYEBROW[variant] ?? 'Amount'}
        </span>
        {trend && <TrendInline trend={trend} />}
        <div
          className={styles.totalAmount}
          aria-label={formatCurrency(total.amount, total.currency)}
        >
          {(() => {
            const amountParts = formatCurrencyParts(displayAmount, total.currency)
            return (
              <>
                <span className={styles.totalCurrency} aria-hidden="true">
                  {amountParts.symbol}
                </span>
                <span className={styles.totalAmountValue} aria-hidden="true">
                  {amountParts.rest}
                </span>
              </>
            )
          })()}
        </div>
        <div className={styles.totalMeta}>
          <span
            className={cx(styles.statusInline, styles[`statusInline_${status}`])}
          >
            <StatusGlyph size={12} strokeWidth={2.5} aria-hidden="true" />
            {STATUS_LABEL[status]}
          </span>
          {breakdown.length > 0 && (
            <>
              <span className={styles.metaDivider} aria-hidden="true">·</span>
              <span className={styles.metaCount}>
                {breakdown.length} {breakdown.length === 1 ? 'item' : 'items'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Breakdown list */}
      {breakdown.length > 0 && (
        <div className={styles.breakdown}>
          <div className={styles.breakdownEyebrow}>Breakdown</div>
          <ul className={styles.breakdownList}>
            {breakdown.map((row, idx) => (
              <BreakdownRow
                key={`${row.label ?? 'row'}-${idx}`}
                idx={idx}
                row={row}
                currency={total.currency}
                fallbackStatus={status}
              />
            ))}
          </ul>
        </div>
      )}

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

/* ─── Trend inline — 2-line stack (value / caption) ─────────────
   Lives in the total block's eyebrow row (top-right). Fintech
   convention: put "change" next to "when", freeing the zone below
   the amount for status + count. Directional nudge on the value
   span only (arrow + percent move; caption stays put). */
function TrendInline({ trend }) {
  const dir = trend.direction ?? 'flat'
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus
  const sign = dir === 'up' ? '+' : dir === 'down' ? '-' : '±'
  const pct  = Math.abs(trend.percent ?? 0)
  return (
    <div className={cx(styles.trendInline, styles[`trendInline_${dir}`])}>
      <span className={styles.trendInlineValue}>
        <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
        {sign}{pct}%
      </span>
      {trend.label && (
        <span className={styles.trendInlineLabel}>{trend.label}</span>
      )}
    </div>
  )
}

/* ─── Breakdown row ───────────────────────────────────────────── */
function BreakdownRow({ idx, row, currency, fallbackStatus }) {
  const rowStatus = row.status ?? fallbackStatus
  const tone = toneForStatus(rowStatus)
  const staggerDelay = 300 + Math.min(idx, MAX_BREAKDOWN - 1) * 60

  return (
    <li
      className={styles.row}
      data-status={rowStatus}
      data-tone={tone}
      style={{ '--earn-row-delay': `${staggerDelay}ms` }}
    >
      <span className={styles.rowDot} aria-hidden="true" />
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{row.label}</span>
        {row.meta && <span className={styles.rowMeta}>{row.meta}</span>}
      </div>
      <span className={styles.rowAmount}>
        {formatCurrency(row.amount ?? 0, currency)}
      </span>
    </li>
  )
}
