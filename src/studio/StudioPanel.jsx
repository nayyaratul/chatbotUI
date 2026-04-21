import styles from './studioPanel.module.scss'

export function StudioPanel() {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
    </aside>
  )
}
