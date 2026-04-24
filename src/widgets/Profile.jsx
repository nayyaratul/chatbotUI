import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  Circle,
  Star,
  Target,
  Globe,
  Clock,
  Briefcase,
  Award,
  TrendingUp,
  Dot,
  CheckCircle2,
  Check,
  X,
  Eye,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './profile.module.scss'

/* ─── Profile Card Widget (#29) ───────────────────────────────────
   Worker or candidate profile summary. Signature moment is the
   composite score ring — SVG stroke-dashoffset animates 0 → target
   alongside an RAF-driven count-up on the score number inside.

   Variants:
     worker → self-view + single "Update profile" CTA
     admin  → recruiter view + three-button action bar
              (Reject / View full / Shortlist). ────────────────── */

const COUNT_UP_MS = 720
const COUNT_UP_DELAY_MS = 180
const MAX_SKILLS_SHOWN = 5
const MAX_STATS = 4

const STAT_ICON = {
  star:          Star,
  target:        Target,
  globe:         Globe,
  clock:         Clock,
  briefcase:     Briefcase,
  award:         Award,
  'trending-up': TrendingUp,
}

const AVAILABILITY_LABEL = {
  available:   'Available',
  busy:        'Busy',
  unavailable: 'Offline',
}

const ACTION_GLYPH = {
  reject:      X,
  shortlist:   Check,
  view_full:   Eye,
  update:      ArrowRight,
}

function deriveInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function scoreTone(value, max) {
  if (max <= 0) return 'neutral'
  const ratio = value / max
  if (ratio >= 0.85) return 'success'
  if (ratio >= 0.60) return 'warning'
  return 'error'
}

