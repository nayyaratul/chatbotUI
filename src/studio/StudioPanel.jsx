import cx from 'classnames'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'
import { Controls } from './Controls.jsx'
import { Injector } from './Injector.jsx'

export function StudioPanel({ bot, collapsed, onToggleCollapsed }) {
  return (
    <aside className={cx(styles.panel, collapsed && styles.collapsed)}>
      <button
        type="button"
        className={styles.collapseButton}
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand Studio' : 'Collapse Studio'}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <Injector bot={bot} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <JsonInspector messages={bot.messages} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <Controls bot={bot} />
      </section>
    </aside>
  )
}
