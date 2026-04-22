import { useState } from 'react'
import cx from 'classnames'
import { Button, Checkbox } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './confirmationCard.module.scss'

export function ConfirmationCard({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [acknowledged, setAcknowledged] = useState(false)
  const [decision, setDecision] = useState(null) // 'confirmed' | 'cancelled' | null

  const requireCheckbox = !!payload?.require_checkbox
  const canConfirm = !requireCheckbox || acknowledged

  const emit = (confirmed) => {
    if (decision) return
    setDecision(confirmed ? 'confirmed' : 'cancelled')
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'confirmation',
        source_widget_id: payload?.widget_id,
        data: {
          label: confirmed
            ? (payload?.confirm_label ?? 'Confirm')
            : (payload?.cancel_label ?? 'Cancel'),
          action_id: payload?.action_id,
          confirmed,
          timestamp: Date.now(),
        },
      },
    })
  }

  const orientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

  return (
    <div className={styles.card}>
      {payload?.title && <h3 className={styles.title}>{payload.title}</h3>}
      {payload?.description && <p className={styles.description}>{payload.description}</p>}
      {payload?.details?.length > 0 && (
        <dl className={styles.details}>
          {payload.details.map((row) => (
            <div key={row.label} className={styles.detailRow}>
              <dt className={styles.detailLabel}>{row.label}</dt>
              <dd className={styles.detailValue}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {requireCheckbox && (
        <label className={styles.checkboxRow}>
          <Checkbox
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            disabled={!!decision}
          />
          <span>{payload?.checkbox_label ?? 'I understand this action cannot be undone.'}</span>
        </label>
      )}
      {decision ? (
        <div className={styles.submitted}>
          {decision === 'confirmed' ? 'Confirmed.' : 'Cancelled.'}
        </div>
      ) : (
        <div className={cx(styles.actions, styles[orientation])}>
          <Button
            className={styles.actionButton}
            variant="secondary"
            size="md"
            onClick={() => emit(false)}
          >
            {payload?.cancel_label ?? 'Go Back'}
          </Button>
          <Button
            className={styles.actionButton}
            variant="primary"
            size="md"
            disabled={!canConfirm}
            onClick={() => emit(true)}
          >
            {payload?.confirm_label ?? 'Confirm'}
          </Button>
        </div>
      )}
    </div>
  )
}
