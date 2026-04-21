import { useState } from 'react'
import cx from 'classnames'
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'
import { ChatPane } from './chat/ChatPane.jsx'
import { useBot } from './engine/useBot.js'

export function App() {
  const bot = useBot()
  const [studioCollapsed, setStudioCollapsed] = useState(false)

  return (
    <ViewportProvider>
      <div className={cx(styles.app, studioCollapsed && styles.studioCollapsed)}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <ChatPane bot={bot} />
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel
            bot={bot}
            collapsed={studioCollapsed}
            onToggleCollapsed={() => setStudioCollapsed((c) => !c)}
          />
        </div>
      </div>
    </ViewportProvider>
  )
}
