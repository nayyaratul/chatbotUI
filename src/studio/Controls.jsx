import { Button, Select, SelectTrigger, SelectContent, SelectItem, Slider } from '@nexus/atoms'
import styles from './controls.module.scss'

export function Controls({ bot }) {
  return (
    <div className={styles.controls}>
      <div className={styles.row}>
        <span className={styles.label}>Bot typing</span>
        <Select value={bot.typingOverride} onValueChange={bot.setTypingOverride}>
          <SelectTrigger size="sm" placeholder="Auto" />
          <SelectContent>
            <SelectItem value="auto">Auto (engine)</SelectItem>
            <SelectItem value="on">Force on</SelectItem>
            <SelectItem value="off">Force off</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>
          Bot reply latency <span className={styles.valueLabel}>{bot.latencyMs}ms</span>
        </span>
        <Slider
          value={[bot.latencyMs]}
          onValueChange={([v]) => bot.setLatencyMs(v)}
          min={0}
          max={3000}
          step={100}
        />
      </div>

      <div className={styles.row}>
        <Button variant="secondary" size="sm" onClick={bot.reset}>
          Reset conversation
        </Button>
      </div>
    </div>
  )
}
