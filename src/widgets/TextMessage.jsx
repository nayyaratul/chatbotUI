import cx from 'classnames'
import styles from './textMessage.module.scss'

export function TextMessage({ payload, role, streaming = false }) {
  return (
    <div className={cx(styles.bubble, role === 'user' ? styles.user : styles.bot)}>
      {payload?.text ?? ''}
      {streaming && <span className={styles.caret} aria-hidden="true" />}
    </div>
  )
}
