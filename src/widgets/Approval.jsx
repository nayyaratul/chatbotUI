import { useEffect, useState } from 'react'
import cx from 'classnames'
import {
  ShieldCheck,
  MessagesSquare,
  ScanSearch,
  HandCoins,
} from 'lucide-react'
import styles from './approval.module.scss'

/* ─── Approval Widget (#23) ────────────────────────────────────────
   Admin / reviewer card. One shell, four variants (bgv, interview,
   qc_flagged, offer). State machine: idle → pending-confirm (for
   destructive actions) → committed. Signature moment: confidence arc
   as §2 header-right flourish.

   Spec: docs/superpowers/specs/2026-04-24-approval-widget-design.md
   Rule book: docs/widget-conventions.md
   ──────────────────────────────────────────────────────────────── */

const VERDICT_LABEL = {
  approve:    'APPROVE',
  reject:     'REJECT',
  borderline: 'BORDERLINE',
}

const VERDICT_LABEL_DONE = {
  approve:    'APPROVED',
  reject:     'REJECTED',
  more_info:  'INFO REQUESTED',
  escalate:   'ESCALATED',
}

function ConfidenceArc({ confidence, verdict, committed = false, decisionKey = null }) {
  const C = 2 * Math.PI * 18
  const target = committed ? 1 : (confidence ?? 0)
  const [swept, setSwept] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSwept(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const dashOffset = C * (1 - (swept ? Math.max(0, Math.min(1, target)) : 0))
  const labelWord = committed
    ? (VERDICT_LABEL_DONE[decisionKey] ?? VERDICT_LABEL[verdict] ?? '')
    : (VERDICT_LABEL[verdict] ?? '')

  return (
    <div className={styles.arcWrap} aria-hidden>
      <svg className={styles.arcSvg} viewBox="0 0 44 44" role="img"
           aria-label={`Confidence ${Math.round((confidence ?? 0) * 100)} percent`}>
        <circle className={styles.arcTrack} cx="22" cy="22" r="18" />
        <circle className={styles.arcFill} cx="22" cy="22" r="18"
                style={{ strokeDasharray: C, strokeDashoffset: dashOffset }} />
      </svg>
      <span className={styles.arcVerdict}>{labelWord}</span>
    </div>
  )
}

const VARIANT_ICONS = {
  bgv: ShieldCheck,
  interview: MessagesSquare,
  qc_flagged: ScanSearch,
  offer: HandCoins,
}

const TONE_CLASS = {
  success: 'card_success',
  warning: 'card_warning',
  error:   'card_error',
}

export function Approval({ payload }) {
  const { variant = 'bgv', summary, recommendation } = payload ?? {}
  const Icon = VARIANT_ICONS[variant] ?? ShieldCheck

  const toneClass = TONE_CLASS[recommendation?.tone] ?? null

  return (
    <div className={cx(styles.card, toneClass && styles[toneClass])}>
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <span className={styles.iconBadge} aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{summary?.title}</h3>
            {summary?.subtitle && (
              <p className={styles.description}>{summary.subtitle}</p>
            )}
          </div>
        </div>
        <ConfidenceArc
          confidence={recommendation?.confidence}
          verdict={recommendation?.verdict}
        />
      </header>
      {/* Reasoning + accordion + action bar follow in later tasks */}
    </div>
  )
}
