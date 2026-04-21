import styles from './fallbackUnknown.module.scss'

export function FallbackUnknown({ type, payload }) {
  return (
    <div className={styles.box}>
      <span className={styles.title}>Unknown widget: {type}</span>
      <pre className={styles.json}>{JSON.stringify(payload, null, 2)}</pre>
    </div>
  )
}
