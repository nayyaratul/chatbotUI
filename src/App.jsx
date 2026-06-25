import { useMemo, useState } from 'react'
import cx from 'classnames'
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'
import { ChatPane } from './chat/ChatPane.jsx'
import { useBot } from './engine/useBot.js'
import { BRAND_PRESETS, brandToCssVars } from './studio/brandPalette.js'

export function App() {
  const bot = useBot()
  const [studioCollapsed, setStudioCollapsed] = useState(false)
  const [brand, setBrand] = useState(BRAND_PRESETS[0])
  /* Voice barge-in sensitivity (0..1), tuned live from the Studio. */
  const [bargeSensitivity, setBargeSensitivity] = useState(0.5)
  /* Bottom-bloom intensity (0..1 → opacity), tuned live from the Studio. */
  const [bloomIntensity, setBloomIntensity] = useState(0.8)

  const brandStyle = useMemo(() => brandToCssVars(brand), [brand])

  return (
    <ViewportProvider>
      <div
        className={cx(styles.app, studioCollapsed && styles.studioCollapsed)}
        style={brandStyle}
      >
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <ChatPane bot={bot} bargeSensitivity={bargeSensitivity} bloomIntensity={bloomIntensity} />
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel
            bot={bot}
            collapsed={studioCollapsed}
            onToggleCollapsed={() => setStudioCollapsed((c) => !c)}
            brand={brand}
            onBrandChange={setBrand}
            bargeSensitivity={bargeSensitivity}
            onBargeSensitivityChange={setBargeSensitivity}
            bloomIntensity={bloomIntensity}
            onBloomIntensityChange={setBloomIntensity}
          />
        </div>
      </div>
    </ViewportProvider>
  )
}
