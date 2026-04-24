import cx from 'classnames'
import styles from './variantRow.module.scss'

/**
 * Flat radiogroup of variant chips. Returns null when there is
 * nothing meaningful to pick (0 or 1 variant).
 *
 * `variants` shape: [{ id: string, label: string }]
 */
export function VariantRow({ variants, selected, onSelect }) {
  if (!variants || variants.length < 2) return null

  return (
    <div
      role="radiogroup"
      aria-label="Variant"
      className={styles.row}
    >
      {variants.map((v) => {
        const active = v.id === selected
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={cx(styles.chip, active && styles.active)}
            onClick={() => onSelect(v.id)}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
