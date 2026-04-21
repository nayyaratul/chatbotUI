import cx from 'classnames'
import {
  ChevronRight,
  ChevronLeft,
  Monitor,
  Zap,
  Braces,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'
import { Controls } from './Controls.jsx'
import { Injector } from './Injector.jsx'

export function StudioPanel({ bot, collapsed, onToggleCollapsed }) {
  return (
    <aside className={cx(styles.panel, collapsed && styles.collapsed)}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          Studio
          <span className={styles.headerBadge}>Widget lab</span>
        </div>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand Studio' : 'Collapse Studio'}
        >
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <div className={styles.utilityStrip}>
        <button
          type="button"
          className={styles.resetButton}
          onClick={bot.reset}
          aria-label="Reset conversation"
        >
          <RotateCcw size={12} />
          Reset conversation
        </button>
      </div>

      <div className={styles.sections}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Monitor size={13} /></span>
            <h2 className={styles.sectionTitle}>Viewport</h2>
          </header>
          <ViewportToggle />
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Zap size={13} /></span>
            <h2 className={styles.sectionTitle}>Injector</h2>
          </header>
          <Injector bot={bot} />
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Braces size={13} /></span>
            <h2 className={styles.sectionTitle}>
              Inspector <span className={styles.headerBadge}>{bot.messages.length}</span>
            </h2>
          </header>
          <JsonInspector messages={bot.messages} />
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><SlidersHorizontal size={13} /></span>
            <h2 className={styles.sectionTitle}>Controls</h2>
          </header>
          <Controls bot={bot} />
        </section>
      </div>
    </aside>
  )
}
