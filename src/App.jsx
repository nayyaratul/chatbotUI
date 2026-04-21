import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'

export function App() {
  return (
    <div className={styles.app}>
      <main className={styles.chatSurface}>
        <div style={{ color: 'var(--grey-50)' }}>— chat pane placeholder —</div>
      </main>
      <div className={styles.studioColumn}>
        <StudioPanel />
      </div>
    </div>
  )
}
