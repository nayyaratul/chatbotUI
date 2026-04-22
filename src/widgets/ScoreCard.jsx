import { useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react'
import { Button, ProgressBar } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './scoreCard.module.scss'

/* ─── Tone resolution ───────────────────────────────────────── */

function resolveTone(overall) {
  if (overall?.pass_fail) return overall.pass_fail
  if (overall?.score != null && overall?.max_score != null) {
    const ratio = overall.score / overall.max_score
    if (ratio >= 0.75) return 'pass'
    if (ratio >= 0.5)  return 'borderline'
    return 'fail'
  }
  return null
}

const TONE_META = {
  pass:       { icon: CheckCircle2,  chipLabel: 'Passed' },
  borderline: { icon: AlertTriangle, chipLabel: 'Borderline' },
  fail:       { icon: XCircle,       chipLabel: 'Failed' },
}

function categoryVariant(score, maxScore) {
  const ratio = score / maxScore
  if (ratio >= 0.75) return 'success'
  if (ratio >= 0.5)  return 'warning'
  return 'error'
}

/* ─── Count-up hook — eases a number from 0 to target over ms. */

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (target == null) { setValue(null); return }
    setValue(0)
    startRef.current = null

    const tick = (ts) => {
      if (startRef.current == null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(1, elapsed / duration)
      // easeOutQuart — snappy start, gentle landing
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

/* ─── Component ─────────────────────────────────────────────── */

export function ScoreCard({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [showReasoning, setShowReasoning] = useState(false)

  const overall = payload?.overall ?? {}
  const tone    = resolveTone(overall)
  const meta    = tone ? TONE_META[tone] : null
  const ChipIcon = meta?.icon

  const orientation = viewport === 'mobile' ? 'vertical' : 'horizontal'
  const hasActions = payload?.actions?.length > 0

  const numericTarget = overall.score != null ? overall.score : null
  const animatedScore = useCountUp(numericTarget, 700)
  const displayScore  = animatedScore ?? overall.score ?? 0

  const handleAction = (action) => {
    onReply?.({
      type: 'widget_response',
      payload: {
        source_type: 'score_card',
        source_widget_id: payload?.widget_id,
        data: {
          label: action.label,
          value: action.value,
          timestamp: Date.now(),
        },
      },
    })
  }

  return (
    <div className={cx(styles.card, tone && styles[tone])}>

      {/* ── Header: chip + label on the left, big score on the right ── */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          {meta && (
            <span className={styles.chip}>
              <ChipIcon size={11} strokeWidth={2.5} />
              {meta.chipLabel}
            </span>
          )}
          {overall.label && (
            <span className={styles.scoreLabel}>{overall.label}</span>
          )}
        </div>

        <div className={styles.scoreBlock}>
          {overall.score != null && overall.max_score != null ? (
            <>
              <span className={styles.scorePrimary}>{displayScore}</span>
              <span className={styles.scoreSecondary}>/ {overall.max_score}</span>
            </>
          ) : overall.score != null ? (
            <span className={styles.scorePrimary}>{displayScore}</span>
          ) : overall.pass_fail ? (
            <span className={styles.scorePassFail}>
              {overall.pass_fail === 'pass'
                ? 'Passed'
                : overall.pass_fail === 'fail'
                ? 'Failed'
                : 'Borderline'}
            </span>
          ) : null}
        </div>
      </header>

      {/* ── Recommendation ── */}
      {payload?.recommendation && (
        <p className={styles.recommendation}>{payload.recommendation}</p>
      )}

      {/* ── Category bars ── */}
      {payload?.categories?.length > 0 && (
        <div className={styles.categories}>
          {payload.categories.map((cat, idx) => {
            const pct = Math.min(100, Math.max(0, (cat.score / cat.max_score) * 100))
            const variant = categoryVariant(cat.score, cat.max_score)
            return (
              <div key={`${cat.name}-${idx}`} className={styles.categoryRow}>
                <div className={styles.categoryMeta}>
                  <span className={styles.categoryName}>{cat.name}</span>
                  <span className={styles.categoryScore}>
                    {cat.score} / {cat.max_score}
                  </span>
                </div>
                <ProgressBar value={pct} max={100} size="sm" variant={variant} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Reasoning expand / collapse ── */}
      {payload?.reasoning && (
        <div className={styles.reasoningSection}>
          <button
            type="button"
            className={styles.reasoningToggle}
            onClick={() => setShowReasoning((v) => !v)}
            aria-expanded={showReasoning}
          >
            {showReasoning ? 'Hide detailed feedback' : 'See detailed feedback'}
            <span className={cx(styles.reasoningChevron, showReasoning && styles.open)} aria-hidden="true">
              <ChevronDown size={13} strokeWidth={2.25} />
            </span>
          </button>
          {showReasoning && (
            <div className={styles.reasoningPanel} role="region">
              {payload.reasoning}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      {hasActions && (
        <div className={cx(styles.actions, styles[orientation])}>
          {payload.actions.map((action, idx) => (
            <Button
              key={`${action.value}-${idx}`}
              className={styles.actionBtn}
              variant={action.variant === 'secondary' ? 'secondary' : 'primary'}
              size="md"
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
