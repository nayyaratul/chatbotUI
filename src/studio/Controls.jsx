import { Select, SelectTrigger, SelectContent, SelectItem, Slider } from '@nexus/atoms'
import styles from './controls.module.scss'

export function Controls({
  bot,
  bargeSensitivity = 0.25,
  onBargeSensitivityChange,
  bloomIntensity = 0.8,
  onBloomIntensityChange,
}) {
  const bargePct = Math.round(bargeSensitivity * 100)
  const bloomPct = Math.round(bloomIntensity * 100)
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
          max={10000}
          step={100}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>
          Barge-in sensitivity <span className={styles.valueLabel}>{bargePct}%</span>
        </span>
        <Slider
          value={[bargePct]}
          onValueChange={([v]) => onBargeSensitivityChange?.(v / 100)}
          min={0}
          max={100}
          step={5}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>
          Bloom intensity <span className={styles.valueLabel}>{bloomPct}%</span>
        </span>
        <Slider
          value={[bloomPct]}
          onValueChange={([v]) => onBloomIntensityChange?.(v / 100)}
          min={0}
          max={100}
          step={5}
        />
      </div>
    </div>
  )
}
