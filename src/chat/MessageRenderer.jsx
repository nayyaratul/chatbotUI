import cx from 'classnames'
import { registry } from './registry.js'
import { FallbackUnknown } from './FallbackUnknown.jsx'
import styles from './messageRenderer.module.scss'

export function MessageRenderer({ message }) {
  const { role, widget } = message
  const Component = registry[widget.type]

  return (
    <div className={cx(styles.row, styles[role])}>
      {Component ? (
        <Component payload={widget.payload} role={role} />
      ) : (
        <FallbackUnknown type={widget.type} payload={widget.payload} />
      )}
    </div>
  )
}
