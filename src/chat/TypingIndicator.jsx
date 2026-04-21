import styles from './typingIndicator.module.scss'

export function TypingIndicator() {
  return (
    <div className={styles.row} aria-label="Bot is typing">
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  )
}