function scoreVerdict(value, max, override) {
  if (override) return override
  const tone = scoreTone(value, max)
  if (tone === 'success') return 'Strong'
  if (tone === 'warning') return 'Decent'
  if (tone === 'error')   return 'Room to grow'
  return 'Not yet scored'
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/* Count-up hook — mirrors Earnings' useCountUp. RAF-driven 0 → target,
   ease-out cubic, respects prefers-reduced-motion. */
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

export function Profile({ payload }) {
  const { onReply } = useChatActions()

  const widgetId     = payload?.widget_id
  const workerId     = payload?.worker_id ?? null
  const variant      = payload?.variant ?? 'worker'
  const name         = payload?.name ?? 'Unnamed'
  const headline     = payload?.headline
  const initials     = payload?.initials ?? deriveInitials(name)
  const availability = payload?.availability ?? 'available'
  const score        = payload?.score
  const actions      = Array.isArray(payload?.actions) ? payload.actions : []

  const rawStats  = useMemo(() => (Array.isArray(payload?.stats) ? payload.stats : []), [payload?.stats])
  const stats     = useMemo(() => rawStats.slice(0, MAX_STATS), [rawStats])
  const rawSkills = useMemo(() => (Array.isArray(payload?.skills) ? payload.skills : []), [payload?.skills])
  const visibleSkills = useMemo(() => rawSkills.slice(0, MAX_SKILLS_SHOWN), [rawSkills])
  const skillOverflow = Math.max(0, rawSkills.length - MAX_SKILLS_SHOWN)

  const [actedAt, setActedAt] = useState(null)
  const [actedLabel, setActedLabel] = useState(null)

  const displayScore = useCountUp(score?.value ?? 0, {
    duration: COUNT_UP_MS,
    delay: COUNT_UP_DELAY_MS,
  })

  const tone = score ? scoreTone(score.value, score.max ?? 100) : 'neutral'

  const handleAction = useCallback((action) => {
    if (actedAt) return
    const now = Date.now()
    setActedAt(now)
    setActedLabel(action.label)
    onReply?.({
      type: 'widget_response',
      payload: {
        source_type: 'profile',
        source_widget_id: widgetId,
        data: {
          label: action.label,
          worker_id: workerId,
          variant,
          action_id: action.id,
          submitted_at: now,
        },
      },
    })
  }, [actedAt, onReply, variant, widgetId, workerId])

  const totalSkillChips = visibleSkills.length + (skillOverflow > 0 ? 1 : 0)
  const ctaDelay = 540 + totalSkillChips * 60 + 240

  return (
    <div
      className={cx(styles.card, styles[`card_${tone}`])}
      data-variant={variant}
      role="article"
      aria-label={`${name} — profile`}
      style={{ '--pcd-cta-delay': `${ctaDelay}ms` }}
    >
      {/* Header — photo/initials + name + headline + availability chip. */}
      <header className={styles.header}>
        <PhotoAvatar photoUrl={payload?.photo_url} initials={initials} name={name} />
        <div className={styles.headerText}>
          <h3 className={styles.name}>{name}</h3>
          {headline && <p className={styles.headline}>{headline}</p>}
        </div>
        <AvailabilityChip availability={availability} />
      </header>

      {/* Body — score ring (optional) + stats grid. */}
      <div className={cx(styles.body, !score && styles.body_noRing)}>
        {score && (
          <ScoreRing
            value={score.value}
            max={score.max ?? 100}
            displayValue={displayScore}
            label={scoreVerdict(score.value, score.max ?? 100, score.label)}
            tone={tone}
          />
        )}
        {stats.length > 0 && (
          <ul className={styles.statsList}>
            {stats.map((s, idx) => (
              <StatRow key={`${s.label ?? 'stat'}-${idx}`} idx={idx} stat={s} />
            ))}
          </ul>
        )}
      </div>

      {/* Skills. */}
      {(visibleSkills.length > 0 || skillOverflow > 0) && (
        <div className={styles.skills}>
          <div className={styles.skillsEyebrow}>Skills</div>
          <ul className={styles.skillsList}>
            {visibleSkills.map((skill, idx) => (
              <li
                key={`skill-${idx}`}
                className={styles.skillChip}
                style={{ '--pcd-chip-delay': `${540 + idx * 60}ms` }}
              >
                {skill}
              </li>
            ))}
            {skillOverflow > 0 && (
              <li
                className={cx(styles.skillChip, styles.skillChip_overflow)}
                style={{ '--pcd-chip-delay': `${540 + visibleSkills.length * 60}ms` }}
              >
                +{skillOverflow} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Footer — CTA / action bar / success banner. */}
      {actedAt ? (
        <div className={styles.successBanner}>
          <span className={styles.successChip}>
            <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
            Submitted
          </span>
          <span className={styles.successMeta}>
            {actedLabel} · {timeLabel(actedAt)}
          </span>
        </div>
      ) : actions.length > 0 ? (
        variant === 'admin' ? (
          <div className={styles.actionBar}>
            {actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onClick={() => handleAction(action)}
              />
            ))}
          </div>
        ) : (
          <Button
            variant={actions[0].intent === 'neutral' ? 'secondary' : 'primary'}
            size="md"
            className={styles.submitBtn}
            iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
            onClick={() => handleAction(actions[0])}
          >
            {actions[0].label}
          </Button>
        )
      ) : null}
    </div>
  )
}

/* ─── Photo avatar ────────────────────────────────────────────────
   Renders <img> when photo_url is present with onError fallback to
   initials. In the playground, photo_url is never set — always the
   initials disc. */
function PhotoAvatar({ photoUrl, initials, name }) {
  const [failed, setFailed] = useState(false)
  const useInitials = !photoUrl || failed

  if (useInitials) {
    return (
      <span
        className={styles.photo}
        role="img"
        aria-label={`${name} initials`}
      >
        <span className={styles.photoInitials}>{initials}</span>
      </span>
    )
  }
  return (
    <img
      className={styles.photo}
      src={photoUrl}
      alt={name}
      onError={() => setFailed(true)}
    />
  )
}

/* ─── Availability chip ─────────────────────────────────────────── */
function AvailabilityChip({ availability }) {
  return (
    <span className={cx(styles.availability, styles[`availability_${availability}`])}>
      <Circle size={8} strokeWidth={0} fill="currentColor" aria-hidden="true" />
      {AVAILABILITY_LABEL[availability] ?? 'Unknown'}
    </span>
  )
}

/* ─── Score ring — SVG stroke-dashoffset fill ─────────────────────
   viewBox 64×64. Two circles: grey track + tone-coloured fill. The
   fill's stroke-dasharray equals the circumference; stroke-dashoffset
   animates from circumference → circumference * (1 - ratio) on mount.
   Rotated -90° so the fill starts at 12 o'clock. */
function ScoreRing({ value, max, displayValue, label, tone }) {
  const ratio = Math.max(0, Math.min(1, value / (max || 1)))
  // viewBox 64x64, radius 28 → circumference = 2 * π * 28 ≈ 175.93
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - ratio)

  return (
    <div className={cx(styles.ringWrap, styles[`ringWrap_${tone}`])}>
      <svg
        className={styles.ring}
        viewBox="0 0 64 64"
        width="64"
        height="64"
        aria-hidden="true"
      >
        <circle
          className={styles.ringTrack}
          cx="32"
          cy="32"
          r={radius}
          fill="none"
        />
        <circle
          className={styles.ringFill}
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          style={{
            '--pcd-ring-circumference': `${circumference}`,
            '--pcd-ring-target': `${targetOffset}`,
          }}
        />
      </svg>
      <div className={styles.ringCenter} aria-label={`Score ${value} of ${max}`}>
        <span className={styles.ringValue}>{displayValue}</span>
        <span className={styles.ringMax}>/ {max}</span>
      </div>
      <div className={styles.ringVerdict}>{label}</div>
    </div>
  )
}

/* ─── Stat row ────────────────────────────────────────────────── */
function StatRow({ idx, stat }) {
  const Icon = STAT_ICON[stat.icon] ?? Dot
  const delay = 300 + idx * 60
  return (
    <li
      className={styles.statRow}
      style={{ '--pcd-stat-delay': `${delay}ms` }}
    >
      <span className={styles.statIcon} aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className={styles.statLabel}>{stat.label}</span>
      <span className={styles.statValue}>{stat.value}</span>
    </li>
  )
}

/* ─── Admin action button (Reject / View full / Shortlist) ─────── */
function ActionButton({ action, onClick }) {
  const Glyph = ACTION_GLYPH[action.id] ?? ArrowRight
  const variant = action.intent === 'primary'
    ? 'primary'
    : 'secondary'
  return (
    <Button
      variant={variant}
      size="md"
      className={cx(
        styles.actionBtn,
        action.intent === 'destructive' && styles.actionBtn_destructive,
        action.intent === 'primary' && styles.actionBtn_primary,
      )}
      iconLeft={<Glyph size={14} strokeWidth={2.25} aria-hidden="true" />}
      onClick={onClick}
    >
      {action.label}
    </Button>
  )
}
