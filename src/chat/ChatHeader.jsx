import { Avatar } from '@nexus/atoms'
import styles from './chatHeader.module.scss'

export function ChatHeader() {
  return (
    <header className={styles.header}>
      <Avatar name="AI Lab" size="md" />
      <div className={styles.text}>
        <span className={styles.name}>AI Lab</span>
        <span className={styles.subtitle}>Chatbot playground</span>
      </div>
    </header>
  )
}
