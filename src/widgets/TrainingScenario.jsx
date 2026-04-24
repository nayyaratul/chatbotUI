import { useCallback, useState } from 'react'
import cx from 'classnames'
import {
  GraduationCap,
  ListChecks,
  UserCog,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  Quote,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './trainingScenario.module.scss'

/* ─── Training Scenario Widget ────────────────────────────────────────
   Structured role-play brief + results. Two modes share the same card
   shell but render different bodies:

     • 'pre'  — mission brief: context, role, persona, evaluation
                criteria, "Start practice" CTA.
     • 'post' — results: overall score, per-criterion scores + specific
                feedback quotes, "Try again" CTA.

   Core widget for the Conversational Training Agent. A single
   scenario_id typically flows through both modes — brief → practice
   session elsewhere → back with results. ─────────────────────────── */

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/* Three bands for per-criterion scores. Drives the colour of the
   linear-fill (§6) and the score number. */
function scoreBand(score) {
  if (score >= 85) return 'strong'
  if (score >= 65) return 'okay'
  return 'weak'
}

function overallVerdict(score) {
  if (score >= 85) return 'Strong run'
  if (score >= 65) return 'Decent run'
  return 'Room to grow'
}

/* ─── Root ─────────────────────────────────────────────────────────── */

export function TrainingScenario({ payload }) {
  const { onReply } = useChatActions()

  const widgetId   = payload?.widget_id
  const scenarioId = payload?.scenario_id
  const mode       = payload?.mode ?? 'pre'      /* 'pre' | 'post' */
  const title      = payload?.title ?? 'Training scenario'
  const subtitle   = payload?.subtitle
  const context    = payload?.context
  const role       = payload?.role
  const persona    = payload?.persona
  const criteria   = Array.isArray(payload?.criteria) ? payload.criteria : []
  const results    = payload?.results
  const startLabel = payload?.start_label ?? 'Start practice'
  const retryLabel = payload?.retry_label ?? 'Try again'
  const isSilent   = Boolean(payload?.silent)

  const [actedOn, setActedOn]     = useState(null)
  const [actedAt, setActedAt]     = useState(null)

  const primaryAction = mode === 'pre' ? 'start' : 'retry'
  const primaryLabel  = mode === 'pre' ? startLabel : retryLabel

  const handleAction = useCallback(() => {
    if (actedOn) return
    const now = Date.now()
    setActedOn(primaryAction)
    setActedAt(now)

    const replyLabel = primaryAction === 'start'
      ? `Start practice — ${title}`
      : `Retry scenario — ${title}`

    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'training_scenario',
          source_widget_id: widgetId,
          data: {
            label: replyLabel,
            scenario_id: scenarioId ?? null,
            action: primaryAction,
            session_id: results?.session_id ?? undefined,
            submitted_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [actedOn, primaryAction, title, widgetId, scenarioId, results, onReply, isSilent])

  return (
    <div
      className={styles.card}
      data-mode={mode}
      role="article"
      aria-label={title}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <GraduationCap size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.description}>{subtitle}</p>}
        </div>
      </div>

      {/* Mode pill — declares which side of the practice loop we're on. */}
      <div className={cx(styles.modePill, styles[`modePill_${mode}`])}>
        {mode === 'pre' ? 'Mission brief' : 'Practice results'}
      </div>

      {/* Body */}
      {mode === 'pre' ? (
        <PreBody
          context={context}
          role={role}
          persona={persona}
          criteria={criteria}
        />
      ) : (
        <PostBody results={results} />
      )}

      {/* Footer — primary CTA OR post-action banner */}
      {actedOn ? (
        <div className={styles.successBanner}>
          <span className={styles.successCheck} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.25} />
          </span>
          <div className={styles.successBody}>
            <div className={styles.successTitle}>
              {actedOn === 'start' ? 'Practice starting' : 'Restarting practice'}
            </div>
            <div className={styles.successSub}>
              {timeLabel(actedAt)} · {title}
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          size="md"
          className={styles.submitBtn}
          iconRight={
            mode === 'pre'
              ? <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
              : <RotateCw    size={14} strokeWidth={2.25} aria-hidden="true" />
          }
          onClick={handleAction}
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  )
}

/* ─── Pre-practice body ────────────────────────────────────────────── */

function PreBody({ context, role, persona, criteria }) {
  return (
    <>
      {context && <p className={styles.context}>{context}</p>}

      <div className={styles.brief}>
        {role && (
          <section className={styles.briefCard}>
            <div className={styles.briefEyebrow}>You play</div>
            <div className={styles.briefHeadline}>
              <span className={styles.briefBadge} aria-hidden="true">
                <UserCog size={12} strokeWidth={2.25} />
              </span>
              <span className={styles.briefName}>{role.title}</span>
            </div>
            {role.description && (
              <div className={styles.briefDesc}>{role.description}</div>
            )}
          </section>
        )}

        {persona && (
          <section className={styles.briefCard}>
            <div className={styles.briefEyebrow}>Talking to</div>
            <div className={styles.briefHeadline}>
              <span className={styles.personaAvatar} aria-hidden="true">
                {initials(persona.name)}
              </span>
              <span className={styles.briefName}>
                {persona.name}
                {persona.title && (
                  <span className={styles.personaTitle}>{persona.title}</span>
                )}
              </span>
            </div>
            {persona.description && (
              <div className={styles.briefDesc}>{persona.description}</div>
            )}
          </section>
        )}
      </div>

      {criteria.length > 0 && (
        <div className={styles.criteriaBlock}>
          <div className={styles.criteriaHead}>
            <ListChecks size={12} strokeWidth={2} aria-hidden="true" />
            <span className={styles.criteriaHeadLabel}>Evaluation criteria</span>
          </div>
          <ul className={styles.criteriaList}>
            {criteria.map((c, i) => (
              <li key={c.name ?? i} className={styles.criterionRow}>
                <div className={styles.criterionName}>{c.name}</div>
                {c.description && (
                  <div className={styles.criterionDesc}>{c.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

/* ─── Post-practice body ───────────────────────────────────────────── */

function PostBody({ results }) {
  if (!results) {
    return <div className={styles.empty}>No results available for this scenario yet.</div>
  }

  const overall = typeof results.overall_score === 'number' ? results.overall_score : null
  const band    = overall != null ? scoreBand(overall) : null
  const scores  = Array.isArray(results.criteria_scores) ? results.criteria_scores : []

  return (
    <>
      {overall != null && (
        <div className={cx(styles.overall, styles[`overall_${band}`])}>
          <div className={styles.overallEyebrow}>Overall score</div>
          <div className={styles.overallValue}>
            {overall}
            <span className={styles.overallMax}>/ 100</span>
          </div>
          <div className={styles.overallVerdict}>{overallVerdict(overall)}</div>
        </div>
      )}

      {scores.length > 0 && (
        <ul className={styles.scoresList}>
          {scores.map((s, i) => {
            const b = scoreBand(s.score)
            return (
              <li key={s.name ?? i} className={cx(styles.scoreRow, styles[`scoreRow_${b}`])}>
                <div className={styles.scoreHead}>
                  <span className={styles.scoreName}>{s.name}</span>
                  <span className={cx(styles.scoreValue, styles[`scoreValue_${b}`])}>
                    {s.score}
                  </span>
                </div>
                <div className={styles.scoreBar} role="presentation">
                  <div
                    className={cx(styles.scoreBarFill, styles[`scoreBarFill_${b}`])}
                    style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
                  />
                </div>
                {s.feedback && (
                  <div className={styles.scoreFeedback}>
                    <Quote size={12} strokeWidth={2} aria-hidden="true" />
                    <span>{s.feedback}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
