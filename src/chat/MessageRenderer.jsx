import cx from 'classnames'
import { registry } from './registry.js'
import { FallbackUnknown } from './FallbackUnknown.jsx'
import styles from './messageRenderer.module.scss'

export function MessageRenderer({ message }) {
  const { role, widget } = message
  const Component = registry[widget.type]

  const rendered = Component ? (
    <Component payload={widget.payload} role={role} />
  ) : (
    <FallbackUnknown type={widget.type} payload={widget.payload} />
  )

  /* Bot-side widgets (cards, previews) flow through a width-capped
     slot so aspect-ratio-driven content stays at phone-card
     proportions on desktop. User-side messages (natural-width
     bubbles — text, tap responses) skip the slot entirely so the
     row's justify-content: flex-end can right-align them the same
     way it did before the wrapper existed. */
  return (
    <div className={cx(styles.row, styles[role])}>
      {role === 'bot' ? (
        <div className={styles.widgetSlot}>{rendered}</div>
      ) : (
        rendered
      )}
    </div>
  )
}
