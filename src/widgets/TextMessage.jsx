import cx from 'classnames'
import styles from './textMessage.module.scss'

export function TextMessage({ payload, role }) {
  return (
    <div className={cx(styles.bubble, role === 'user' ? styles.user : styles.bot)}>
      {payload?.text ?? ''}
    </div>
  )
}
