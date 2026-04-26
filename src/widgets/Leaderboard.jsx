import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowRight,
} from 'lucide-react'
/* eslint-disable react-refresh/only-export-components */
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './leaderboard.module.scss'

/* ─── Incentive / Leaderboard Widget (#30) ────────────────────────
   Display-only performance card with two structural variants:

     personal     → ring (current/target) + 3-pill tier rung +
                    metric breakdown bars. Signature moment is the
                    target-hit beat — ring stroke completes, halo
                    pulses, Trophy retones success.
     leaderboard  → top-5 ranked list with the user's row called
                    out via §8 ledger-stripe spring-in.

   Reuses Profile's ring + count-up vocabulary verbatim and Earnings'
   sheen restraint on celebrations (no confetti, §18 #11). Footer
   text-links follow JobCard / Profile's "View details" pattern —
   no new Button styles introduced.
   ────────────────────────────────────────────────────────────── */

const COUNT_UP_MS = 720
const COUNT_UP_DELAY_MS = 180

/* RAF-driven 0 → target count-up. Mirrors Profile's `useCountUp`
   exactly — kept inline rather than imported because the playground
   has no shared-helpers module today, and a future extraction would
   touch every call site at once. */
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

/* Ring + breakdown share the same threshold table — keeps the visual
   cue identical across the two regions in the personal body.
   `target <= 0` is a defensive path for malformed payloads (the
   schema builder always provides a positive target); we resolve
   it to neutral so the brand-60 ring + "No target" verdict at
   least renders something instead of throwing. */
function progressTone(current, target) {
  if (target <= 0) return 'neutral'
  const ratio = current / target
  if (ratio >= 1.0) return 'success'
  if (ratio >= 0.6) return 'neutral'   /* on-track default — brand-60 */
  return 'warning'                     /* behind — yellow-60 */
}

function progressVerdict(current, target) {
  if (target <= 0) return 'No target'
  const ratio = current / target
  if (ratio >= 1.0)  return 'Target hit'
  if (ratio >= 0.85) return 'Almost there'
  if (ratio >= 0.6)  return 'On track'
  if (ratio >= 0.3)  return 'Catching up'
  return 'Behind'
}

export function Leaderboard({ payload }) {
  const { onReply } = useChatActions()

  const widgetId    = payload?.widget_id
  const variant     = payload?.variant === 'leaderboard' ? 'leaderboard' : 'personal'
  const periodLabel = payload?.period_label ?? ''
  const metricLabel = payload?.metric_label ?? ''
  const links       = useMemo(
    () => (Array.isArray(payload?.links) ? payload.links : []),
    [payload?.links],
  )

  /* Description copy — period plus optional metric framing. The
     middle-dot separator matches JobCard subtitle convention. Either
     piece can be missing; we render whichever is present. */
  const descriptionParts = [periodLabel, metricLabel].filter(Boolean)
  const description = descriptionParts.join(' · ')

  /* Card-level tone — only meaningful in personal mode where the ring
     drives it. Leaderboard mode stays neutral (brand-60). */
  const personalTone = variant === 'personal' && payload?.target
    ? progressTone(payload.target.current_value ?? 0, payload.target.target_value ?? 0)
    : 'neutral'

  const handleLink = useCallback((link) => {
    onReply?.({
      type: 'widget_response',
      payload: {
        source_type: 'leaderboard',
        source_widget_id: widgetId,
        data: {
          label: link.label,
          variant,
          action_id: link.id,
          submitted_at: Date.now(),
        },
      },
    })
  }, [onReply, variant, widgetId])

  const title = variant === 'leaderboard' ? 'Top performers' : 'Your performance'

  return (
    <div
      className={cx(
        styles.card,
        styles[`card_${variant}`],
        styles[`card_tone-${personalTone}`],
      )}
      data-variant={variant}
      data-tone={personalTone}
      role="article"
      aria-label={title}
    >
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden="true">
          <Trophy size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </header>

      {variant === 'personal' ? (
        <PersonalBody payload={payload} />
      ) : (
        <LeaderboardBody payload={payload} />
      )}

      {links.length > 0 && (
        <footer className={styles.linksRow}>
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              className={styles.linkButton}
              onClick={() => handleLink(link)}
            >
              {link.label}
              {/* Caret only on the navigational link. `how_calculated`
                  is explanatory, not directional — an arrow there
                  reads as "go to" when the link is really "tell me
                  about". Same pattern Profile uses on its admin
                  view-full vs. its other actions. */}
              {link.id === 'view_full' && (
                <ArrowRight size={12} strokeWidth={2.25} aria-hidden="true" />
              )}
            </button>
          ))}
        </footer>
      )}
    </div>
  )
}

