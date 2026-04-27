import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Trophy,
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

     personal     → rank summary eyebrow + ring (current/target) +
                    metric breakdown bars. Signature moment is the
                    target-hit beat — ring stroke completes, halo
                    pulses, Trophy retones success.
     leaderboard  → top-3 podium + ranks 4-5 list with the user's
                    row called out via §8 ledger-stripe spring-in.

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
   Rank summary eyebrow → ring + breakdown two-column. Container
   query collapses the metric row to stacked at narrow slot
   widths. */
function PersonalBody({ payload }) {
  const target       = payload?.target ?? null
  const breakdown    = Array.isArray(payload?.breakdown) ? payload.breakdown : []
  const userPosition = payload?.user_position ?? null
  const unit         = typeof payload?.unit === 'string' ? payload.unit : ''

  return (
    <div className={styles.personalBody}>
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
      {userPosition && <RankSummary position={userPosition} />}
    </div>
  )
}

/* RankSummary — eyebrow row showing where the user sits in the
   field. Three pieces: rank chip ("#16 of 184"), percentile caption
   ("Top 9%"), and an optional delta indicator with caption ("↑ 4
   vs last week"). Percentile derived as `Math.ceil(rank/out_of *
   100)` — gives a more relatable read than raw rank for self-
   context. Delta semantics: positive = improved (lower rank
   number), negative = dropped, flat = no change. */
function RankSummary({ position }) {
  const rank       = position?.rank
  const outOf      = position?.out_of
  const delta      = position?.delta
  const deltaLabel = position?.delta_label

  if (typeof rank !== 'number' || typeof outOf !== 'number' || outOf <= 0) {
    return null
  }

  const percentile = Math.max(1, Math.ceil((rank / outOf) * 100))

  return (
    <div className={styles.rankSummary} role="group" aria-label="Your ranking">
      <span className={styles.rankSummaryChip}>
        <span className={styles.rankSummaryRank}>#{rank}</span>
        <span className={styles.rankSummaryOf}>of {outOf}</span>
      </span>
      <span className={styles.rankSummaryPercentile}>
        Top {percentile}%
      </span>
      {typeof delta === 'number' && (
        <DeltaIndicator delta={delta} label={deltaLabel} />
      )}
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
   Top-3 render as a podium feature (PodiumStage). Ranks 4-5 fall
   through to the existing list (RankRow). The user's row carries a
   §8 ledger stripe that springs in last on the springy curve when
   they're in the rest list; podium-level user emphasis is handled
   inside PodiumColumn instead. */

/* Derive a single-character initial from the row's name for the
   podium disc. Anonymized handles like "Worker 4821" become "W". */
function deriveInitial(name) {
  if (!name) return '?'
  const trimmed = String(name).trim()
  if (!trimmed) return '?'
  return trimmed[0].toUpperCase()
}

function LeaderboardBody({ payload }) {
  const rows = Array.isArray(payload?.leaderboard) ? payload.leaderboard.slice(0, 5) : []
  const userPosition = payload?.user_position ?? null
  const unit = typeof payload?.unit === 'string' ? payload.unit : ''
  const userInTop = rows.some((r) => r?.is_user)

  const podium   = rows.filter((r) => (r?.rank ?? 0) <= 3)
  const restList = rows.filter((r) => (r?.rank ?? 0) > 3)

  return (
    <div className={styles.leaderboardBody}>
      {podium.length > 0 && <PodiumStage podium={podium} unit={unit} />}
      {restList.length > 0 && (
        <ol className={styles.rankList}>
          {restList.map((row, idx) => (
            <RankRow
              key={`${row?.rank ?? idx}-${row?.name ?? idx}`}
              idx={idx}
              row={row}
              unit={unit}
            />
          ))}
        </ol>
      )}
      {!userInTop && userPosition && (
        <p className={styles.userPosition}>
          You're #{userPosition.rank} of {userPosition.out_of}
        </p>
      )}
    </div>
  )
}

/* PodiumStage — top-3 in the visual order #2 / #1 / #3 so the tallest
   block sits center. Each column has a player block (disc + name +
   score) on top and a tiered podium block at the bottom; flex-end
   bottom-alignment makes the player content sit at varying heights
   matched to its block. The ghosted rank number on the block face
   uses font-size-700 — sanctioned per §12 as a "specialised
   subordinate element" (semi-transparent, never the focal point).  */
function PodiumStage({ podium, unit }) {
  const ordered = [
    podium.find((r) => r?.rank === 2),
    podium.find((r) => r?.rank === 1),
    podium.find((r) => r?.rank === 3),
  ].filter(Boolean)

  return (
    <div className={styles.podiumStage} aria-label="Podium — top 3">
      {ordered.map((row) => (
        <PodiumColumn key={row.rank} row={row} unit={unit} />
      ))}
    </div>
  )
}

function PodiumColumn({ row, unit }) {
  const isUser = !!row.is_user
  const initial = deriveInitial(row.name)
  const scoreCopy = unit ? `${row.score} ${unit}` : `${row.score}`
  const displayName = isUser ? 'You' : row.name

  return (
    <div
      className={cx(styles.podiumColumn, isUser && styles.podiumColumn_user)}
      data-rank={row.rank}
    >
      <div className={styles.podiumPlayer}>
        <div className={styles.podiumDiscWrap}>
          <span
            className={styles.podiumDisc}
            role="img"
            aria-label={`${displayName} avatar`}
          >
            <span className={styles.podiumDiscInitial} aria-hidden="true">
              {initial}
            </span>
          </span>
          <span
            className={styles.podiumRankBadge}
            aria-label={`Rank ${row.rank}`}
          >
            {row.rank}
          </span>
        </div>
        <div className={styles.podiumName} title={displayName}>
          {displayName}
        </div>
        <div className={styles.podiumScore}>{scoreCopy}</div>
      </div>
      <div className={styles.podiumBlock} aria-hidden="true">
        <span className={styles.podiumBlockNumber}>{row.rank}</span>
      </div>
    </div>
  )
}

function RankRow({ idx, row, unit }) {
  const rank   = row?.rank ?? idx + 1
  const name   = row?.name ?? '—'
  const score  = row?.score
  const isUser = !!row?.is_user
  const delta  = row?.delta

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
      <span className={styles.rankPill} aria-label={`Rank ${rank}`}>
        {rank}
      </span>
      <span className={styles.rankName}>{displayName}</span>
      <span className={styles.rankScore}>{scoreCopy}</span>
      {typeof delta === 'number' && <DeltaIndicator delta={delta} />}
    </li>
  )
}

function DeltaIndicator({ delta, label }) {
  const tone =
    delta > 0 ? 'positive' :
    delta < 0 ? 'negative' :
    'flat'
  const Glyph =
    delta > 0 ? ArrowUp :
    delta < 0 ? ArrowDown :
    Minus
  const magnitude = Math.abs(delta)
  const direction = delta > 0 ? 'Up' : delta < 0 ? 'Down' : 'Flat'
  const ariaLabel = label
    ? `${direction} ${magnitude} ${label}`
    : `Delta ${delta}`

  return (
    <span className={cx(styles.delta, styles[`delta_${tone}`])} aria-label={ariaLabel}>
      <Glyph size={14} strokeWidth={2} aria-hidden="true" />
      {magnitude > 0 && <span className={styles.deltaValue}>{magnitude}</span>}
      {label && <span className={styles.deltaLabel}>{label}</span>}
    </span>
  )
}

export default Leaderboard
