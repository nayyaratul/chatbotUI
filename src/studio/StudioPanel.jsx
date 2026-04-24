import cx from 'classnames'
import {
  ChevronRight,
  ChevronLeft,
  Monitor,
  Zap,
  Braces,
  SlidersHorizontal,
  RotateCcw,
  Palette,
} from 'lucide-react'
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'
import { Controls } from './Controls.jsx'
import { Injector } from './Injector.jsx'
import { BrandPicker } from './BrandPicker.jsx'

const RAIL_SECTIONS = [
  { id: 'viewport',  title: 'Viewport',  icon: Monitor,           color: 'green' },
  { id: 'brand',     title: 'Brand',     icon: Palette,           color: 'brand' },
  { id: 'injector',  title: 'Injector',  icon: Zap,               color: 'amber' },
  { id: 'inspector', title: 'Inspector', icon: Braces,            color: 'blue'  },
  { id: 'controls',  title: 'Controls',  icon: SlidersHorizontal, color: 'slate' },
]

export function StudioPanel({
  bot,
  collapsed,
  onToggleCollapsed,
  brand,
  onBrandChange,
}) {
  return (
    <aside className={cx(styles.panel, collapsed && styles.collapsed)}>
      <div className={styles.header}>
        {!collapsed && (
          <div className={styles.titleBlock}>
            <span className={styles.titleMark} aria-hidden />
            <span className={styles.title}>Studio</span>
            <span className={styles.subtitle}>widget lab</span>
          </div>
        )}
        <div className={styles.headerActions}>
          {!collapsed && (
            <button
              type="button"
              className={styles.iconButton}
              data-variant="destructive"
              onClick={bot.reset}
              aria-label="Reset conversation"
              title="Reset conversation"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand Studio' : 'Collapse Studio'}
          >
            {collapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {collapsed ? (
        <nav className={styles.rail} aria-label="Studio sections">
          {RAIL_SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                type="button"
                className={styles.railItem}
                data-color={s.color}
                onClick={onToggleCollapsed}
                aria-label={`Expand Studio — ${s.title}`}
                title={s.title}
              >
                <Icon size={14} />
                <span className={styles.railBadge} aria-hidden />
              </button>
            )
          })}
        </nav>
      ) : (
        <div className={styles.sections}>
          <section className={styles.section} data-color="green">
            <header className={styles.sectionHeader}>
              <span className={styles.dot} aria-hidden />
              <h2 className={styles.sectionTitle}>Viewport</h2>
            </header>
            <ViewportToggle />
          </section>

          <section className={styles.section} data-color="brand">
            <header className={styles.sectionHeader}>
              <span className={styles.dot} aria-hidden />
              <h2 className={styles.sectionTitle}>Brand</h2>
              {brand?.name && (
                <span className={styles.meta}>{brand.name}</span>
              )}
            </header>
            <BrandPicker active={brand} onSelect={onBrandChange} />
          </section>

          <section className={styles.section} data-color="amber">
            <header className={styles.sectionHeader}>
              <span className={styles.dot} aria-hidden />
              <h2 className={styles.sectionTitle}>Injector</h2>
            </header>
            <Injector bot={bot} />
          </section>

          <section className={styles.section} data-color="blue">
            <header className={styles.sectionHeader}>
              <span className={styles.dot} aria-hidden />
              <h2 className={styles.sectionTitle}>Inspector</h2>
              <span className={styles.count}>{bot.messages.length}</span>
            </header>
            <JsonInspector messages={bot.messages} />
          </section>

          <section className={styles.section} data-color="slate">
            <header className={styles.sectionHeader}>
              <span className={styles.dot} aria-hidden />
              <h2 className={styles.sectionTitle}>Controls</h2>
            </header>
            <Controls bot={bot} />
          </section>
        </div>
      )}
    </aside>
  )
}
