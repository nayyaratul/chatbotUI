import cx from 'classnames'
import { BRAND_PRESETS } from './brandPalette.js'
import styles from './brandPicker.module.scss'

/**
 * Row of brand-preset swatches. Click a swatch → the parent updates
 * the active preset, which gets flattened to CSS custom properties
 * on the app root (via brandToCssVars) so Nexus atoms + our widgets
 * that read --brand-* pick up the new palette instantly.
 */
export function BrandPicker({ active, onSelect }) {
  return (
    <div className={styles.picker}>
      <div className={styles.label}>
        <span>Accent</span>
        <span className={styles.labelName}>{active?.name}</span>
      </div>
      <div className={styles.swatches} role="radiogroup" aria-label="Brand accent colour">
        {BRAND_PRESETS.map((preset) => {
          const isActive = preset.id === active?.id
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={preset.name}
              title={preset.name}
              className={cx(styles.swatch, isActive && styles.active)}
              style={{ background: preset.swatch }}
              onClick={() => onSelect(preset)}
            />
          )
        })}
      </div>
    </div>
  )
}
