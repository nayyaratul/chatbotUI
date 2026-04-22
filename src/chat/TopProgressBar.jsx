import cx from 'classnames'
import styles from './topProgressBar.module.scss'

/**
 * Reads the most recent bot-sent `progress` widget from `messages`
 * and renders a 32px bar of segments — one per step. Silent when no
 * progress widget has been sent. Intended as persistent chrome under
 * ChatHeader, not as an in-message element.
 *
 * Status → bar colour:
 *   completed → --tpb-complete-color (default: brand/success green)
 *   current   → --tpb-current-color  (default: grey-90 dark)
 *   pending   → --tpb-pending-color  (default: grey-10 light)
 *   failed    → --tpb-failed-color   (default: red-60)
 */
function latestProgressPayload(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'bot' && m.widget?.type === 'progress') {
      return m.widget.payload
    }
  }
  return null
}

function statusLabel(steps) {
  if (!steps?.length) return ''
  const currentIndex = steps.findIndex((s) => s.status === 'current')
  const total = steps.length
  if (currentIndex >= 0) return `Step ${currentIndex + 1} of ${total}`
  const completed = steps.filter((s) => s.status === 'completed').length
  return `${completed} of ${total} complete`
}

export function TopProgressBar({ messages }) {
  const payload = latestProgressPayload(messages)
  const steps = payload?.steps ?? []
  if (steps.length === 0) return null

  return (
    <div
      className={styles.bar}
      role="progressbar"
      aria-label={`Progress — ${statusLabel(steps)}`}
    >
      {steps.map((step) => (
        <span
          key={step.id}
          className={cx(
            styles.segment,
            step.status === 'completed' && styles.completed,
            step.status === 'current' && styles.current,
            step.status === 'failed' && styles.failed,
            step.status === 'pending' && styles.pending,
          )}
        />
      ))}
    </div>
  )
}
