import { useState } from 'react'
import cx from 'classnames'
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react'
import { Button, ProgressBar } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './scoreCard.module.scss'

/* ─── Tone resolution ───────────────────────────────────────── */

function resolveTone(overall) {
  if (overall?.pass_fail) return overall.pass_fail  // 'pass' | 'borderline' | 'fail'
  if (overall?.score != null && overall?.max_score != null) {
    const ratio = overall.score / overall.max_score
    if (ratio >= 0.75) return 'pass'
    if (ratio >= 0.5)  return 'borderline'
    return 'fail'
  }
  return null
}

const TONE_META = {
  pass:       { icon: CheckCircle2,   chipLabel: 'Passed' },
  borderline: { icon: AlertTriangle,  chipLabel: 'Borderline' },
  fail:       { icon: XCircle,        chipLabel: 'Failed' },
}

/* ─── Category bar variant ──────────────────────────────────── */

function categoryVariant(score, maxScore) {
  const ratio = score / maxScore
  if (ratio >= 0.75) return 'success'
  if (ratio >= 0.5)  return 'warning'
  return 'error'
}

/* ─── Component ─────────────────────────────────────────────── */

export function ScoreCard({ payload }) {
  /* Always call hooks at the top level — Rules of Hooks. Guard the
     callback usage at the site of invocation instead. */
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [showReasoning, setShowReasoning] = useState(false)

  const hasActions = payload?.actions?.length > 0

  const overall = payload?.overall ?? {}
  const tone    = resolveTone(overall)
  const meta    = tone ? TONE_META[tone] : null
  const ChipIcon = meta?.icon

  const orientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

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

      {/* ── Tone chip ── */}
      {meta && (
        <span className={cx(styles.chip, styles[tone])}>
          <ChipIcon size={11} strokeWidth={2.5} />
          {meta.chipLabel}
        </span>
      )}

      {/* ── Big score display ── */}
      <div className={styles.scoreBlock}>
        {overall.score != null && overall.max_score != null ? (
          <div className={styles.scoreRow}>
            <span className={styles.scorePrimary}>{overall.score}</span>
            <span className={styles.scoreSecondary}>/ {overall.max_score}</span>
          </div>
        ) : overall.score != null ? (
          <div className={styles.scoreRow}>
            <span className={styles.scorePrimary}>{overall.score}</span>
          </div>
        ) : overall.pass_fail ? (
          <span className={cx(styles.scorePassFail, tone && styles[tone])}>
            {overall.pass_fail === 'pass'
              ? 'Passed'
              : overall.pass_fail === 'fail'
              ? 'Failed'
              : 'Borderline'}
          </span>
        ) : null}

        {overall.label && (
          <span className={styles.scoreLabel}>{overall.label}</span>
        )}
      </div>

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
            className={styles.reasoningToggle}
            onClick={() => setShowReasoning((v) => !v)}
            aria-expanded={showReasoning}
          >
            See detailed feedback
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
