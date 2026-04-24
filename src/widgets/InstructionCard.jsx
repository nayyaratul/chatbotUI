import { useCallback, useState } from 'react'
import cx from 'classnames'
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Check,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './instructionCard.module.scss'

/* ─── Instruction Card Widget ─────────────────────────────────────────
   Read-forward "how to do this" guide. Complements action widgets
   (Image Capture, File Upload) by setting the user up before they
   act — "Here's how to take a good photo of your Aadhaar".

   Three tones:
     • info    — default guidance                (brand)
     • warn    — heads-up, important caveat      (amber)
     • success — best-practice / confirmation    (green)

   Steps are numbered (1, 2, 3 …) with a circular badge per step.
   Optional per-step image. Optional "I understand" CTA that fires a
   widget_response acknowledgement when clicked.
   ─────────────────────────────────────────────────────────────────── */

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

const TONE_MAP = {
  info:    { Icon: BookOpen,       variantClass: 'tone_info' },
  warn:    { Icon: AlertTriangle,  variantClass: 'tone_warn' },
  success: { Icon: CheckCircle2,   variantClass: 'tone_success' },
}

export function InstructionCard({ payload }) {
  const { onReply } = useChatActions()

  const widgetId        = payload?.widget_id
  const instructionId   = payload?.instruction_id
  const title           = payload?.title ?? 'Instructions'
  const description     = payload?.description
  const tone            = TONE_MAP[payload?.tone] ? payload.tone : 'info'
  const steps           = Array.isArray(payload?.steps) ? payload.steps : []
  const requireAck      = payload?.require_acknowledgement !== false
  const ackLabel        = payload?.acknowledge_label ?? 'Got it'
  const isSilent        = Boolean(payload?.silent)

  const [acknowledged, setAcknowledged]     = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState(null)

  const handleAcknowledge = useCallback(() => {
    const now = Date.now()
    setAcknowledgedAt(now)
    setAcknowledged(true)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'instruction_card',
          source_widget_id: widgetId,
          data: {
            label: `Acknowledged ${title}`,
            instruction_id: instructionId,
            acknowledged_at: now,
          },
        },
      },
      { silent: isSilent },
    )
  }, [onReply, widgetId, instructionId, title, isSilent])

  const { Icon, variantClass } = TONE_MAP[tone]

  return (
    <div className={cx(styles.card, styles[variantClass])} role="article" aria-label={title}>
      {/* ─── Header — tone-tinted icon badge + title + description ── */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>
      </div>

      {/* ─── Numbered step list ──────────────────────────────────── */}
      {steps.length > 0 && (
        <ol className={styles.stepList}>
          {steps.map((step, index) => (
            <Step
              key={step.step_id ?? index}
              index={index + 1}
              step={step}
            />
          ))}
        </ol>
      )}

      {/* ─── Bottom: Acknowledge CTA OR success banner ──────────── */}
      {requireAck && (
        acknowledged ? (
          <div className={styles.successBanner}>
            <span className={styles.successCheck} aria-hidden="true">
              <CheckCircle2 size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.successBody}>
              <div className={styles.successTitle}>Got it</div>
              <div className={styles.successSub}>
                Acknowledged · {timeLabel(acknowledgedAt)}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.actionsGroup}>
            <Button
              variant="primary"
              size="md"
              className={styles.primaryBtn}
              iconLeft={<Check size={14} strokeWidth={2.5} aria-hidden="true" />}
              onClick={handleAcknowledge}
            >
              {ackLabel}
            </Button>
          </div>
        )
      )}
    </div>
  )
}

/* ─── Step — one numbered row ──────────────────────────────────── */

function Step({ index, step }) {
  const { label, description, image_url } = step
  return (
    <li className={styles.step}>
      <span className={styles.stepNumber} aria-hidden="true">{index}</span>
      <div className={styles.stepBody}>
        <div className={styles.stepLabel}>{label}</div>
        {description && (
          <div className={styles.stepDescription}>{description}</div>
        )}
        {image_url && (
          <div className={styles.stepImageWrap}>
            <img src={image_url} alt="" className={styles.stepImage} />
          </div>
        )}
      </div>
    </li>
  )
}
