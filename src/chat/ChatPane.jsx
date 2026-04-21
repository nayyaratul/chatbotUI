import { ChatHeader } from './ChatHeader.jsx'
import styles from './chatPane.module.scss'

export function ChatPane() {
  return (
    <div className={styles.pane}>
      <ChatHeader />
      <div className={styles.body}>
        <div className={styles.placeholder}>
          Say something to start…
        </div>
      </div>
    </div>
  )
}
