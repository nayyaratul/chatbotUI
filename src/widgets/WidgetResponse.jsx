import styles from './widgetResponse.module.scss'

export function WidgetResponse({ payload }) {
  const label = payload?.data?.label ?? JSON.stringify(payload?.data ?? {})
  const sourceType = payload?.source_type
  return (
    <div className={styles.bubble}>
      {label}
      {sourceType && <span className={styles.caption}>via {sourceType}</span>}
    </div>
  )
}