/* ─── Personal body ──────────────────────────────────────────────
   Tier rung eyebrow → ring + breakdown two-column. Container query
   collapses to stacked at narrow slot widths. */
function PersonalBody({ payload }) {
  const target    = payload?.target ?? null
  const breakdown = Array.isArray(payload?.breakdown) ? payload.breakdown : []
  const tier      = payload?.tier ?? null
  const unit      = typeof payload?.unit === 'string' ? payload.unit : ''

  return (
    <div className={styles.personalBody}>
      {tier && <TierRung tier={tier} />}
      {target && (
        <div className={styles.metricRow}>
          <ProgressRing
            current={target.current_value ?? 0}
            target={target.target_value ?? 0}
            unit={unit}
          />
          {breakdown.length > 0 && (
            <ul className={styles.breakdown}>
              {breakdown.slice(0, 4).map((row, idx) => (
                <BreakdownRow
                  key={`${row.label ?? 'row'}-${idx}`}
                  idx={idx}
                  label={row.label ?? ''}
                  current={row.current ?? 0}
                  target={row.target ?? 0}
                  unit={row.unit ?? unit}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* Tier rung — chip + 3-pill segmented rung + distance caption.
   §6 segmented-pills vocabulary. When `distance === null` (top tier
   reached), the right-most pill takes a success tint with a one-cycle
   springy pulse and the caption swaps to "Top tier reached". */
function TierRung({ tier }) {
  const rungs   = Array.isArray(tier?.rungs) ? tier.rungs : []
  const current = tier?.current ?? ''
  const currentIdx = rungs.findIndex((r) => r === current)
  const atTop = tier?.distance == null
  const distanceCopy = atTop
    ? 'Top tier reached'
    : `${tier?.distance ?? 0} ${tier?.distance_unit ?? ''}`.trim()

  return (
    <div className={styles.tierRow} role="group" aria-label="Tier progress">
      <span className={styles.tierChip}>{current}</span>
      <span className={styles.rungs} aria-hidden="true">
        {rungs.map((rung, idx) => {
          let state = 'upcoming'
          if (idx < currentIdx) state = 'completed'
          else if (idx === currentIdx) state = 'current'
          const isLastTopRung = atTop && idx === rungs.length - 1
          /* When the user has reached the top tier, drop the state
             class entirely — `rungPill_topPulse` carries its own
             success-tinted background and the springy pulse. Avoids
             the `current` (half-saturation) and `topPulse` rules
             racing for the same property. */
          return (
            <span
              key={rung}
              className={cx(
                styles.rungPill,
                !isLastTopRung && styles[`rungPill_${state}`],
                isLastTopRung && styles.rungPill_topPulse,
              )}
              data-state={isLastTopRung ? 'top-reached' : state}
              aria-label={`${rung}, ${isLastTopRung ? 'top reached' : state}`}
            />
          )
        })}
      </span>
      <span className={styles.distanceCaption}>{distanceCopy}</span>
    </div>
  )
}

/* Progress ring — full circle, 64×64 viewBox. SVG rotated -90deg so
   the stroke begins at 12 o'clock and sweeps clockwise. Two
   concentric circles: track (grey-10) + fill (--tone-color, animates
   stroke-dashoffset 0 → target). Center: count-up number + quiet
   `/ target` reference. Verdict word below. */
function ProgressRing({ current, target, unit }) {
  const ratio = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0
  const RADIUS = 28
  const CIRC = 2 * Math.PI * RADIUS               // ≈ 175.93
  const targetOffset = CIRC * (1 - ratio)
  const tone = progressTone(current, target)
  const verdict = progressVerdict(current, target)
  const display = useCountUp(current, {
    duration: COUNT_UP_MS,
    delay: COUNT_UP_DELAY_MS,
  })
  const valueLabel = unit
    ? `Progress: ${current} of ${target} ${unit}`
    : `Progress: ${current} of ${target}`

  return (
    <div
      className={cx(styles.ringWrap, styles[`ringWrap_${tone}`])}
      role="img"
      aria-label={valueLabel}
    >
      <div className={styles.ringFrame}>
        <svg
          className={styles.ring}
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <circle
            className={styles.ringTrack}
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
          />
          <circle
            className={styles.ringFill}
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            style={{
              '--lb-ring-circ': `${CIRC}`,
              '--lb-ring-target': `${targetOffset}`,
            }}
          />
        </svg>
        <div className={styles.ringCenter}>
          <span className={styles.ringValue}>{display}</span>
          <span className={styles.ringDenominator}>
            / {target}{unit ? ` ${unit}` : ''}
          </span>
        </div>
      </div>
      <span className={styles.ringVerdict}>{verdict}</span>
    </div>
  )
}

/* Breakdown row — label + value + §6 linear-fill mini-bar. Per-row
   tone independent of the ring tone (a row can be on track while the
   overall target is behind, or vice-versa). */
function BreakdownRow({ idx, label, current, target, unit }) {
  const ratio = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0
  const tone = progressTone(current, target)
  const valueCopy = unit
    ? `${current} / ${target} ${unit}`
    : `${current} / ${target}`
  /* Stagger §11 — start 240ms after card mount, +60ms per row.
     Capped at 4 rows so we never approach §18 #12's 8-child ceiling. */
  const delay = 240 + idx * 60

  return (
    <li
      className={cx(styles.breakdownRow, styles[`breakdownRow_${tone}`])}
      style={{ '--lb-row-delay': `${delay}ms` }}
    >
      <div className={styles.breakdownTopRow}>
        <span className={styles.breakdownLabel}>{label}</span>
        <span className={styles.breakdownValue}>{valueCopy}</span>
      </div>
      <div
        className={styles.breakdownTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={current}
        aria-label={label}
      >
        <span
          className={styles.breakdownFill}
          style={{ '--lb-fill-target': `${ratio * 100}%` }}
        />
      </div>
    </li>
  )
}

/* ─── Leaderboard body ───────────────────────────────────────────
   Top-5 ranked list. The user's row carries a §8 ledger stripe that
   springs in last on the springy curve — the "you are here" beat
   that's the signature for this variant. */

const RANK_ICON = {
  1: Crown,
  2: Medal,
  3: Award,
}

function LeaderboardBody({ payload }) {
  const rows = Array.isArray(payload?.leaderboard) ? payload.leaderboard.slice(0, 5) : []
  const userPosition = payload?.user_position ?? null
  const unit = typeof payload?.unit === 'string' ? payload.unit : ''
  const userInTop = rows.some((r) => r?.is_user)

  return (
    <div className={styles.leaderboardBody}>
      <ol className={styles.rankList}>
        {rows.map((row, idx) => (
          <RankRow
            key={`${row?.rank ?? idx}-${row?.name ?? idx}`}
            idx={idx}
            row={row}
            unit={unit}
          />
        ))}
      </ol>
      {!userInTop && userPosition && (
        <p className={styles.userPosition}>
          You're #{userPosition.rank} of {userPosition.out_of}
        </p>
      )}
    </div>
  )
}

function RankRow({ idx, row, unit }) {
  const rank   = row?.rank ?? idx + 1
  const name   = row?.name ?? '—'
  const score  = row?.score
  const isUser = !!row?.is_user
  const delta  = row?.delta
  const RankIcon = RANK_ICON[rank] ?? null

  /* Stagger §11 — 60ms steps starting at 200ms.
     User-row stripe springs in 180ms after the row's own rise-up. */
  const rowDelay    = 200 + idx * 60
  const stripeDelay = rowDelay + 180
  const scoreCopy   = unit ? `${score} ${unit}` : `${score}`
  const displayName = isUser ? 'You' : name

  return (
    <li
      className={cx(styles.rankRow, isUser && styles.rankRow_user)}
      style={{
        '--lb-row-delay': `${rowDelay}ms`,
        '--lb-stripe-delay': `${stripeDelay}ms`,
      }}
      aria-current={isUser ? 'location' : undefined}
    >
      {RankIcon ? (
        <span
          className={cx(styles.rankPill, styles.rankPill_podium)}
          aria-label={`Rank ${rank}`}
        >
          <RankIcon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
      ) : (
        <span
          className={cx(styles.rankPill, styles.rankPill_numeric)}
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </span>
      )}
      <span className={styles.rankName}>{displayName}</span>
      <span className={styles.rankScore}>{scoreCopy}</span>
      {typeof delta === 'number' && <DeltaIndicator delta={delta} />}
    </li>
  )
}

function DeltaIndicator({ delta }) {
  const tone =
    delta > 0 ? 'positive' :
    delta < 0 ? 'negative' :
    'flat'
  const Glyph =
    delta > 0 ? ArrowUp :
    delta < 0 ? ArrowDown :
    Minus
  const magnitude = Math.abs(delta)

  return (
    <span className={cx(styles.delta, styles[`delta_${tone}`])} aria-label={`Delta ${delta}`}>
      <Glyph size={14} strokeWidth={2} aria-hidden="true" />
      {magnitude > 0 && <span className={styles.deltaValue}>{magnitude}</span>}
    </span>
  )
}

export default Leaderboard
