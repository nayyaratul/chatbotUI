import { Smartphone, Monitor } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@nexus/atoms'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './viewportToggle.module.scss'

export function ViewportToggle() {
  const { viewport, setViewport } = useViewport()

  return (
    <ToggleGroup
      type="single"
      value={viewport}
      onValueChange={(v) => { if (v) setViewport(v) }}
      className={styles.toggle}
    >
      <ToggleGroupItem value="mobile" className={styles.item}>
        <Smartphone size={14} />
        Mobile
      </ToggleGroupItem>
      <ToggleGroupItem value="desktop" className={styles.item}>
        <Monitor size={14} />
        Desktop
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
