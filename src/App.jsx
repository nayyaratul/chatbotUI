import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'
import { ChatPane } from './chat/ChatPane.jsx'

export function App() {
  return (
    <ViewportProvider>
      <div className={styles.app}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <ChatPane />
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel />
        </div>
      </div>
    </ViewportProvider>
  )
}
