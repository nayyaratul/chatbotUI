import { useState } from 'react'
import cx from 'classnames'
import { Info, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react'
import { Button, Checkbox } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './confirmationCard.module.scss'

const TONE_META = {
  info:    { icon: Info,          kicker: 'Confirm' },
  caution: { icon: AlertTriangle, kicker: 'Please confirm' },
  danger:  { icon: AlertOctagon,  kicker: 'Irreversible action' },
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function ConfirmationCard({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [acknowledged, setAcknowledged] = useState(false)
  const [decision, setDecision] = useState(null) // 'confirmed' | 'cancelled'
  const [decidedAt, setDecidedAt] = useState(null)

  const tone = TONE_META[payload?.tone] ? payload.tone : 'info'
  const meta = TONE_META[tone]
  const SealIcon = meta.icon

  const requireCheckbox = !!payload?.require_checkbox
  const canConfirm = !requireCheckbox || acknowledged

  const emit = (confirmed) => {
    if (decision) return
    const timestamp = Date.now()
    setDecision(confirmed ? 'confirmed' : 'cancelled')
    setDecidedAt(timestamp)
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'confirmation',
        source_widget_id: payload?.widget_id,
        data: {
          label: confirmed
            ? (payload?.confirm_label ?? 'Confirm')
            : (payload?.cancel_label ?? 'Go back'),
          action_id: payload?.action_id,
          confirmed,
          tone,
          timestamp,
        },
      },
    })
  }

  const orientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

  return (
    <div className={cx(styles.card, styles[tone], decision && styles.decided)}>
      <header className={styles.header}>
        <span className={styles.kicker}>
          <span className={styles.kickerIcon} aria-hidden="true">
            <SealIcon size={11} strokeWidth={2.5} />
          </span>
          {meta.kicker}
        </span>
        {payload?.title && <h3 className={styles.title}>{payload.title}</h3>}
      </header>

      {payload?.description && <p className={styles.description}>{payload.description}</p>}

      {payload?.details?.length > 0 && (
        <dl className={styles.details}>
          {payload.details.map((row, index) => (
            <div key={`${row.label}-${index}`} className={styles.detailRow}>
              <dt className={styles.detailLabel}>{row.label}</dt>
              <dd className={styles.detailValue}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {requireCheckbox && !decision && (
        <label className={styles.checkboxRow}>
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(!!v)}
          />
          <span>{payload?.checkbox_label ?? 'I understand this action cannot be undone.'}</span>
        </label>
      )}

      {decision ? (
        <>
          <div className={cx(styles.stamp, styles[decision])}>
            {decision === 'confirmed' ? 'Confirmed' : 'Cancelled'}
          </div>
          {decidedAt && <div className={styles.stampMeta}>{formatTime(decidedAt)}</div>}
        </>
      ) : (
        <div className={cx(styles.actions, styles[orientation])}>
          <Button
            className={styles.goBack}
            variant="secondary"
            size="md"
            onClick={() => emit(false)}
          >
            {payload?.cancel_label ?? 'Go back'}
          </Button>
          <Button
            className={styles.confirm}
            variant="primary"
            size="md"
            disabled={!canConfirm}
            onClick={() => emit(true)}
          >
            <span className={styles.confirmInner}>
              {payload?.confirm_label ?? 'Confirm'}
              <ArrowRight size={15} strokeWidth={2.25} />
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}
