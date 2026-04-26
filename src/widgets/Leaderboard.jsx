import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Trophy,
  ArrowRight,
} from 'lucide-react'
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

export function Leaderboard({ payload }) {
  const { onReply } = useChatActions()

  const widgetId    = payload?.widget_id
  const variant     = payload?.variant === 'leaderboard' ? 'leaderboard' : 'personal'
  const periodLabel = payload?.period_label ?? ''
  const links       = useMemo(
    () => (Array.isArray(payload?.links) ? payload.links : []),
    [payload?.links],
  )

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
      className={cx(styles.card, styles[`card_${variant}`])}
      data-variant={variant}
      role="article"
      aria-label={title}
    >
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden="true">
          <Trophy size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {periodLabel && <p className={styles.description}>{periodLabel}</p>}
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
              <ArrowRight size={12} strokeWidth={2.25} aria-hidden="true" />
            </button>
          ))}
        </footer>
      )}
    </div>
  )
}

/* Region 2 — to be filled in next commit. */
function PersonalBody() {
  return null
}

/* Region 3 — to be filled in. */
function LeaderboardBody() {
  return null
}

/* Surface useCountUp + the count-up timing tuning to the section
   components below. */
Leaderboard.useCountUp = useCountUp
Leaderboard.COUNT_UP_MS = COUNT_UP_MS
Leaderboard.COUNT_UP_DELAY_MS = COUNT_UP_DELAY_MS

export default Leaderboard
