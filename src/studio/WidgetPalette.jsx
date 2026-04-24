import cx from 'classnames'
import styles from './widgetPalette.module.scss'

/**
 * Grouped radiogroup of widget-type chips. Pure component — parent
 * owns selection state and passes it in as `selected`.
 *
 * `groups` shape:
 *   [{ category: 'action', label: 'Action & Interaction',
 *      widgets: [{ type: 'quick_reply', label: 'Quick Reply Buttons' }, ...] }]
 */
export function WidgetPalette({ groups, selected, onSelect }) {
  return (
    <div className={styles.palette}>
      {groups.map((group) => (
        <section key={group.category} className={styles.group}>
          <h3 className={styles.groupLabel}>{group.label}</h3>
          <div
            role="radiogroup"
            aria-label={`${group.label} widgets`}
            className={styles.row}
          >
            {group.widgets.map((w) => {
              const active = w.type === selected
              return (
                <button
                  key={w.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cx(styles.chip, active && styles.active)}
                  onClick={() => onSelect(w.type)}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
