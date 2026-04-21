import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'

export function App() {
  return (
    <ViewportProvider>
      <div className={styles.app}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <div style={{ padding: 20, color: 'var(--grey-50)' }}>
              — chat pane placeholder —
            </div>
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel />
        </div>
      </div>
    </ViewportProvider>
  )
}
